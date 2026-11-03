import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { evaluate, VERDICTS } from '../domain/evaluator'
import { fmt, parseNumber } from '../domain/format'
import { profileFrom } from '../domain/profile'
import { type Field, FIELD_ORDER, FIELDS, type Group, GROUPS, type Values, type WaterLabel } from '../model'
import { readLabel } from '../ocr/ocr'
import { parse, parseText, type ParsedLabel } from '../ocr/parser'
import { getPhoto } from '../store'
import { Camera, Check, Clipboard, Photo, Warning, XMark } from './icons'
import { ActionSheet, Badge, Section, Sheet, useClosing } from './parts'

export interface Saved {
  water: Omit<WaterLabel, 'id' | 'createdAt' | 'photoId'>
  /** undefined = foto não mudou; null = removida */
  photo: Blob | null | undefined
}

type Ocr =
  | { state: 'none' }
  | { state: 'running' }
  | { state: 'done'; found: number; from: 'foto' | 'texto' }
  | { state: 'failed'; message: string }

/** Abaixo disso a leitura provavelmente perdeu parte da tabela. */
const POUCOS = 4

export function Edit(props: {
  original: WaterLabel | null
  photo?: Blob
  paste?: boolean
  onSave: (s: Saved) => void
  onCancel: () => void
}) {
  const o = props.original
  const [closing, close] = useClosing(props.onCancel, 300)
  const [brand, setBrand] = useState(o?.brand ?? '')
  const [source, setSource] = useState(o?.source ?? '')
  const [notes, setNotes] = useState(o?.notes ?? '')
  const [values, setValues] = useState<Partial<Record<Field, string>>>(() =>
    Object.fromEntries(Object.entries(o?.values ?? {}).map(([f, v]) => [f, fmt(v!, 4)])),
  )
  const [fromOcr, setFromOcr] = useState<Set<Field>>(new Set())
  const [photo, setPhoto] = useState<Blob | null>(props.photo ?? null)
  const [photoChanged, setPhotoChanged] = useState(!!props.photo)
  const [ocr, setOcr] = useState<Ocr>({ state: 'none' })
  const [brandError, setBrandError] = useState(false)
  const [pasting, setPasting] = useState(!!props.paste)
  const [askDiscard, setAskDiscard] = useState(false)
  const [dirty, setDirty] = useState(!!props.photo)
  const leitura = useRef(0)
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)

  // Foto já salva desta água
  useEffect(() => {
    if (o?.photoId && !props.photo) getPhoto(o.photoId).then((b) => b && setPhoto(b))
  }, [])

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const parsed: Values = useMemo(() => {
    const v: Values = {}
    for (const [f, s] of Object.entries(values)) {
      const n = parseNumber(s ?? '')
      if (n != null) v[f as Field] = n
    }
    return v
  }, [values])
  const preview = useMemo(() => evaluate(profileFrom(parsed)), [parsed])

  /** Só preenche o que está vazio: não sobrescreve o que a pessoa já digitou. */
  function aplicar(r: ParsedLabel, from: 'foto' | 'texto') {
    const novos = new Set<Field>()
    setValues((atual) => {
      const v = { ...atual }
      for (const [f, n] of Object.entries(r.values) as [Field, number][]) {
        if (!v[f]?.trim()) {
          v[f] = fmt(n, 4)
          novos.add(f)
        }
      }
      return v
    })
    setFromOcr(novos)
    if (r.source) setSource((s) => s || r.source!)
    setOcr({ state: 'done', found: Object.keys(r.values).length, from })
    setDirty(true)
  }

  async function ler(blob: Blob) {
    const minha = ++leitura.current
    setOcr({ state: 'running' })
    try {
      const lines = await readLabel(blob)
      if (minha !== leitura.current) return
      aplicar(parse(lines), 'foto')
    } catch (err) {
      if (minha !== leitura.current) return
      setOcr({ state: 'failed', message: err instanceof Error ? err.message : String(err) })
    }
  }

  useEffect(() => {
    if (props.photo) ler(props.photo)
  }, [])

  function escolher(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    input.value = ''
    if (!f) return
    setPhoto(f)
    setPhotoChanged(true)
    setDirty(true)
    ler(f)
  }

  function removerFoto() {
    leitura.current++
    setPhoto(null)
    setPhotoChanged(true)
    setOcr({ state: 'none' })
    setFromOcr(new Set())
    setDirty(true)
  }

  function salvar() {
    if (!brand.trim()) {
      setBrandError(true)
      return
    }
    props.onSave({
      water: { brand: brand.trim(), source: source.trim(), notes: notes.trim(), values: parsed },
      photo: photoChanged ? photo : undefined,
    })
  }

  const cancelar = () => (dirty ? setAskDiscard(true) : close())
  const campo = (f: Field, s: string) => {
    setValues((v) => ({ ...v, [f]: s }))
    setDirty(true)
    if (fromOcr.has(f)) setFromOcr((x) => new Set([...x].filter((y) => y !== f)))
  }

  const groups: Group[] = ['IONS', 'FISICO', 'MEDIDO']

  return (
    <Sheet
      title={o ? 'Editar água' : 'Nova água'}
      closing={closing}
      left={<button class="bar-btn" onClick={cancelar}>Cancelar</button>}
      right={<button class="bar-btn bold" onClick={salvar}>{o ? 'OK' : 'Salvar'}</button>}
    >
      <input ref={camera} type="file" accept="image/*" capture="environment" class="sr-only" onChange={escolher} />
      <input ref={library} type="file" accept="image/*" class="sr-only" onChange={escolher} />

      <Section
        header="Rótulo"
        footer={
          photo && ocr.state === 'done' && ocr.from === 'foto' && ocr.found < POUCOS
            ? 'Leitura incompleta? Toque e segure na tabela da foto para o iPhone selecionar o texto (Texto ao Vivo), copie e toque em Colar texto.'
            : 'Enquadre só a tabela de composição, reta e bem iluminada.'
        }
      >
        {photoUrl && (
          <div class="label-photo">
            <img src={photoUrl} alt="Foto do rótulo" />
            <button class="remove" aria-label="Remover foto" onClick={removerFoto}><XMark /></button>
          </div>
        )}
        {ocr.state !== 'none' && (
          <div class="cell">
            <OcrStatus ocr={ocr} />
          </div>
        )}
        <div class="cell scan">
          <div class="scan-btns">
            <button class="scan-btn" onClick={() => camera.current?.click()}><Camera />Câmera</button>
            <button class="scan-btn" onClick={() => library.current?.click()}><Photo />Fotos</button>
            <button class="scan-btn" onClick={() => setPasting(true)}><Clipboard />Colar texto</button>
          </div>
        </div>
      </Section>

      <Section header="Identificação">
        <div class={`field wide${brandError ? ' error' : ''}`}>
          <input
            value={brand}
            placeholder={brandError ? 'Dê um nome para salvar' : 'Marca'}
            aria-label="Marca"
            autocapitalize="words"
            onInput={(e) => { setBrand(e.currentTarget.value); setBrandError(false); setDirty(true) }}
          />
        </div>
        <div class="field wide">
          <input
            value={source}
            placeholder="Fonte / origem (opcional)"
            aria-label="Fonte"
            onInput={(e) => { setSource(e.currentTarget.value); setDirty(true) }}
          />
        </div>
      </Section>

      <Section header="Prévia da nota">
        <div class="cell preview">
          <Badge score={preview.score} verdict={preview.verdict} />
          <div class="row-main">
            <div>{VERDICTS[preview.verdict].title}</div>
            {preview.score == null && <div class="small">Preencha cálcio, magnésio e bicarbonato, ou GH e KH.</div>}
          </div>
        </div>
      </Section>

      {groups.map((g) => (
        <Section header={GROUPS[g].title} footer={GROUPS[g].hint} key={g}>
          {FIELD_ORDER.filter((f) => FIELDS[f].group === g).map((f) => (
            <div class={`field${fromOcr.has(f) ? ' ocr' : ''}`} key={f}>
              <label for={`f-${f}`}>
                {FIELDS[f].label}
                {FIELDS[f].unit && <small>{FIELDS[f].unit}</small>}
              </label>
              <input
                id={`f-${f}`}
                inputMode="decimal"
                enterKeyHint="next"
                placeholder="—"
                value={values[f] ?? ''}
                onInput={(e) => campo(f, e.currentTarget.value)}
              />
            </div>
          ))}
        </Section>
      ))}

      <Section header="Anotações">
        <textarea
          class="notes"
          value={notes}
          placeholder="Ex.: ficou ótima no V60 com café lavado"
          onInput={(e) => { setNotes(e.currentTarget.value); setDirty(true) }}
        />
      </Section>

      {pasting && <Paste onUse={(t) => aplicar(parseText(t), 'texto')} onClose={() => setPasting(false)} />}

      {askDiscard && (
        <ActionSheet
          actions={[{ label: 'Descartar alterações', destructive: true, onClick: close }]}
          onClose={() => setAskDiscard(false)}
        />
      )}
    </Sheet>
  )
}

