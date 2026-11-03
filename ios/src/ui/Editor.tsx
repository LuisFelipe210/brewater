import {
  Actions, ActionsButton, ActionsGroup, ActionsLabel, Block, BlockFooter, BlockTitle, Button, f7, Icon, Link, List,
  ListInput, Navbar, NavLeft, NavRight, NavTitle, Page, Popup, Preloader,
} from 'framework7-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { evaluate, VERDICTS } from '../domain/evaluator'
import { fmt, parseNumber } from '../domain/format'
import { profileFrom } from '../domain/profile'
import { type Field, FIELD_ORDER, FIELDS, type Group, GROUPS, type Values } from '../model'
import { readLabel } from '../ocr/ocr'
import { parse, parseText, type ParsedLabel } from '../ocr/parser'
import { closeEditor, type Editing, save } from '../state'
import { getPhoto } from '../store'
import { Chart } from './Chart'
import { ScoreTile } from './common'
import { Paste } from './Paste'

type Ocr =
  | { state: 'none' }
  | { state: 'running' }
  | { state: 'done'; found: number; from: 'foto' | 'texto' }
  | { state: 'failed'; message: string }

/** Abaixo disso a leitura provavelmente perdeu parte da tabela. */
const POUCOS = 4
const GROUP_LIST: Group[] = ['IONS', 'FISICO', 'MEDIDO']

export function Editor({ editing }: { editing: Editing }) {
  const o = editing.original
  const [opened, setOpened] = useState(true)
  const [brand, setBrand] = useState(o?.brand ?? '')
  const [source, setSource] = useState(o?.source ?? '')
  const [notes, setNotes] = useState(o?.notes ?? '')
  const [values, setValues] = useState<Partial<Record<Field, string>>>(() =>
    Object.fromEntries(Object.entries(o?.values ?? {}).map(([f, v]) => [f, fmt(v!, 4)])),
  )
  const [fromOcr, setFromOcr] = useState<Set<Field>>(new Set())
  const [photo, setPhoto] = useState<Blob | null>(editing.photo ?? null)
  const [photoChanged, setPhotoChanged] = useState(!!editing.photo)
  const [ocr, setOcr] = useState<Ocr>({ state: 'none' })
  const [brandError, setBrandError] = useState(false)
  const [pasting, setPasting] = useState(!!editing.paste)
  const [askDiscard, setAskDiscard] = useState(false)
  const [dirty, setDirty] = useState(!!editing.photo)
  const [saving, setSaving] = useState(false)
  const leitura = useRef(0)
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (o?.photoId && !editing.photo) getPhoto(o.photoId).then((b) => b && setPhoto(b))
    if (editing.photo) ler(editing.photo)
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
      if (minha === leitura.current) aplicar(parse(lines), 'foto')
    } catch (err) {
      if (minha === leitura.current) setOcr({ state: 'failed', message: err instanceof Error ? err.message : String(err) })
    }
  }

  function escolher(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.currentTarget.files?.[0]
    ev.currentTarget.value = ''
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

  async function salvar() {
    if (!brand.trim()) {
      // Diz o que falta, leva até o campo e já deixa o teclado aberto nele
      setBrandError(true)
      const el = document.querySelector<HTMLInputElement>('.editor .brand-list input')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      f7.toast.create({ text: 'Falta o nome da água. Preencha a marca para salvar.', position: 'top', closeTimeout: 3000 }).open()
      return
    }
    setSaving(true)
    try {
      const id = await save(o, {
        water: { brand: brand.trim(), source: source.trim(), notes: notes.trim(), values: parsed },
        photo: photoChanged ? photo : undefined,
      })
      setOpened(false)
      if (!o) f7.views.main.router.navigate(`/agua/${id}/`)
    } catch (err) {
      setSaving(false)
      f7.toast.create({ text: `Não consegui salvar: ${err instanceof Error ? err.message : err}`, closeTimeout: 3500 }).open()
    }
  }

  const cancelar = () => (dirty ? setAskDiscard(true) : setOpened(false))
  const campo = (f: Field, s: string) => {
    setValues((v) => ({ ...v, [f]: s }))
    setDirty(true)
    if (fromOcr.has(f)) setFromOcr((x) => new Set([...x].filter((y) => y !== f)))
  }

  const incompleta = ocr.state === 'done' && ocr.from === 'foto' && ocr.found < POUCOS

  return (
    <Popup
      opened={opened}
      push
      swipeToClose={!dirty}
      onPopupClosed={closeEditor}
      className="editor"
    >
      <Page>
        <Navbar>
          <NavLeft><Link onClick={cancelar}>Cancelar</Link></NavLeft>
          <NavTitle>{o ? 'Editar água' : 'Nova água'}</NavTitle>
          <NavRight><Link className="save" onClick={salvar}>{saving ? <Preloader size={18} /> : 'Salvar'}</Link></NavRight>
        </Navbar>

        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" onChange={escolher} />
        <input ref={library} type="file" accept="image/*" className="sr-only" onChange={escolher} />

        <BlockTitle>Rótulo</BlockTitle>
        <div className="scan">
          {photoUrl && (
            <div className="scan-photo">
              <img src={photoUrl} alt="Foto do rótulo" />
              <button type="button" className="scan-remove" aria-label="Remover foto" onClick={removerFoto}>
                <Icon aria-hidden="true" f7="xmark" />
              </button>
            </div>
          )}
          {ocr.state !== 'none' && <OcrStatus ocr={ocr} />}
          <div className="scan-btns">
            <Button tonal onClick={() => camera.current?.click()}><Icon aria-hidden="true" f7="camera" />Câmera</Button>
            <Button tonal onClick={() => library.current?.click()}><Icon aria-hidden="true" f7="photo" />Fotos</Button>
            <Button tonal onClick={() => setPasting(true)}><Icon aria-hidden="true" f7="doc_on_clipboard" />Colar texto</Button>
          </div>
        </div>
        <BlockFooter>
          {incompleta
            ? 'Leitura incompleta? Toque e segure na tabela da foto para o iPhone selecionar o texto, copie e use Colar texto.'
            : 'Enquadre só a tabela de composição, reta e bem iluminada.'}
        </BlockFooter>

        <BlockTitle>Identificação</BlockTitle>
          <List strong inset dividers className={`brand-list${brandError ? ' has-error' : ''}`}>
            <ListInput
              type="text"
              label="Marca"
              placeholder="Obrigatório, ex.: Serra Clara"
              value={brand}
              autocapitalize="words"
              errorMessage="Dê um nome para a água: é assim que ela aparece na sua lista."
              errorMessageForce={brandError}
              onInput={(ev) => { setBrand(ev.target.value); if (ev.target.value.trim()) setBrandError(false); setDirty(true) }}
            />
            <ListInput
              type="text"
              label="Fonte"
              placeholder="Opcional"
              value={source}
              onInput={(ev) => { setSource(ev.target.value); setDirty(true) }}
            />
          </List>

        <BlockTitle>Prévia da nota</BlockTitle>
        <List strong inset>
          <li className="preview">
            <ScoreTile score={preview.score} verdict={preview.verdict} />
            <div>
              <div className="preview-title">{VERDICTS[preview.verdict].title}</div>
              {preview.score == null && <div className="preview-hint">Preencha cálcio, magnésio e bicarbonato, ou GH e KH.</div>}
            </div>
          </li>
          {preview.profile.gh != null && preview.profile.kh != null && (
            <li className="preview-chart">
              <Chart
                compact
                points={[{ id: 'previa', gh: preview.profile.gh, kh: preview.profile.kh, verdict: preview.verdict }]}
                focus="previa"
                label={`Prévia no gráfico: GH ${fmt(preview.profile.gh, 0)}, KH ${fmt(preview.profile.kh, 0)}`}
              />
            </li>
          )}
        </List>

        {GROUP_LIST.map((g) => (
          <div key={g}>
            <BlockTitle>{GROUPS[g].title}</BlockTitle>
            <List strong inset dividers className="values">
              {FIELD_ORDER.filter((f) => FIELDS[f].group === g).map((f) => (
                <ListInput
                  key={f}
                  type="text"
                  inputmode="decimal"
                  label={FIELDS[f].label}
                  placeholder={FIELDS[f].unit || '—'}
                  value={values[f] ?? ''}
                  className={fromOcr.has(f) ? 'from-ocr' : undefined}
                  onInput={(ev) => campo(f, ev.target.value)}
                />
              ))}
            </List>
            {GROUPS[g].hint && <BlockFooter>{GROUPS[g].hint}</BlockFooter>}
          </div>
        ))}

        <BlockTitle>Anotações</BlockTitle>
        <List strong inset>
          <ListInput
            type="textarea"
            resizable
            placeholder="Ex.: ficou ótima no V60 com café lavado"
            value={notes}
            onInput={(ev) => { setNotes(ev.target.value); setDirty(true) }}
          />
        </List>
        <Block />

        {pasting && <Paste onUse={(t) => aplicar(parseText(t), 'texto')} onClose={() => setPasting(false)} />}

        <Actions opened={askDiscard} onActionsClosed={() => setAskDiscard(false)}>
          <ActionsGroup>
            <ActionsLabel>Você preencheu dados que ainda não foram salvos.</ActionsLabel>
            <ActionsButton color="red" onClick={() => setOpened(false)}>Descartar alterações</ActionsButton>
          </ActionsGroup>
          <ActionsGroup>
            <ActionsButton strong>Continuar editando</ActionsButton>
          </ActionsGroup>
        </Actions>
      </Page>
    </Popup>
  )
}

