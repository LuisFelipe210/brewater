import { fmt } from './format'
import { Chemistry, TDS_SOURCE, type WaterProfile } from './profile'

export type Status = 'MUITO_BAIXO' | 'BAIXO' | 'IDEAL' | 'ALTO' | 'MUITO_ALTO'

export const STATUS_LABEL: Record<Status, string> = {
  MUITO_BAIXO: 'Baixo demais',
  BAIXO: 'Um pouco baixo',
  IDEAL: 'Ideal',
  ALTO: 'Um pouco alto',
  MUITO_ALTO: 'Alto demais',
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

/**
 * Faixa de um parâmetro: nota 1 dentro do ideal, cai para 0,6 até a borda do aceitável
 * e chega a 0 em zeroMin / zeroMax.
 */
export class Faixa {
  constructor(
    readonly zeroMin: number,
    readonly okMin: number,
    readonly idealMin: number,
    readonly idealMax: number,
    readonly okMax: number,
    readonly zeroMax: number,
  ) {}

  score(v: number): number {
    if (v < this.okMin) return 0.6 * clamp((v - this.zeroMin) / (this.okMin - this.zeroMin), 0, 1)
    if (v < this.idealMin) return 0.6 + (0.4 * (v - this.okMin)) / (this.idealMin - this.okMin)
    if (v <= this.idealMax) return 1
    if (v <= this.okMax) return 1 - (0.4 * (v - this.idealMax)) / (this.okMax - this.idealMax)
    return 0.6 * clamp((this.zeroMax - v) / (this.zeroMax - this.okMax), 0, 1)
  }

  status(v: number): Status {
    if (v < this.okMin) return 'MUITO_BAIXO'
    if (v < this.idealMin) return 'BAIXO'
    if (v <= this.idealMax) return 'IDEAL'
    if (v <= this.okMax) return 'ALTO'
    return 'MUITO_ALTO'
  }

  /** Parâmetros em que só existe limite superior (sódio, cloreto, sulfato). */
  get somenteMaximo() {
    return this.idealMin <= 0
  }
}

export interface Param {
  key: string
  title: string
  unit: string
  weight: number
  faixa: Faixa
  mensagens: Partial<Record<Status, string>>
}

/**
 * Faixas baseadas no padrão de água da SCA (Specialty Coffee Association) — TDS alvo 150 mg/L
 * (75–250), alcalinidade perto de 40 mg/L CaCO₃, pH 6,5–7,5, sódio ~10 mg/L — e no SCA Water
 * Chart para a dureza total.
 */
export const PARAMS = {
  ALCALINIDADE: {
    key: 'ALCALINIDADE', title: 'Alcalinidade (KH)', unit: 'mg/L CaCO₃', weight: 30,
    faixa: new Faixa(0, 20, 30, 60, 80, 160),
    mensagens: {
      MUITO_BAIXO: 'Quase sem tampão: o café tende a ficar ácido demais, agressivo e desequilibrado.',
      BAIXO: 'Um pouco abaixo do ideal: acidez mais viva; pode passar do ponto em cafés já muito ácidos.',
      IDEAL: 'Tamponamento equilibrado: preserva a acidez sem deixá-la agressiva.',
      ALTO: 'Um pouco acima: começa a neutralizar a acidez e o café fica mais plano.',
      MUITO_ALTO: 'Excesso de bicarbonato: “mata” a acidez e as notas frutadas; café chato e terroso.',
    },
  },
  DUREZA: {
    key: 'DUREZA', title: 'Dureza total (GH)', unit: 'mg/L CaCO₃', weight: 30,
    faixa: new Faixa(0, 25, 50, 110, 175, 300),
    mensagens: {
      MUITO_BAIXO: 'Poucos minerais (cálcio e magnésio) para extrair: café ralo, sem corpo, sub-extraído.',
      BAIXO: 'Dureza baixa: extração um pouco mais fraca; funciona melhor com torras mais escuras.',
      IDEAL: 'Boa quantidade de cálcio e magnésio para extrair doçura e corpo.',
      ALTO: 'Dureza um pouco alta: mais corpo, mas pode trazer amargor e calcário em máquinas.',
      MUITO_ALTO: 'Dureza excessiva: sobre-extração, sabor pesado e muito calcário em máquinas de espresso.',
    },
  },
  TDS: {
    key: 'TDS', title: 'Sólidos dissolvidos (TDS)', unit: 'mg/L', weight: 15,
    faixa: new Faixa(10, 75, 100, 200, 250, 500),
    mensagens: {
      MUITO_BAIXO: 'Água muito “vazia”: extração fraca e café sem estrutura.',
      BAIXO: 'Um pouco abaixo do alvo de 150 mg/L da SCA.',
      IDEAL: 'Dentro da faixa recomendada pela SCA (alvo 150 mg/L).',
      ALTO: 'Um pouco alto: os sabores podem ficar menos limpos.',
      MUITO_ALTO: 'Água muito mineralizada: sabores turvos que mascaram notas delicadas.',
    },
  },
  SODIO: {
    key: 'SODIO', title: 'Sódio', unit: 'mg/L', weight: 10,
    faixa: new Faixa(0, 0, 0, 10, 30, 100),
    mensagens: {
      IDEAL: 'Sódio baixo, sem interferência no sabor.',
      ALTO: 'Acima de 10 mg/L: pode reduzir a percepção de doçura.',
      MUITO_ALTO: 'Sódio alto: gosto salgado ou “ensaboado” no café.',
    },
  },
  PH: {
    key: 'PH', title: 'pH', unit: '', weight: 5,
    faixa: new Faixa(4, 6, 6.5, 7.5, 8.5, 10),
    mensagens: {
      MUITO_BAIXO: 'pH bem ácido. Em água engarrafada pesa menos que a alcalinidade, mas indica pouca proteção contra acidez.',
      BAIXO: 'Levemente ácido; a alcalinidade importa mais que o pH.',
      IDEAL: 'Neutro, como recomenda a SCA (6,5–7,5).',
      ALTO: 'Levemente alcalino.',
      MUITO_ALTO: 'Muito alcalino: tende a achatar a acidez do café.',
    },
  },
  SULFATO: {
    key: 'SULFATO', title: 'Sulfato', unit: 'mg/L', weight: 5,
    faixa: new Faixa(0, 0, 0, 50, 150, 400),
    mensagens: {
      IDEAL: 'Sulfato baixo.',
      ALTO: 'Sulfato moderado: pode trazer leve secura no final.',
      MUITO_ALTO: 'Sulfato alto: secura e amargor no final.',
    },
  },
  CLORETO: {
    key: 'CLORETO', title: 'Cloreto', unit: 'mg/L', weight: 5,
    faixa: new Faixa(0, 0, 0, 30, 100, 300),
    mensagens: {
      IDEAL: 'Cloreto baixo.',
      ALTO: 'Cloreto moderado: atenção à corrosão em caldeiras de espresso.',
      MUITO_ALTO: 'Cloreto alto: gosto salgado e corrosão em caldeiras.',
    },
  },
} satisfies Record<string, Param>

export const PARAM_LIST: Param[] = Object.values(PARAMS)

export const message = (p: Param, s: Status) => p.mensagens[s] ?? p.mensagens.IDEAL!

export function faixaTexto(p: Param) {
  const f = p.faixa
  return f.somenteMaximo ? `ideal até ${fmt(f.idealMax)}` : `ideal ${fmt(f.idealMin)}–${fmt(f.idealMax)}`
}

export function aceitavelTexto(p: Param) {
  const f = p.faixa
  return f.somenteMaximo ? `aceitável até ${fmt(f.okMax)}` : `aceitável ${fmt(f.okMin)}–${fmt(f.okMax)}`
}

export interface ParamResult {
  param: Param
  value: number
  status: Status
  score: number
}

export type Verdict = 'EXCELENTE' | 'BOA' | 'REGULAR' | 'RUIM' | 'INSUFICIENTE'

export const VERDICTS: Record<Verdict, { title: string; description: string }> = {
  EXCELENTE: { title: 'Excelente para café especial', description: 'Mineralização equilibrada para extrair doçura, corpo e uma acidez limpa.' },
  BOA: { title: 'Boa para café especial', description: 'Funciona bem, com pequenos desvios do ideal.' },
  REGULAR: { title: 'Regular', description: 'Dá para usar, mas vai interferir no sabor. Veja como melhorar abaixo.' },
  RUIM: { title: 'Não recomendada', description: 'Muito fora dos parâmetros para café especial.' },
  INSUFICIENTE: {
    title: 'Faltam dados',
    description: 'Preciso de cálcio e magnésio (dureza) e de bicarbonato (alcalinidade), ou de GH e KH medidos.',
  },
}

export interface Evaluation {
  score: number | null
  verdict: Verdict
  results: ParamResult[]
  notes: string[]
  profile: WaterProfile
}

/** Sem dureza ou alcalinidade dentro do aceitável a nota não passa de "Regular". */
const TETO_CRITICO = 69

function valores(p: WaterProfile): [Param, number][] {
  const out: [Param, number][] = []
  if (p.kh != null) out.push([PARAMS.ALCALINIDADE, p.kh])
  if (p.gh != null) out.push([PARAMS.DUREZA, p.gh])
  if (p.tds != null) out.push([PARAMS.TDS, p.tds])
  if (p.sodio != null) out.push([PARAMS.SODIO, p.sodio])
  if (p.ph != null) out.push([PARAMS.PH, p.ph])
  if (p.sulfato != null) out.push([PARAMS.SULFATO, p.sulfato])
  if (p.cloreto != null) out.push([PARAMS.CLORETO, p.cloreto])
  return out
}

/** Nota de 0 a 100, ou null se faltar dureza ou alcalinidade. */
export function rawScore(p: WaterProfile): number | null {
  if (p.gh == null || p.kh == null) return null
  const vals = valores(p)
  const total = vals.reduce((s, [param]) => s + param.weight, 0)
  let score = (vals.reduce((s, [param, v]) => s + param.weight * param.faixa.score(v), 0) / total) * 100
  const critico = vals.some(([param, v]) => {
    if (param !== PARAMS.ALCALINIDADE && param !== PARAMS.DUREZA) return false
    const s = param.faixa.status(v)
    return s === 'MUITO_BAIXO' || s === 'MUITO_ALTO'
  })
  if (critico) score = Math.min(score, TETO_CRITICO)
  return score
}

function observacoes(p: WaterProfile): string[] {
  const out: string[] = []
  const ca = p.calcio
  const mg = p.magnesio
  if (ca != null && mg != null && ca + mg > 0) {
    const caH = ca * Chemistry.CA_CACO3
    const mgH = mg * Chemistry.MG_CACO3
    if (mgH > caH * 1.2) out.push('Rica em magnésio: costuma realçar doçura e notas frutadas.')
    else if (caH > mgH * 2) out.push('Predomínio de cálcio: tende a dar mais corpo e textura do que brilho.')
    else out.push('Cálcio e magnésio equilibrados.')
  }
  if ((p.gh ?? 0) >= 120) {
    out.push('Em máquinas de espresso, dureza acima de ~120 mg/L favorece calcário; prefira usar diluída.')
  }
  if ((p.cloreto ?? 0) >= 30) {
    out.push('Cloreto acima de 30 mg/L aumenta o risco de corrosão em caldeiras de espresso.')
  }
  if (p.tdsSource === 'CONDUTIVIDADE' || p.tdsSource === 'IONS') out.push(`TDS ${TDS_SOURCE[p.tdsSource]}.`)
  return out
}

/** Math.round arredonda -0,5 para cima; aqui só há notas positivas, então equivale ao roundToInt. */
export const round = (v: number) => Math.round(v)

export function evaluate(p: WaterProfile): Evaluation {
  const results = valores(p).map(([param, value]) => ({
    param, value, status: param.faixa.status(value), score: param.faixa.score(value),
  }))
  const notes = [...p.avisos, ...observacoes(p)]
  const score = rawScore(p)
  if (score == null) return { score: null, verdict: 'INSUFICIENTE', results, notes, profile: p }
  const nota = round(score)
  const verdict: Verdict = nota >= 85 ? 'EXCELENTE' : nota >= 70 ? 'BOA' : nota >= 50 ? 'REGULAR' : 'RUIM'
  return { score: nota, verdict, results, notes, profile: p }
}
