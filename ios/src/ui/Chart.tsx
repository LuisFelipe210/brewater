import { useEffect, useRef, useState } from 'react'
import { PARAMS, type Verdict } from '../domain/evaluator'
import { VERDICT } from './common'

/*
 * O gráfico de água da SCA: dureza (GH) no eixo x, alcalinidade (KH) no y, ambos em mg/L de
 * CaCO₃. A zona ideal sai das mesmas faixas que dão a nota, então ponto dentro dela = nota alta.
 */

export interface ChartPoint {
  id: string
  gh: number
  kh: number
  verdict: Verdict
}

export interface ChartRoute {
  /** Onde a água vai parar depois da correção */
  to: { gh: number; kh: number }
  /** Veredito da água corrigida: o ponto chega com essa cor */
  verdict: Verdict
  /** A outra água da mistura, quando houver */
  via?: { gh: number; kh: number }
  label: string
}

const W = 340
const H = 220
/** Espaço do topo deixa o nome do eixo KH acima da grade, sem linha passando por ele */
const PAD = { l: 32, r: 12, t: 24, b: 30 }
const PAD_COMPACTO = { l: 12, r: 12, t: 24, b: 30 }
const ideal = { gh: PARAMS.DUREZA.faixa, kh: PARAMS.ALCALINIDADE.faixa }

/** Escala fixa: assim a zona ideal tem sempre o mesmo tamanho e uma água fora da curva não achata as outras */
const MAX_GH = 200
const MAX_KH = 120
/** Raio de toque em unidades do gráfico: dá ~44pt na largura do iPhone */
const TOQUE = 24

