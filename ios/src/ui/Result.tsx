import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import {
  aceitavelTexto, type Evaluation, faixaTexto, message, PARAM_LIST, type ParamResult, VERDICTS,
} from '../domain/evaluator'
import { fmt } from '../domain/format'
import { melhorDiluicao, melhorMistura, type Mistura, percentual, precisaMineralizar } from '../domain/improvements'
import { TDS_SOURCE } from '../domain/profile'
import { FIELD_ORDER, FIELDS, type WaterLabel } from '../model'
import { getPhoto } from '../store'
import { ChevronRight, Info, Trash } from './icons'
import { ActionSheet, NavBar, Pill, RangeBar, ScoreRing, Section, useScrolled, VERDICT_COLOR } from './parts'

export function Result(props: {
  water: WaterLabel
  eval: Evaluation
  all: WaterLabel[]
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onOpen: (id: string) => void
}) {
  const { water, eval: e } = props
  const ref = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled(ref)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [criterios, setCriterios] = useState(false)
  const photo = usePhotoUrl(water.photoId)

  const diluicao = useMemo(() => melhorDiluicao(e.profile), [e])
  const mistura = useMemo(() => melhorMistura(water, e.profile, props.all), [e, props.all])
  const mineralizar = precisaMineralizar(e.profile) && !mistura
  const campos = FIELD_ORDER.filter((f) => water.values[f] != null)

  return (
    <div ref={ref} style={{ height: '100%', overflowY: 'auto' }}>
      <NavBar
        title={water.brand}
        scrolled={scrolled}
        back={{ label: 'Águas', onClick: props.onBack }}
        right={<button class="bar-btn" onClick={props.onEdit}>Editar</button>}
      />
      <h1 class="large-title">{water.brand}</h1>
      {water.source && <div class="large-sub">{water.source}</div>}

      <Section top={20}>
          <div class="hero">
            <ScoreRing score={e.score} verdict={e.verdict} />
            <h2 style={{ color: e.score == null ? undefined : VERDICT_COLOR[e.verdict] }}>{VERDICTS[e.verdict].title}</h2>
            <p>{VERDICTS[e.verdict].description}</p>
          </div>
      </Section>

      {e.results.length > 0 && (
        <Section header="Parâmetros">
          {e.results.map((r) => <ParamCell r={r} e={e} key={r.param.key} />)}
        </Section>
      )}

      {(diluicao || mistura || mineralizar) && (
        <Section header="Como melhorar">
          {diluicao && <MixCell m={diluicao} brand={water.brand} onOpen={props.onOpen} />}
          {mistura && <MixCell m={mistura} brand={water.brand} onOpen={props.onOpen} />}
          {mineralizar && (
            <div class="cell">
              <div class="mix-title">Falta mineral</div>
              <div class="param-msg" style={{ marginTop: 4 }}>
                Diluir não resolve: ela já é leve demais. Misture com uma água mais mineralizada (cadastre outras
                marcas que eu calculo a melhor proporção) ou use concentrados de minerais para café.
              </div>
            </div>
          )}
        </Section>
      )}

      {e.notes.length > 0 && (
        <Section header="Observações">
          {e.notes.map((n) => (
            <div class="cell note" key={n}><Info />{n}</div>
          ))}
        </Section>
      )}

      <Section header="Dados do rótulo">
        {photo && <img class="photo" src={photo} alt="Foto do rótulo" />}
        {campos.map((f) => (
          <div class="row" key={f}>
            <div class="row-main">{FIELDS[f].label}</div>
            <div class="row-value">{fmt(water.values[f]!, 3)}{FIELDS[f].unit && ` ${FIELDS[f].unit}`}</div>
          </div>
        ))}
        {campos.length === 0 && !photo && <div class="row"><div class="row-main row-value">Nenhum valor preenchido</div></div>}
        {water.notes && (
          <div class="cell">
            <div class="small" style={{ marginTop: 0 }}>Anotações</div>
            <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{water.notes}</div>
          </div>
        )}
      </Section>

      <Section>
        <button class="row" onClick={() => setCriterios(!criterios)} aria-expanded={criterios}>
          <div class="row-main">Como a nota é calculada</div>
          <ChevronRight style={{ transform: criterios ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {criterios && (
          <div class="cell criteria">
            <p>
              Faixas baseadas no padrão de água da SCA (Specialty Coffee Association) e no SCA Water Chart. Cada
              parâmetro vale 100% dentro do ideal e cai aos poucos até a borda do aceitável. Se a dureza ou a
              alcalinidade estiverem fora do aceitável, a nota para em “Regular”.
            </p>
            {PARAM_LIST.map((p) => (
              <p class="small" key={p.key}>{p.title}: {faixaTexto(p)}, {aceitavelTexto(p)} · peso {p.weight}</p>
            ))}
            <p class="small">
              Dureza (GH) = Ca × 2,497 + Mg × 4,118 · Alcalinidade (KH) = HCO₃⁻ × 0,82 · valores em mg/L como CaCO₃.
            </p>
          </div>
        )}
      </Section>

      <Section>
        <button class="row destructive" onClick={() => setConfirmDelete(true)}>Excluir água</button>
      </Section>

      {confirmDelete && (
        <ActionSheet
          title={`Excluir ${water.brand}?`}
          message="Apaga o cadastro e a foto do rótulo deste iPhone."
          actions={[{ label: 'Excluir água', icon: <Trash />, destructive: true, onClick: props.onDelete }]}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

function ParamCell({ r, e }: { r: ParamResult; e: Evaluation }) {
  const p = e.profile
  const origem =
    r.param.key === 'DUREZA' ? p.ghOrigem
      : r.param.key === 'ALCALINIDADE' ? p.khOrigem
        : r.param.key === 'TDS' && p.tdsSource && p.tdsSource !== 'MEDIDO' ? TDS_SOURCE[p.tdsSource]
          : null
  return (
    <div class="cell">
      <div class="param-top">
        <div class="param-name">{r.param.title}</div>
        <div>
          <span class="param-value">{fmt(r.value, r.param.key === 'PH' ? 2 : 1)}</span>
          {r.param.unit && <span class="param-unit"> {r.param.unit}</span>}
        </div>
      </div>
      {origem && <div class="param-origin">{origem}</div>}
      <RangeBar param={r.param} value={r.value} />
      <div class="param-meta">
        <Pill status={r.status} />
        <span>{faixaTexto(r.param)}</span>
      </div>
      <div class="param-msg">{message(r.param, r.status)}</div>
    </div>
  )
}

function MixCell({ m, brand, onOpen }: { m: Mistura; brand: string; onOpen: (id: string) => void }) {
  const outra = m.parceira
  const nome = outra?.brand ?? 'água destilada ou de osmose'
  const pct = percentual(m)
  const body = (
    <>
      <div class="mix-title">
        <span>{outra ? `Misturar com ${outra.brand}` : 'Diluir'}</span>
        {outra && <ChevronRight />}
      </div>
      <div class="mix-bar">
        <span style={{ flex: pct, background: 'var(--tint)' }} />
        <span style={{ flex: 100 - pct, background: 'var(--blue)' }} />
      </div>
      <div class="legend"><i style={{ background: 'var(--tint)' }} />{pct}% {brand}</div>
      <div class="legend"><i style={{ background: 'var(--blue)' }} />{100 - pct}% {nome}</div>
      <div class="mix-score">Nota estimada: {m.nota} (sozinha: {m.notaAntes})</div>
      <div class="small">Estimativa sem considerar o pH, que muda pouco a nota.</div>
    </>
  )
  return outra ? (
    <button class="cell row tap" style={{ display: 'block', padding: '14px 16px' }} onClick={() => onOpen(outra.id)}>{body}</button>
  ) : (
    <div class="cell">{body}</div>
  )
}

/** URL temporária da foto guardada no IndexedDB. */
export function usePhotoUrl(id?: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return setUrl(null)
    let u: string | null = null
    let vivo = true
    getPhoto(id).then((b) => {
      if (!vivo || !b) return
      u = URL.createObjectURL(b)
      setUrl(u)
    })
    return () => {
      vivo = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}