function OcrStatus({ ocr }: { ocr: Ocr }) {
  if (ocr.state === 'running') {
    return (
      <div class="status">
        <div class="spinner" />
        <div>
          Lendo o rótulo…
          <div class="small">Na primeira vez demora um pouco mais.</div>
        </div>
      </div>
    )
  }
  if (ocr.state === 'failed') {
    return <div class="status warn"><Warning /><div>Não consegui ler a foto: {ocr.message}</div></div>
  }
  if (ocr.state === 'done' && ocr.found === 0) {
    return (
      <div class="status warn">
        <Warning />
        <div>
          Não achei valores {ocr.from === 'foto' ? 'na foto' : 'no texto'}.
          <div class="small">Tente uma foto mais próxima e reta da tabela, cole o texto ou digite abaixo.</div>
        </div>
      </div>
    )
  }
  if (ocr.state === 'done') {
    return (
      <div class="status ok">
        <Check />
        <div>
          Encontrei {ocr.found} {ocr.found === 1 ? 'valor' : 'valores'}.
          <div class="small">Os campos em amarelo vieram {ocr.from === 'foto' ? 'da foto' : 'do texto'}: confira com o rótulo.</div>
        </div>
      </div>
    )
  }
  return null
}

/** Texto copiado com o Texto ao Vivo do iPhone (Câmera, Fotos ou a própria foto aqui no app). */
function Paste(props: { onUse: (t: string) => void; onClose: () => void }) {
  const [closing, close] = useClosing(props.onClose, 300)
  const [text, setText] = useState('')
  const [erro, setErro] = useState('')

  async function colar() {
    try {
      setText(await navigator.clipboard.readText())
      setErro('')
    } catch {
      setErro('Não deu para ler a área de transferência. Toque e segure na caixa abaixo e escolha Colar.')
    }
  }

  return (
    <Sheet
      title="Colar texto"
      closing={closing}
      left={<button class="bar-btn" onClick={close}>Cancelar</button>}
      right={
        <button class="bar-btn bold" disabled={!text.trim()} onClick={() => { props.onUse(text); close() }}>
          Usar
        </button>
      }
    >
      <Section header="Copie a tabela com o iPhone">
        <div class="cell">
          <ol class="steps">
            <li>Abra a foto do rótulo no app Fotos (ou aponte a Câmera para a tabela).</li>
            <li>Toque e segure no texto da tabela e escolha <b>Selecionar Tudo</b>, depois <b>Copiar</b>.</li>
            <li>Volte aqui e toque em <b>Colar</b>.</li>
          </ol>
        </div>
        <button class="row action" onClick={colar}>
          <span class="icon" style={{ background: 'var(--tint)' }}><Clipboard /></span>
          <span class="row-main">Colar</span>
        </button>
      </Section>
      <Section header="Texto" footer={erro || 'Pode editar antes de usar. O app procura cada mineral e o número ao lado.'}>
        <textarea
          class="paste-box"
          value={text}
          placeholder={'Cálcio 8,345\nMagnésio 2,10\nBicarbonato 45,20'}
          onInput={(e) => setText(e.currentTarget.value)}
        />
      </Section>
    </Sheet>
  )
}