export function Chart(props: {
  points: ChartPoint[]
  focus?: string
  route?: ChartRoute
  onSelect?: (id: string) => void
  label: string
  /** Versão baixa, sem eixos numerados, para a prévia do formulário */
  compact?: boolean
}) {
  const { points, focus, route, compact } = props
  const h = compact ? 136 : H
  const pad = compact ? PAD_COMPACTO : PAD
  const fora = (p: { gh: number; kh: number }) => p.gh > MAX_GH || p.kh > MAX_KH
  // Ponto fora da escala fica preso um pouco para dentro da borda, nunca cortado
  const x = (gh: number) => pad.l + (Math.min(gh, MAX_GH * 0.98) / MAX_GH) * (W - pad.l - pad.r)
  const y = (kh: number) => h - pad.b - (Math.min(kh, MAX_KH * 0.96) / MAX_KH) * (h - pad.t - pad.b)
  const svg = useRef<SVGSVGElement>(null)

  // A rota anda uma vez quando a tela abre: o ponto desliza até o destino e chega com a nova cor
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!route) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setT(1)
    let raf = 0
    const start = performance.now() + 350
    const tick = (now: number) => {
      const k = Math.min(Math.max((now - start) / 1100, 0), 1)
      setT(1 - (1 - k) ** 4)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [route?.to.gh, route?.to.kh])

  /** Toque no gráfico abre a água mais próxima do dedo, se estiver perto o bastante */
  function tocar(ev: React.MouseEvent<SVGSVGElement>) {
    if (!props.onSelect || !svg.current) return
    const r = svg.current.getBoundingClientRect()
    const px = ((ev.clientX - r.left) / r.width) * W
    const py = ((ev.clientY - r.top) / r.height) * h
    let melhor: ChartPoint | undefined
    let dist = TOQUE
    for (const p of points) {
      const d = Math.hypot(x(p.gh) - px, y(p.kh) - py)
      if (d < dist) [melhor, dist] = [p, d]
    }
    if (melhor) props.onSelect(melhor.id)
  }

  const gridGh = [0, 50, 100, 150, 200]
  const gridKh = compact ? [0, 60, 120] : [0, 20, 40, 60, 80, 100, 120]
  const f = focus ? points.find((p) => p.id === focus) : undefined
  const zona = (a: number, b: number, c: number, d: number, cls: string) => (
    <rect className={cls} x={x(a)} y={y(d)} width={x(b) - x(a)} height={y(c) - y(d)} rx="4" />
  )

  return (
    <svg
      ref={svg}
      className={`chart${props.onSelect ? ' tap' : ''}`}
      viewBox={`0 0 ${W} ${h}`}
      role="img"
      aria-label={props.label}
      onClick={props.onSelect ? tocar : undefined}
    >
      {gridGh.map((g) => (
        <g key={`x${g}`}>
          <line className="chart-grid" x1={x(g)} x2={x(g)} y1={pad.t} y2={h - pad.b} />
          {!compact && <text className="chart-tick" x={x(g)} y={h - 14} textAnchor="middle">{g}</text>}
        </g>
      ))}
      {gridKh.map((k) => (
        <g key={`y${k}`}>
          <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(k)} y2={y(k)} />
          {!compact && <text className="chart-tick" x={pad.l - 6} y={y(k) + 4} textAnchor="end">{k}</text>}
        </g>
      ))}
      <line className="chart-axis" x1={pad.l} x2={W - pad.r} y1={h - pad.b} y2={h - pad.b} />
      <line className="chart-axis" x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} />

      {zona(ideal.gh.okMin, ideal.gh.okMax, ideal.kh.okMin, ideal.kh.okMax, 'chart-ok')}
      {zona(ideal.gh.idealMin, ideal.gh.idealMax, ideal.kh.idealMin, ideal.kh.idealMax, 'chart-zone')}
      {/* O rótulo da zona sai de cima quando o ponto em foco está colado nele */}
      {(() => {
        const colado = f && Math.hypot(x(f.gh) - x(ideal.gh.idealMin) - 24, y(f.kh) - y(ideal.kh.idealMax)) < 22
        // Colado: vai para dentro da zona, no canto de baixo à direita, longe das bordas
        return (
          <text
            className="chart-zone-label"
            x={colado ? x(ideal.gh.idealMax) - 4 : x(ideal.gh.idealMin)}
            y={colado ? y(ideal.kh.idealMin) - 4 : y(ideal.kh.idealMax) - 5}
            textAnchor={colado ? 'end' : 'start'}
          >
            ideal SCA
          </text>
        )
      })()}

      <text className="chart-axis-label" x={W - pad.r} y={h - 3} textAnchor="end">
        GH · dureza{compact ? '' : ', mg/L CaCO₃'}
      </text>
      <text className="chart-axis-label" x={pad.l} y={pad.t - 9}>KH · alcalinidade</text>

      {f && route && (
        <g className="chart-route">
          {route.via && (
            <>
              <line x1={x(f.gh)} y1={y(f.kh)} x2={x(route.via.gh)} y2={y(route.via.kh)} className="chart-route-ghost" />
              <circle cx={x(route.via.gh)} cy={y(route.via.kh)} r="5" className="chart-via" />
            </>
          )}
          <line
            x1={x(f.gh)} y1={y(f.kh)}
            x2={x(f.gh + (route.to.gh - f.gh) * t)} y2={y(f.kh + (route.to.kh - f.kh) * t)}
            className="chart-route-line"
          />
          <circle
            cx={x(f.gh + (route.to.gh - f.gh) * t)} cy={y(f.kh + (route.to.kh - f.kh) * t)}
            r="8" className="chart-target"
            style={{ fill: VERDICT[route.verdict].solid, fillOpacity: t }}
          />
        </g>
      )}

      {points.map((p) => {
        const on = p.id === focus
        const dim = focus && !on
        return (
          <g key={p.id} className={`chart-point${dim ? ' dim' : ''}`}>
            {on && <circle cx={x(p.gh)} cy={y(p.kh)} r="13" className="chart-halo" style={{ stroke: VERDICT[p.verdict].solid }} />}
            <circle
              cx={x(p.gh)} cy={y(p.kh)} r={on ? 8 : 6.5}
              className={`chart-dot${fora(p) ? ' off' : ''}`}
              style={{ fill: VERDICT[p.verdict].solid }}
            />
            {/* Com a rota desenhada, o "fora da escala" brigaria com ela; a legenda abaixo já traz os valores */}
            {fora(p) && !compact && !route && (
              <text className="chart-off" x={x(p.gh) - 11} y={y(p.kh) + 18} textAnchor="end">fora da escala</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
