import type { ComponentChildren, RefObject } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { type Param, type Status, STATUS_LABEL, type Verdict } from '../domain/evaluator'
import { ChevronLeft } from './icons'

export const VERDICT_COLOR: Record<Verdict, string> = {
  EXCELENTE: 'var(--green)',
  BOA: 'var(--mint)',
  REGULAR: 'var(--orange)',
  RUIM: 'var(--red)',
  INSUFICIENTE: 'var(--label-3)',
}

export const STATUS_COLOR: Record<Status, string> = {
  MUITO_BAIXO: 'var(--red)',
  BAIXO: 'var(--orange)',
  IDEAL: 'var(--green)',
  ALTO: 'var(--orange)',
  MUITO_ALTO: 'var(--red)',
}

/** Liga o estado "rolou" da barra quando o título grande sai de vista. */
export function useScrolled(ref: RefObject<HTMLElement | null>, limite = 40) {
  const [scrolled, set] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => set(el.scrollTop > limite)
    on()
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [ref.current])
  return scrolled
}

export function NavBar(props: {
  title: string
  scrolled: boolean
  back?: { label: string; onClick: () => void }
  right?: ComponentChildren
  inline?: boolean
}) {
  return (
    <header class={`navbar${props.scrolled ? ' scrolled' : ''}${props.inline ? ' inline' : ''}`}>
      <div class="navbar-row">
        <div class="navbar-left">
          {props.back && (
            <button class="bar-btn back" onClick={props.back.onClick}>
              <ChevronLeft />
              {props.back.label}
            </button>
          )}
        </div>
        <div class="navbar-title">{props.title}</div>
        <div class="navbar-right">{props.right}</div>
      </div>
    </header>
  )
}

/** Sem cabeçalho, o espaço que ele ocuparia vira margem (top muda a distância). */
export function Section(props: { header?: string; footer?: ComponentChildren; big?: boolean; top?: number; children: ComponentChildren }) {
  return (
    <section class="section" style={props.header ? undefined : { marginTop: props.top ?? 35 }}>
      {props.header && <div class={`section-header${props.big ? ' big' : ''}`}>{props.header}</div>}
      <div class="group">{props.children}</div>
      {props.footer && <div class="section-footer">{props.footer}</div>}
    </section>
  )
}

export function Badge({ score, verdict }: { score: number | null; verdict: Verdict }) {
  if (score == null) return <div class="badge none">–</div>
  return <div class="badge" style={{ background: VERDICT_COLOR[verdict] }}>{score}</div>
}

/** Anel no estilo dos anéis de atividade, preenchido até a nota. */
export function ScoreRing({ score, verdict }: { score: number | null; verdict: Verdict }) {
  const r = 62
  const c = 2 * Math.PI * r
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score ?? 0))
    return () => cancelAnimationFrame(id)
  }, [score])
  return (
    <div class="ring" role="img" aria-label={score == null ? 'Sem nota' : `Nota ${score} de 100`}>
      <svg viewBox="0 0 148 148">
        <circle class="ring-track" cx="74" cy="74" r={r} fill="none" stroke-width="16" />
        <circle
          class="ring-bar"
          cx="74" cy="74" r={r} fill="none" stroke-width="16" stroke-linecap="round"
          stroke={VERDICT_COLOR[verdict]}
          stroke-dasharray={c}
          stroke-dashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <div class="ring-num">
        {score ?? '–'}
        <small>{score == null ? 'sem nota' : 'de 100'}</small>
      </div>
    </div>
  )
}

export function RangeBar({ param, value }: { param: Param; value: number }) {
  const f = param.faixa
  const min = param.key === 'PH' ? Math.min(4, value) : 0
  const max = Math.max(f.okMax * 1.3, value * 1.08)
  const x = (v: number) => Math.min(Math.max((v - min) / (max - min), 0), 1) * 100
  const pos = (a: number, b: number) => ({ left: `${x(a)}%`, width: `${x(b) - x(a)}%` })
  return (
    <div class="range" aria-hidden="true">
      <div class="range-track" />
      <div class="range-ok" style={pos(f.okMin, f.okMax)} />
      <div class="range-ideal" style={pos(f.idealMin, f.idealMax)} />
      <div class="range-dot" style={{ left: `clamp(9px, ${x(value)}%, calc(100% - 9px))`, background: STATUS_COLOR[f.status(value)] }} />
    </div>
  )
}

export function Pill({ status }: { status: Status }) {
  return <span class="pill" style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
}

/** Fecha com animação: o pai só desmonta depois que a folha desce. */
export function useClosing(onClose: () => void, ms = 280) {
  const [closing, setClosing] = useState(false)
  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, ms)
  }
  return [closing, close] as const
}

export function Sheet(props: {
  title: string
  left?: ComponentChildren
  right?: ComponentChildren
  closing: boolean
  children: ComponentChildren
}) {
  const body = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled(body, 4)
  return (
    <>
      <div class={`scrim${props.closing ? ' closing' : ''}`} />
      <div class={`sheet${props.closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={props.title}>
        <div class={`sheet-bar${scrolled ? ' scrolled' : ''}`}>
          <div class="grabber" />
          <div class="navbar-left">{props.left}</div>
          <div class="sheet-title">{props.title}</div>
          <div class="navbar-right">{props.right}</div>
        </div>
        <div class="sheet-body" ref={body}>{props.children}</div>
      </div>
    </>
  )
}

export interface Action {
  label: string
  icon?: ComponentChildren
  destructive?: boolean
  onClick: () => void
}

export function ActionSheet(props: { title?: string; message?: string; actions: Action[]; onClose: () => void }) {
  const [closing, close] = useClosing(props.onClose, 240)
  const pick = (a: Action) => {
    close()
    // A câmera do iOS só abre a partir do toque, então a ação roda já, sem esperar a animação
    a.onClick()
  }
  return (
    <>
      <div class={`scrim top${closing ? ' closing' : ''}`} onClick={close} />
      <div class={`action-sheet${closing ? ' closing' : ''}`} role="dialog" aria-modal="true">
        <div class="action-group">
          {(props.title || props.message) && (
            <div class="action-title">
              {props.title && <strong>{props.title}</strong>}
              {props.message}
            </div>
          )}
          {props.actions.map((a) => (
            <button class={`action-btn${a.destructive ? ' destructive' : ''}`} onClick={() => pick(a)}>
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <div class="action-group">
          <button class="action-btn cancel" onClick={close}>Cancelar</button>
        </div>
      </div>
    </>
  )
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [text])
  return <div class="toast" role="status">{text}</div>
}
