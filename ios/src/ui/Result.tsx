import {
  AccordionContent, Actions, ActionsButton, ActionsGroup, ActionsLabel, Block, BlockTitle, Link, List, ListButton, ListItem,
  Navbar, NavRight, Page,
} from 'framework7-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  aceitavelTexto, type Evaluation, faixaTexto, verdictOf, message, PARAM_LIST, type ParamResult, STATUS_LABEL, VERDICTS,
} from '../domain/evaluator'
import { fmt } from '../domain/format'
import { melhorDiluicao, melhorMistura, type Mistura, percentual, precisaMineralizar } from '../domain/improvements'
import { mix, profileFrom, TDS_SOURCE } from '../domain/profile'
import { FIELD_ORDER, FIELDS, type WaterLabel } from '../model'
import { openEditor, remove, useApp } from '../state'
import { getPhoto } from '../store'
import { Chart, type ChartRoute } from './Chart'
import { RangeBar, STATUS_CLS, VERDICT } from './common'

interface Router { back: () => void; navigate: (url: string) => void }

export function Result(props: { id: string; f7router: Router }) {
  const waters = useApp((s) => s.waters)
  const evals = useApp((s) => s.evals)
  const water = waters.find((w) => w.id === props.id)
  const e = water && evals.get(water.id)
  // Excluída: a página ainda existe durante a animação de volta
  if (!water || !e) return <Page><Navbar backLink="Águas" className="espresso" /></Page>
  return <ResultPage water={water} e={e} all={waters} router={props.f7router} />
}

