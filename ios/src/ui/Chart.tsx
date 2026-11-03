import { useEffect, useState } from 'react'
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
  label?: string
}

export interface ChartRoute {
  /** Onde a água vai parar depois da correção */
  to: { gh: number; kh: number }
  /** A outra água da mistura, quando houver */
  via?: { gh: number; kh: number }
  label: string
}

const W = 340
const H = 220
const PAD = { l: 30, r: 10, t: 10, b: 26 }
const ideal = { gh: PARAMS.DUREZA.faixa, kh: PARAMS.ALCALINIDADE.faixa }

/** Escala fixa: assim a zona ideal tem sempre o mesmo tamanho e uma água fora da curva não achata as outras */
const MAX_GH = 200
const MAX_KH = 120

export function Chart(props: {
  points: ChartPoint[]
  focus?: string
  route?: ChartRoute
  onSelect?: (id: string) => void
  label: string
}) {
  const { points, focus, route } = props
  const maxGh = MAX_GH
  const maxKh = MAX_KH
  const fora = (p: { gh: number; kh: number }) => p.gh > maxGh || p.kh > maxKh
  const x = (gh: number) => PAD.l + (Math.min(gh, maxGh) / maxGh) * (W - PAD.l - PAD.r)
  const y = (kh: number) => H - PAD.b - (Math.min(kh, maxKh) / maxKh) * (H - PAD.t - PAD.b)

  // A rota anda uma vez quando a tela abre: o ponto da água corrigida desliza até o destino
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

  const gridGh = Array.from({ length: maxGh / 50 + 1 }, (_, i) => i * 50)
  const gridKh = Array.from({ length: maxKh / 20 + 1 }, (_, i) => i * 20)
  const f = focus ? points.find((p) => p.id === focus) : undefined

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.label}>
      {gridGh.map((g) => (
        <g key={`x${g}`}>
          <line className="chart-grid" x1={x(g)} x2={x(g)} y1={PAD.t} y2={H - PAD.b} />
          <text className="chart-tick" x={x(g)} y={H - 8} textAnchor="middle">{g}</text>
        </g>
      ))}
      {gridKh.map((k) => (
        <g key={`y${k}`}>
          <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y(k)} y2={y(k)} />
          <text className="chart-tick" x={PAD.l - 6} y={y(k) + 3.5} textAnchor="end">{k}</text>
        </g>
      ))}
      <line className="chart-axis" x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} />
      <line className="chart-axis" x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} />

      <rect
        className="chart-ok"
        x={x(ideal.gh.okMin)} y={y(ideal.kh.okMax)}
        width={x(ideal.gh.okMax) - x(ideal.gh.okMin)} height={y(ideal.kh.okMin) - y(ideal.kh.okMax)} rx="4"
      />
      <rect
        className="chart-zone"
        x={x(ideal.gh.idealMin)} y={y(ideal.kh.idealMax)}
        width={x(ideal.gh.idealMax) - x(ideal.gh.idealMin)} height={y(ideal.kh.idealMin) - y(ideal.kh.idealMax)} rx="4"
      />
      <text className="chart-zone-label" x={x(ideal.gh.idealMin)} y={y(ideal.kh.idealMax) - 5}>ideal SCA</text>
      <text className="chart-axis-label" x={W - PAD.r} y={H - PAD.b - 5} textAnchor="end">GH</text>
      <text className="chart-axis-label" x={PAD.l + 5} y={PAD.t + 9}>KH</text>

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
            r="7" className="chart-target"
          />
        </g>
      )}

      {points.map((p) => {
        const on = p.id === focus
        const dim = focus && !on
        return (
          <g
            key={p.id}
            className={`chart-point${dim ? ' dim' : ''}${props.onSelect ? ' tap' : ''}`}
            onClick={props.onSelect ? () => props.onSelect!(p.id) : undefined}
          >
            {props.onSelect && <circle cx={x(p.gh)} cy={y(p.kh)} r="16" fill="transparent" />}
            {on && <circle cx={x(p.gh)} cy={y(p.kh)} r="13" className="chart-halo" style={{ stroke: VERDICT[p.verdict].solid }} />}
            <circle cx={x(p.gh)} cy={y(p.kh)} r={on ? 8 : 6.5} className="chart-dot" style={{ fill: VERDICT[p.verdict].solid }} />
            {fora(p) && (
              // Fora da escala: fica na borda com uma seta apontando para onde ela está de verdade
              <path
                className="chart-off"
                transform={`translate(${x(p.gh)} ${y(p.kh)}) rotate(${(Math.atan2(-(p.kh > maxKh ? 1 : 0), p.gh > maxGh ? 1 : 0) * 180) / Math.PI})`}
                d="M11 -4 L16 0 L11 4"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
