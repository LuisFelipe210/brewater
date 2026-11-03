import type { Field, Values } from '../model'

export interface OcrWord { text: string; left: number; top: number; right: number; bottom: number }

export interface OcrLine {
  text: string
  left: number
  top: number
  right: number
  bottom: number
  words?: OcrWord[]
}

export interface ParsedLabel { values: Values; source: string | null }

/*
 * Lê o texto reconhecido de um rótulo de água mineral brasileira e extrai a composição.
 *
 * O OCR agrupa as linhas de forma imprevisível (em garrafa curva, "Sódio" pode sair numa linha
 * e "6,652 Nitrato" em outra), então cada nome é ligado ao número mais próximo pela posição na
 * foto: primeiro na mesma linha, depois na mesma altura à direita e, por fim, logo abaixo
 * (tabela com os nomes em cima). Mesma lógica do app Android.
 */

const outros = [
  'estroncio', 'bario', 'litio', 'silica', 'vanadio', 'ferro', 'zinco', 'aluminio', 'boro',
  'manganes', 'cobre', 'cromo', 'selenio', 'iodeto', 'brometo', 'fosfato', 'nitrito', 'borato',
  'cobalto', 'arsenio', 'temperatura', 'radioatividade',
]

const exatos: [Field | null, RegExp][] = [
  ['BICARBONATO', /bicarbonato|hidrogenocarbonato|\bhco\s?3/gu],
  ['CARBONATO', /(?<!bi)(?<!hidrogeno)carbonato/gu],
  ['CALCIO', /\bcalc[i1l]o\b/gu],
  ['MAGNESIO', /\b(?:m|rn)agnes[i1l]o\b/gu],
  ['SODIO', /\bsod[i1l]o\b/gu],
  ['POTASSIO', /\bpotass[i1l]o\b/gu],
  ['SULFATO', /\bsulfato/gu],
  ['CLORETO', /\bcloreto/gu],
  ['NITRATO', /\bnitrato/gu],
  ['FLUORETO', /\bfluoreto/gu],
  ['PH', /\bph\b/gu],
  ['CONDUTIVIDADE', /condutividade|condutancia/gu],
  ['RESIDUO', /residuo|solidos\s+(?:totais\s+)?dissolvidos/gu],
  // Itens que não usamos, mas que marcam onde termina o valor do item anterior.
  [null, new RegExp(`\\b(?:${outros.join('|')})\\b`, 'gu')],
]

/** Nomes aceitos com erro de OCR ("Sufato", "Macnésio"). */
const aproximados: [Field | null, string][] = [
  ['BICARBONATO', 'bicarbonato'], ['CARBONATO', 'carbonato'], ['CALCIO', 'calcio'],
  ['MAGNESIO', 'magnesio'], ['SODIO', 'sodio'], ['POTASSIO', 'potassio'],
  ['SULFATO', 'sulfato'], ['CLORETO', 'cloreto'], ['NITRATO', 'nitrato'],
  ['FLUORETO', 'fluoreto'], ['CONDUTIVIDADE', 'condutividade'], ['RESIDUO', 'residuo'],
  ...outros.filter((o) => o.length >= 5).map((o): [null, string] => [null, o]),
]

const palavra = /\p{L}{5,}/gu

/** Não começa colado numa letra (HCO3, SO4) nem em "letra + vírgula" (O,956 antes da correção). */
const numero = /(?<![\p{L}\d])(?<![\p{L}\d][.,])\d+(?:[.,]\d+)?/gu

/** "1,52 x 10²", "1,52 x 10^2", "1,52x10-1" */
const notacaoCientifica = /^\s*[x×]\s*10\s*\^?\s*([-⁻]?)\s*([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+)/u

/** "25°C", "25 ºC", "25oC", "180 C" e o "a 25" que sobra quando o OCR perde o "°C". */
const temperatura = /\d+(?:[.,]\d+)?\s*(?:[°º˚]\s*c?|o?\s*c\b)|\ba\s+(?:20|25|180)\b(?!\s*[.,]\d)/gu

/** "O,956" → "0,956", "l,225" → "1,225" */
const letraNoNumero = /(?<![\p{L}\d])[oli|](?=[.,]\d)/gu

const unidades = /mg\s*\/\s*l|[uµ]s\s*\/\s*cm|ppm/gu

const superscritos: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}