function OcrStatus({ ocr }: { ocr: Ocr }) {
  if (ocr.state === 'running') {
    return (
      <div className="ocr-status">
        <Preloader size={20} />
        <div>Lendo o rótulo…<small>Na primeira vez demora um pouco mais.</small></div>
      </div>
    )
  }
  if (ocr.state === 'failed') {
    return (
      <div className="ocr-status warn">
        <Icon aria-hidden="true" f7="exclamationmark_triangle_fill" />
        <div>Não consegui ler a foto.<small>{ocr.message}</small></div>
      </div>
    )
  }
  if (ocr.state === 'done' && ocr.found === 0) {
    return (
      <div className="ocr-status warn">
        <Icon aria-hidden="true" f7="exclamationmark_triangle_fill" />
        <div>
          Não achei valores {ocr.from === 'foto' ? 'na foto' : 'no texto'}.
          <small>Tente uma foto mais próxima e reta da tabela, cole o texto ou digite abaixo.</small>
        </div>
      </div>
    )
  }
  if (ocr.state === 'done') {
    return (
      <div className="ocr-status ok">
        <Icon aria-hidden="true" f7="checkmark_circle_fill" />
        <div>
          Encontrei {ocr.found} {ocr.found === 1 ? 'valor' : 'valores'}.
          <small>Os campos marcados vieram {ocr.from === 'foto' ? 'da foto' : 'do texto'}: confira com o rótulo.</small>
        </div>
      </div>
    )
  }
  return null
}
