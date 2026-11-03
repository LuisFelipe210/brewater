import {
  Actions, ActionsButton, ActionsGroup, ActionsLabel, Block, Button, Icon, Link, List, ListItem, Navbar, NavRight, Page,
} from 'framework7-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { VERDICTS } from '../domain/evaluator'
import { fmt } from '../domain/format'
import { clearChanged, openEditor, ranking, useApp } from '../state'
import { pickPhoto } from './pick'
import { Chart } from './Chart'
import { ScoreTile } from './common'

export function Home(props: { f7router?: { navigate: (url: string) => void } }) {
  const waters = useApp((s) => s.waters)
  const evals = useApp((s) => s.evals)
  const loaded = useApp((s) => s.loaded)
  const changed = useApp((s) => s.changed)
  const [adding, setAdding] = useState(false)
  const rows = useMemo(() => ranking({ waters, evals } as never), [waters, evals])
  const open = (id: string) => props.f7router?.navigate(`/agua/${id}/`)

  const points = rows
    .filter(([, e]) => e.profile.gh != null && e.profile.kh != null)
    .map(([w, e]) => ({ id: w.id, gh: e.profile.gh!, kh: e.profile.kh!, verdict: e.verdict }))
  const n = rows.length
  const flip = useFlip(rows.map(([w]) => w.id).join())

  return (
    <Page
      className="home"
      onPageAfterIn={() => changed && setTimeout(clearChanged, 2600)}
      onPageInit={() => changed && setTimeout(clearChanged, 2600)}
    >
      <Navbar large className="espresso" title="Brewater">
        <NavRight>
          <Link iconF7="plus" aria-label="Nova água" onClick={() => setAdding(true)} />
        </NavRight>
      </Navbar>

      <div className="hero">
        <Chart
          points={points}
          onSelect={open}
          label={n ? `Gráfico de dureza e alcalinidade com ${points.length} águas` : 'Gráfico vazio com a zona ideal da SCA'}
        />
        <p className="hero-caption">
          {n === 0
            ? 'Cada água vira um ponto aqui. Quanto mais perto da faixa azul, melhor para o café.'
            : `${n} ${n === 1 ? 'água' : 'águas'} no gráfico da SCA. Toque num ponto para abrir.`}
        </p>
      </div>

      {loaded && n === 0 && (
        <Block className="first">
          <h2>Qual água vai no seu café?</h2>
          <p>Fotografe a tabela de composição do rótulo. Eu leio os minerais, dou uma nota e digo como melhorar.</p>
          <Button large fill round onClick={() => pickPhoto('camera')}>
            <Icon aria-hidden="true" f7="camera_fill" />Fotografar rótulo
          </Button>
          <Button large tonal round onClick={() => pickPhoto('library')}>
            <Icon aria-hidden="true" f7="photo" />Escolher foto
          </Button>
          <Button onClick={() => openEditor({ original: null })}>Digitar os valores</Button>
        </Block>
      )}

      {n > 0 && (
        <div ref={flip}>
        <List strong inset dividers className="waters">
          {rows.map(([w, e]) => (
            <ListItem
              key={w.id}
              link={`/agua/${w.id}/`}
              title={w.brand}
              className={w.id === changed ? 'changed' : undefined}
              data-id={w.id}
            >
              <ScoreTile slot="media" score={e.score} verdict={e.verdict} />
              <div slot="footer">{VERDICTS[e.verdict].title}</div>
              {e.profile.gh != null && e.profile.kh != null && (
                <div slot="after" className="gh-kh num">
                  <span>GH {fmt(e.profile.gh, 0)}</span>
                  <span>KH {fmt(e.profile.kh, 0)}</span>
                </div>
              )}
            </ListItem>
          ))}
        </List>
        </div>
      )}

      <Actions opened={adding} onActionsClosed={() => setAdding(false)}>
        <ActionsGroup>
          <ActionsLabel>Fotografe a tabela de composição do rótulo</ActionsLabel>
          <ActionsButton onClick={() => pickPhoto('camera')}>Fotografar rótulo</ActionsButton>
          <ActionsButton onClick={() => pickPhoto('library')}>Escolher foto</ActionsButton>
          <ActionsButton onClick={() => openEditor({ original: null, paste: true })}>Colar texto do rótulo</ActionsButton>
          <ActionsButton onClick={() => openEditor({ original: null })}>Digitar valores</ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton strong>Cancelar</ActionsButton>
        </ActionsGroup>
      </Actions>
    </Page>
  )
}

/**
 * Quando a ordem muda (uma água editada subiu ou desceu), cada linha desliza da posição antiga
 * para a nova em vez de pular.
 */
function useFlip(order: string) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const items = [...el.querySelectorAll<HTMLElement>('li[data-id]')]
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const li of items) {
      const id = li.dataset.id!
      const top = li.getBoundingClientRect().top
      const antes = pos.current.get(id)
      if (antes != null && antes !== top && !reduce) {
        li.animate([{ transform: `translateY(${antes - top}px)` }, { transform: 'none' }], {
          duration: 520,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        })
      }
      pos.current.set(id, top)
    }
  }, [order])
  return ref
}