/** Trecho de uma linha (nome ou número) com a posição dele na foto. */
interface Peca {
  linha: number
  inicio: number
  fim: number
  left: number
  right: number
  top: number
  bottom: number
  field?: Field | null
  valor?: number
}

const cx = (p: Peca) => (p.left + p.right) / 2
const cy = (p: Peca) => (p.top + p.bottom) / 2
const h = (p: Peca) => Math.max(p.bottom - p.top, 1)
const ordem = (p: Peca) => p.linha * 100_000 + p.inicio
const mesmaAltura = (a: Peca, b: Peca) => Math.abs(cy(b) - cy(a)) <= 0.6 * Math.max(h(a), h(b))

interface Linha { src: OcrLine; texto: string; chaves: Peca[]; numeros: Peca[]; soNumeros: boolean }

interface Candidato { field: Field; value: number; prioridade: number; ordem: number }

/** Minúsculas e sem acento, mantendo o mesmo comprimento (as posições continuam batendo). */
export function normalize(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const base = c.normalize('NFD')[0] ?? c
    const lower = base.toLowerCase()
    out += lower.length === 1 ? lower : base
  }
  return out
}

const espacos = (m: string) => ' '.repeat(m.length)

export function parse(lines: OcrLine[]): ParsedLabel {
  const linhas = lines.map((l, i) => preparar(i, l))
  const chaves = linhas.flatMap((l) => l.chaves)
  const numeros = linhas.flatMap((l) => l.numeros)

  const candidatos: Candidato[] = []
  for (const k of chaves) {
    const field = k.field
    if (!field) continue
    const estrategias = [
      () => naMesmaLinha(k, linhas[k.linha]),
      () => naMesmaAltura(k, chaves, numeros),
      () => logoAbaixo(k, linhas, numeros),
    ]
    for (let prioridade = 0; prioridade < estrategias.length; prioridade++) {
      const v = estrategias[prioridade]()?.valor
      if (v == null) continue
      if (plausivel(field, v)) {
        candidatos.push({ field, value: v, prioridade, ordem: ordem(k) })
        break
      }
    }
  }

  const values: Values = {}
  const melhor = new Map<Field, Candidato>()
  for (const c of candidatos) {
    const m = melhor.get(c.field)
    if (!m || c.prioridade < m.prioridade || (c.prioridade === m.prioridade && c.ordem < m.ordem)) melhor.set(c.field, c)
  }
  for (const [f, c] of melhor) values[f] = c.value

  return { values, source: adivinharFonte(lines) }
}

function preparar(i: number, l: OcrLine): Linha {
  const original = l.text.normalize('NFC')
  let texto = normalize(original)
  texto = texto.replace(temperatura, espacos)
  texto = texto.replace(letraNoNumero, (m) => (m === 'o' ? '0' : '1'))

  const geo = geometria(l, original)

  const chaves: Peca[] = []
  for (const [f, re] of exatos) {
    for (const m of texto.matchAll(re)) chaves.push(geo(i, m.index!, m.index! + m[0].length, f))
  }
  for (const m of texto.matchAll(palavra)) {
    const a = m.index!
    const b = a + m[0].length
    if (chaves.some((c) => c.inicio < b && a < c.fim)) continue
    const ap = aproximado(m[0])
    if (ap) chaves.push(geo(i, a, b, ap[0]))
  }
  // Mesmo nome duas vezes na linha ("Bicarbonato (HCO3-)"): fica o primeiro.
  const ordenadas = [...chaves].sort((a, b) => a.inicio - b.inicio)
  const unicas = ordenadas.filter((c, idx) => c.field == null || ordenadas.slice(0, idx).every((o) => o.field !== c.field))

  const numeros: Peca[] = []
  numero.lastIndex = 0
  let de = 0
  for (;;) {
    numero.lastIndex = de
    const m = numero.exec(texto)
    if (!m) break
    let fim = m.index + m[0].length
    let v = numeroDe(m[0])
    const sci = notacaoCientifica.exec(texto.substring(fim))
    if (sci) {
      let digitos = [...sci[2]].map((c) => superscritos[c] ?? c).join('')
      if (digitos.length >= 2 && Number(digitos) > 9) digitos = digitos.slice(-1) // "10²" lido como "102"
      const exp = Number(digitos) * (sci[1] ? -1 : 1)
      if (v != null) v = v * 10 ** exp
      fim += sci[0].length
    }
    if (v != null) numeros.push(geo(i, m.index, fim, undefined, v))
    de = fim
  }

  const semNumeros = texto.replace(numero, ' ').replace(unidades, ' ')
  const soNumeros = numeros.length > 0 && !/\p{L}{2,}/u.test(semNumeros)
  return { src: l, texto, chaves: unicas, numeros, soNumeros }
}

