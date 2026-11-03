import { useRef } from 'preact/hooks'
import { type Evaluation, VERDICTS } from '../domain/evaluator'
import type { WaterLabel } from '../model'
import { Camera, ChevronRight, Photo, Plus } from './icons'
import { Badge, NavBar, Section, useScrolled } from './parts'

export function Home(props: {
  waters: [WaterLabel, Evaluation][]
  loaded: boolean
  onOpen: (id: string) => void
  onAdd: () => void
  onCamera: () => void
  onLibrary: () => void
  onManual: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled(ref)
  const n = props.waters.length

  return (
    <div class="screen-scroll" ref={ref} style={{ height: '100%', overflowY: 'auto' }}>
      <NavBar
        title="Brewater"
        scrolled={scrolled}
        right={n > 0 && (
          <button class="bar-btn" aria-label="Nova água" onClick={props.onAdd}>
            <Plus />
          </button>
        )}
      />
      <h1 class="large-title">Brewater</h1>
      <div class="large-sub">
        {n === 0 ? 'A água certa para o seu café' : n === 1 ? '1 água cadastrada' : `${n} águas, da melhor para a pior`}
      </div>

      {props.loaded && n === 0 && (
        <div class="empty">
          <img class="empty-icon" src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" />
          <h2>Qual água vai no seu café?</h2>
          <p>
            Fotografe a tabela de composição do rótulo ou digite os valores. Comparo com os parâmetros da SCA
            e digo se ela serve para café especial.
          </p>
          <div class="btns">
            <button class="btn-filled" onClick={props.onCamera}><Camera />Fotografar rótulo</button>
            <button class="btn-gray" onClick={props.onLibrary}><Photo />Escolher foto</button>
            <button class="btn-plain" onClick={props.onManual}>Digitar os valores</button>
          </div>
        </div>
      )}

      {n > 0 && (
        <Section top={20}>
            {props.waters.map(([w, e]) => (
              <button class="row water-row" key={w.id} onClick={() => props.onOpen(w.id)}>
                <Badge score={e.score} verdict={e.verdict} />
                <div class="row-main">
                  <div class="row-title">{w.brand}</div>
                  <div class="row-sub">{VERDICTS[e.verdict].title}{w.source ? ` · ${w.source}` : ''}</div>
                </div>
                <ChevronRight />
              </button>
          ))}
        </Section>
      )}
    </div>
  )
}
