import type { Param, Status, Verdict } from '../domain/evaluator'

/** solid: ponto no gráfico e texto sobre o espresso; os tiles usam as classes .v-<veredito> do CSS */
export const VERDICT: Record<Verdict, { solid: string; cls: string }> = {
  EXCELENTE: { solid: '#3CC872', cls: 'v-excelente' },
  BOA: { solid: '#A3D24E', cls: 'v-boa' },
  REGULAR: { solid: '#F2B33D', cls: 'v-regular' },
  RUIM: { solid: '#F0644A', cls: 'v-ruim' },
  INSUFICIENTE: { solid: '#A8A29E', cls: 'v-insuficiente' },
}

export const STATUS_CLS: Record<Status, string> = {
  MUITO_BAIXO: 's-bad',
  BAIXO: 's-warn',
  IDEAL: 's-ok',
  ALTO: 's-warn',
  MUITO_ALTO: 's-bad',
}

/** slot: o ListItem do Framework7 lê para saber onde encaixar o tile */
export function ScoreTile({ score, verdict }: { score: number | null; verdict: Verdict; slot?: string }) {
  return (
    <div className={`score-tile num ${VERDICT[verdict].cls}`} aria-label={score == null ? 'Sem nota' : `Nota ${score}`}>
      {score ?? '–'}
    </div>
  )
}

/** Faixa do parâmetro: aceitável, ideal e o valor da água, numa régua de linha fina. */
export function RangeBar({ param, value, status }: { param: Param; value: number; status: Status }) {
  const f = param.faixa
  const min = param.key === 'PH' ? Math.min(4, value) : 0
  const max = Math.max(f.okMax * 1.3, value * 1.08)
  const x = (v: number) => Math.min(Math.max((v - min) / (max - min), 0), 1) * 100
  return (
    <div className="range" aria-hidden="true">
      <div className="range-track" />
      <div className="range-ok" style={{ left: `${x(f.okMin)}%`, width: `${x(f.okMax) - x(f.okMin)}%` }} />
      <div className="range-ideal" style={{ left: `${x(f.idealMin)}%`, width: `${x(f.idealMax) - x(f.idealMin)}%` }} />
      <div className={`range-dot ${STATUS_CLS[status]}`} style={{ left: `clamp(7px, ${x(value)}%, calc(100% - 7px))` }} />
    </div>
  )
}
