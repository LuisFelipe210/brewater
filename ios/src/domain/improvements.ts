import type { WaterLabel } from '../model'
import { PARAMS, rawScore, round } from './evaluator'
import { mix, profileFrom, type WaterProfile } from './profile'

/** fracao desta água + (1 - fracao) de parceira (null = água destilada / osmose reversa). */
export interface Mistura {
  fracao: number
  parceira: WaterLabel | null
  notaAntes: number
  nota: number
}

export const percentual = (m: Mistura) => round(m.fracao * 100)

const GANHO_MINIMO = 5

/** O pH não sobrevive à mistura, então a comparação é feita sem ele. */
const base = (p: WaterProfile) => rawScore({ ...p, ph: null })

export function melhorDiluicao(p: WaterProfile): Mistura | null {
  const antes = base(p)
  if (antes == null) return null
  let melhor: [number, number] | null = null
  for (let pct = 95; pct >= 10; pct -= 5) {
    const f = pct / 100
    const s = rawScore(mix(p, null, f))
    if (s == null) continue
    if (melhor == null || s > melhor[1] + 0.01) melhor = [f, s]
  }
  if (!melhor) return null
  const m = { fracao: melhor[0], parceira: null, notaAntes: round(antes), nota: round(melhor[1]) }
  return m.nota >= m.notaAntes + GANHO_MINIMO ? m : null
}

export function melhorMistura(self: WaterLabel, p: WaterProfile, outras: WaterLabel[]): Mistura | null {
  const antes = base(p)
  if (antes == null) return null
  let melhor: Mistura | null = null
  for (const outra of outras) {
    if (outra.id === self.id) continue
    const op = profileFrom(outra.values)
    if (op.gh == null || op.kh == null) continue
    for (let pct = 10; pct <= 90; pct += 10) {
      const f = pct / 100
      const raw = rawScore(mix(p, op, f))
      if (raw == null) continue
      const s = round(raw)
      if (melhor == null || s > melhor.nota) melhor = { fracao: f, parceira: outra, notaAntes: round(antes), nota: s }
    }
  }
  return melhor && melhor.nota >= melhor.notaAntes + GANHO_MINIMO && melhor.nota >= 70 ? melhor : null
}

/** Água leve demais: diluir não ajuda, precisa de mais minerais. */
export function precisaMineralizar(p: WaterProfile): boolean {
  if (p.gh == null || p.kh == null) return false
  return p.gh < PARAMS.DUREZA.faixa.idealMin && p.kh < PARAMS.ALCALINIDADE.faixa.idealMin
}