/** "0477": o OCR perdeu a vírgula de "0,477". */
function numeroDe(s: string): number | null {
  const t = s.length >= 2 && s[0] === '0' && /^\d+$/.test(s) ? '0.' + s.substring(1) : s.replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function aproximado(w: string): [Field | null, string] | null {
  const dist = aproximados
    .map((a) => [a, levenshtein(w, a[1])] as const)
    .filter(([a, d]) => d <= (a[1].length >= 9 ? 2 : 1))
  if (dist.length === 0) return null
  const menor = Math.min(...dist.map((d) => d[1]))
  const melhores = dist.filter((d) => d[1] === menor)
  return melhores.length === 1 ? melhores[0][0] : null
}

// --- estratégias ---

/** "Cálcio ...... 8,345" ou "Sulfato 0,85 Cloreto 1,30": até o próximo nome da linha. */
function naMesmaLinha(k: Peca, l: Linha): Peca | undefined {
  const depois = l.chaves.filter((c) => c.inicio > k.inicio).map((c) => c.inicio)
  const proxima = depois.length ? Math.min(...depois) : Infinity
  return minBy(l.numeros.filter((n) => n.inicio >= k.fim && n.inicio < proxima), (n) => n.inicio)
}

/** Valor em outra linha do OCR, na mesma altura e à direita, sem outro nome no caminho. */
function naMesmaAltura(k: Peca, chaves: Peca[], numeros: Peca[]): Peca | undefined {
  const inicio = k.right - 0.5 * h(k)
  return minBy(
    numeros.filter(
      (n) =>
        n.linha !== k.linha && mesmaAltura(k, n) && n.left >= inicio && n.left - k.right <= 10 * h(k) &&
        !chaves.some((c) => c !== k && mesmaAltura(k, c) && c.left >= inicio && c.left < n.left),
    ),
    (n) => n.left - k.right,
  )
}

/** Tabela horizontal: nomes numa linha, valores na linha de baixo, alinhados. */
function logoAbaixo(k: Peca, linhas: Linha[], numeros: Peca[]): Peca | undefined {
  const cands = numeros.filter(
    (n) =>
      n.linha !== k.linha && linhas[n.linha].soNumeros &&
      n.top >= cy(k) && n.top - k.bottom <= 1.5 * h(k) &&
      n.left <= k.right + h(k) && n.right >= k.left - h(k),
  )
  const primeira = minBy(cands, (n) => linhas[n.linha].src.top)
  if (!primeira) return undefined
  return minBy(cands.filter((n) => n.linha === primeira.linha), (n) => Math.abs(cx(n) - cx(k)))
}

function plausivel(f: Field, v: number) {
  switch (f) {
    case 'PH': return v >= 3 && v <= 11
    case 'CONDUTIVIDADE':
    case 'RESIDUO': return v >= 1 && v <= 5000
    case 'NITRATO': return v >= 0 && v <= 50 // limite legal para água mineral
    case 'FLUORETO': return v >= 0 && v <= 5
    default: return v >= 0 && v <= 2000
  }
}

/** "Fonte: Pocinho — Lindóia/SP" ou "FONTE SENHOR DO BONFIM - DIAS D'ÁVILA/BA." */
function adivinharFonte(lines: OcrLine[]): string | null {
  const l = lines.find((x) => normalize(x.text).trimStart().startsWith('fonte'))
  if (!l) return null
  const t = l.text.trim()
  let s: string
  if (t.includes(':')) s = t.substring(t.indexOf(':') + 1)
  else s = t.includes(' ') ? t.substring(t.indexOf(' ') + 1) : ''
  s = s.replace(/(?<=\p{L})0|0(?=\p{L})/gu, 'O') // "D0 BONFIM"
  s = s.trim().replace(/\.+$/, '')
  return s.length >= 3 ? s : null
}

/** Posição (em pixels) de cada caractere da linha, usando as caixas das palavras quando existem. */
function geometria(l: OcrLine, texto: string) {
  const n = Math.max(texto.length, 1)
  const x0 = new Float64Array(n)
  const x1 = new Float64Array(n)
  const top = new Float64Array(n).fill(l.top)
  const bottom = new Float64Array(n).fill(l.bottom)
  const cw = (l.right - l.left) / n
  for (let i = 0; i < n; i++) {
    x0[i] = l.left + i * cw
    x1[i] = x0[i] + cw
  }
  let cursor = 0
  for (const w of l.words ?? []) {
    const wt = w.text.normalize('NFC')
    const idx = texto.indexOf(wt, cursor)
    if (wt.length === 0 || idx < 0) continue
    const wcw = (w.right - w.left) / wt.length
    for (let k = 0; k < wt.length; k++) {
      x0[idx + k] = w.left + k * wcw
      x1[idx + k] = x0[idx + k] + wcw
      top[idx + k] = w.top
      bottom[idx + k] = w.bottom
    }
    cursor = idx + wt.length
  }

  return (linha: number, inicio: number, fim: number, field?: Field | null, valor?: number): Peca => {
    const a = Math.min(Math.max(inicio, 0), n - 1)
    const b = Math.min(Math.max(fim, a + 1), n)
    let le = Infinity, r = -Infinity, t = Infinity, bo = -Infinity
    for (let i = a; i < b; i++) {
      le = Math.min(le, x0[i])
      r = Math.max(r, x1[i])
      t = Math.min(t, top[i])
      bo = Math.max(bo, bottom[i])
    }
    return { linha, inicio, fim, left: le, right: r, top: t, bottom: bo, field, valor }
  }
}

function minBy<T>(xs: T[], f: (x: T) => number): T | undefined {
  let best: T | undefined
  let bv = Infinity
  for (const x of xs) {
    const v = f(x)
    if (v < bv) [best, bv] = [x, v]
  }
  return best
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/**
 * Texto colado (Texto ao Vivo do iPhone): sem posições, então cada linha vira uma faixa
 * horizontal própria e só a busca "na mesma linha" funciona — que é o caso comum.
 */
export function linesFromText(text: string): OcrLine[] {
  return text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, left: 0, top: i * 40, right: t.length * 12, bottom: i * 40 + 30 }))
}

/**
 * Tabela em duas colunas copiada pelo iPhone costuma vir como todos os nomes e depois todos os
 * valores. Quando as contas batem, liga o n-ésimo nome ao n-ésimo valor.
 */
export function parseText(text: string): ParsedLabel {
  const lines = linesFromText(text)
  const r = parse(lines)
  const linhas = lines.map((l, i) => preparar(i, l))
  const nomes = linhas.filter((l) => l.chaves.length === 1 && l.numeros.length === 0).map((l) => l.chaves[0])
  const valores = linhas.filter((l) => l.soNumeros && l.numeros.length === 1).map((l) => l.numeros[0].valor!)
  // Nesses nomes sozinhos na linha, a posição inventada não diz nada: vale a ordem.
  if (nomes.length >= 2 && nomes.length === valores.length) {
    nomes.forEach((k, i) => {
      if (!k.field) return
      if (plausivel(k.field, valores[i])) r.values[k.field] = valores[i]
      else delete r.values[k.field]
    })
  }
  return r
}