function ResultPage({ water, e, all, router }: { water: WaterLabel; e: Evaluation; all: WaterLabel[]; router: Router }) {
  const [confirm, setConfirm] = useState(false)
  const photo = usePhotoUrl(water.photoId)
  const diluicao = useMemo(() => melhorDiluicao(e.profile), [e])
  const mistura = useMemo(() => melhorMistura(water, e.profile, all), [e, all])
  const mineralizar = precisaMineralizar(e.profile) && !mistura
  const campos = FIELD_ORDER.filter((f) => water.values[f] != null)
  const p = e.profile
  const noGrafico = p.gh != null && p.kh != null

  // A melhor correção vira a rota no gráfico
  const melhor = [mistura, diluicao].filter(Boolean).sort((a, b) => b!.nota - a!.nota)[0] ?? null
  const route: ChartRoute | undefined = useMemo(() => {
    if (!melhor || !noGrafico) return undefined
    const outra = melhor.parceira ? profileFrom(melhor.parceira.values) : null
    const r = mix(p, outra, melhor.fracao)
    return {
      to: { gh: r.gh!, kh: r.kh! },
      verdict: verdictOf(melhor.nota),
      via: outra ? { gh: outra.gh!, kh: outra.kh! } : undefined,
      label: rotulo(melhor, e.score ?? melhor.notaAntes),
    }
  }, [melhor, p])

  const v = VERDICTS[e.verdict]

  // O nome aparece na barra só quando o título grande sai da tela, como no iOS
  const titulo = useRef<HTMLHeadingElement>(null)
  const [nomeNaBarra, setNomeNaBarra] = useState(false)
  useEffect(() => {
    const el = titulo.current
    if (!el) return
    const io = new IntersectionObserver(([en]) => setNomeNaBarra(!en.isIntersecting), { rootMargin: '-60px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Page className="result">
      <Navbar backLink="Águas" className={`espresso${nomeNaBarra ? '' : ' title-hidden'}`} title={water.brand}>
        <NavRight>
          <Link onClick={() => openEditor({ original: water })}>Editar</Link>
        </NavRight>
      </Navbar>

      <div className="hero result-hero">
        <h1 className="hero-title" ref={titulo}>{water.brand}</h1>
        {water.source && <div className="hero-source">{water.source}</div>}
        <div className="verdict">
          <div className="verdict-score num" style={{ color: VERDICT[e.verdict].solid }}>{e.score ?? '–'}</div>
          <div>
            <div className="verdict-title">{v.title}</div>
            <div className="verdict-desc">{v.description}</div>
          </div>
        </div>
        {noGrafico ? (
          <>
            <Chart
              points={[{ id: water.id, gh: p.gh!, kh: p.kh!, verdict: e.verdict }]}
              focus={water.id}
              route={route}
              label={`${water.brand} no gráfico: GH ${fmt(p.gh!, 0)}, KH ${fmt(p.kh!, 0)}`}
            />
            <p className="hero-caption num">
              GH {fmt(p.gh!, 0)} · KH {fmt(p.kh!, 0)}
              {route && <><br /><span className="route-caption">{route.label}</span></>}
            </p>
          </>
        ) : (
          <p className="hero-caption">Sem dureza e alcalinidade não dá para pôr no gráfico. Edite e preencha cálcio, magnésio e bicarbonato.</p>
        )}
      </div>

      {(diluicao || mistura || mineralizar) && (
        <>
          <BlockTitle>Como melhorar</BlockTitle>
          <List strong inset dividers>
            {mistura && <MixItem m={mistura} brand={water.brand} antes={e.score ?? mistura.notaAntes} onOpen={(id) => router.navigate(`/agua/${id}/`)} />}
            {diluicao && <MixItem m={diluicao} brand={water.brand} antes={e.score ?? diluicao.notaAntes} />}
            {mineralizar && (
              <ListItem title="Falta mineral" text="Diluir não resolve: ela já é leve demais. Misture com uma água mais mineralizada (cadastre outras marcas que eu calculo a proporção) ou use concentrado de minerais para café." />
            )}
          </List>
        </>
      )}

      {e.results.length > 0 && (
        <>
          <BlockTitle>Parâmetros</BlockTitle>
          <List strong inset dividers className="params">
            {e.results.map((r) => <ParamItem key={r.param.key} r={r} e={e} />)}
          </List>
        </>
      )}

      {e.notes.length > 0 && (
        <>
          <BlockTitle>Observações</BlockTitle>
          <List strong inset dividers className="notes">
            {e.notes.map((n) => <ListItem key={n} text={n} />)}
          </List>
        </>
      )}

      <BlockTitle>Dados do rótulo</BlockTitle>
      <List strong inset dividers>
        {photo && (
          <li className="label-photo">
            <img src={photo} alt="Foto do rótulo" />
          </li>
        )}
        {campos.map((f) => (
          <ListItem key={f} title={FIELDS[f].label} after={`${fmt(water.values[f]!, 3)}${FIELDS[f].unit ? ` ${FIELDS[f].unit}` : ''}`} />
        ))}
        {campos.length === 0 && <ListItem title="Nenhum valor preenchido" />}
        {water.notes && <ListItem header="Anotações" title={water.notes} className="multiline" />}
      </List>

      <List strong inset accordionList>
        <ListItem accordionItem title="Como a nota é calculada">
          <AccordionContent>
            <Block className="criteria">
              <p>
                Faixas do padrão de água da SCA e do SCA Water Chart. Cada parâmetro vale 100% dentro do ideal e
                cai aos poucos até a borda do aceitável. Se a dureza ou a alcalinidade estiverem fora do aceitável,
                a nota para em “Regular”.
              </p>
              {PARAM_LIST.map((x) => (
                <p key={x.key} className="small">{x.title}: {faixaTexto(x)}, {aceitavelTexto(x)} · peso {x.weight}</p>
              ))}
              <p className="small">GH = Ca × 2,497 + Mg × 4,118 · KH = HCO₃⁻ × 0,82 · em mg/L de CaCO₃.</p>
            </Block>
          </AccordionContent>
        </ListItem>
      </List>

      <List strong inset>
        <ListButton color="red" onClick={() => setConfirm(true)}>Excluir água</ListButton>
      </List>

      <Actions opened={confirm} onActionsClosed={() => setConfirm(false)}>
        <ActionsGroup>
          <ActionsLabel>Apaga {water.brand} e a foto do rótulo deste iPhone.</ActionsLabel>
          <ActionsButton color="red" onClick={() => { router.back(); setTimeout(() => remove(water.id), 450) }}>
            Excluir água
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton strong>Cancelar</ActionsButton>
        </ActionsGroup>
      </Actions>
    </Page>
  )
}

function rotulo(m: Mistura, antes: number) {
  const pct = percentual(m)
  return m.parceira
    ? `Misturando ${pct}% dela com ${100 - pct}% de ${m.parceira.brand}, a nota vai de ${antes} para ${m.nota}`
    : `Com ${100 - pct}% de água destilada, a nota vai de ${antes} para ${m.nota}`
}

/** antes: a nota do topo (a das misturas ignora o pH, que não se mistura de forma linear) */
function MixItem({ m, brand, antes, onOpen }: { m: Mistura; brand: string; antes: number; onOpen?: (id: string) => void }) {
  const pct = percentual(m)
  const outra = m.parceira?.brand ?? 'água destilada ou de osmose'
  return (
    <ListItem
      link={m.parceira && onOpen ? '#' : undefined}
      onClick={m.parceira && onOpen ? () => onOpen(m.parceira!.id) : undefined}
      className="mix"
    >
      <div slot="title">{m.parceira ? `Misturar com ${m.parceira.brand}` : 'Diluir'}</div>
      <div slot="after" className="mix-score num">{antes} → <b>{m.nota}</b></div>
      <div slot="footer" className="mix-body">
        <div className="mix-bar">
          <span style={{ flex: pct }} className="mix-a" />
          <span style={{ flex: 100 - pct }} className={`mix-b${m.parceira ? '' : ' destilada'}`} />
        </div>
        <div className="mix-legend num">
          <span><i className="mix-a" />{pct}% {brand}</span>
          <span><i className={`mix-b${m.parceira ? '' : ' destilada'}`} />{100 - pct}% {outra}</span>
        </div>
      </div>
    </ListItem>
  )
}

// O List do Framework7 só põe no <ul> o que ele reconhece como item pelo displayName
MixItem.displayName = 'f7-list-item-mix'
ParamItem.displayName = 'f7-list-item-param'

function ParamItem({ r, e }: { r: ParamResult; e: Evaluation }) {
  const p = e.profile
  const origem =
    r.param.key === 'DUREZA' ? p.ghOrigem
      : r.param.key === 'ALCALINIDADE' ? p.khOrigem
        : r.param.key === 'TDS' && p.tdsSource && p.tdsSource !== 'MEDIDO' ? TDS_SOURCE[p.tdsSource]
          : null
  return (
    <li className="param">
      <div className="param-top">
        <span className="param-name">{r.param.title}</span>
        <span className="param-value num">
          {fmt(r.value, r.param.key === 'PH' ? 2 : 1)}
          {r.param.unit && <small> {r.param.unit}</small>}
        </span>
      </div>
      {origem && <div className="param-origin num">{origem}</div>}
      <RangeBar param={r.param} value={r.value} status={r.status} />
      <div className="param-meta">
        <span className={`pill ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
        <span className="num">{faixaTexto(r.param)}</span>
      </div>
      <p className="param-msg">{message(r.param, r.status)}</p>
    </li>
  )
}

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
