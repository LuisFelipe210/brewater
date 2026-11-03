import type { Field, Values } from '../model'
import { fmt } from './format'

export const Chemistry = {
  /** mg/L do íon → mg/L como CaCO₃ */
  CA_CACO3: 2.497,
  MG_CACO3: 4.118,
  HCO3_CACO3: 0.8202,
  CO3_CACO3: 1.6668,
  /** Fator típico para converter condutividade (µS/cm) em TDS (mg/L). */
  TDS_POR_US: 0.65,
  /** A 180 °C, 2 HCO₃⁻ → CO₃²⁻ + CO₂ + H₂O: só ~49% da massa do bicarbonato fica no resíduo. */
  HCO3_NO_RESIDUO: 0.4918,
}

/** mg/L por meq/L (massa molar ÷ carga) */
const equivalente: Partial<Record<Field, number>> = {
  CALCIO: 20.04, MAGNESIO: 12.15, SODIO: 22.99, POTASSIO: 39.1,
  CLORETO: 35.45, SULFATO: 48.03, NITRATO: 62.0, FLUORETO: 19.0,
}
const HCO3_EQUIVALENTE = 61.02

/**
 * A água é eletricamente neutra: cátions = ânions (em meq/L). Quando o rótulo não traz o
 * bicarbonato, ele é praticamente a diferença. Exige os íons principais; K, NO₃ e F são pequenos.
 */
export function bicarbonatoPorBalanco(v: Values): number | null {
  const principais: Field[] = ['CALCIO', 'MAGNESIO', 'SODIO', 'CLORETO', 'SULFATO']
  if (principais.some((f) => v[f] == null)) return null
  const meq = (...fs: Field[]) => fs.reduce((s, f) => s + (v[f] ?? 0) / equivalente[f]!, 0)
  const cations = meq('CALCIO', 'MAGNESIO', 'SODIO', 'POTASSIO')
  const anions = meq('CLORETO', 'SULFATO', 'NITRATO', 'FLUORETO')
  return Math.max((cations - anions) * HCO3_EQUIVALENTE, 0)
}

export type TdsSource = 'MEDIDO' | 'RESIDUO' | 'CONDUTIVIDADE' | 'IONS' | 'MISTURA'

export const TDS_SOURCE: Record<TdsSource, string> = {
  MEDIDO: 'medido por você',
  RESIDUO: 'resíduo de evaporação do rótulo',
  CONDUTIVIDADE: 'estimado pela condutividade × 0,65',
  IONS: 'estimado pela soma dos íons',
  MISTURA: 'calculado para a mistura',
}

/** O que importa para o café, já convertido. Dureza e alcalinidade em mg/L como CaCO₃. */
export interface WaterProfile {
  gh: number | null
  kh: number | null
  tds: number | null
  sodio: number | null
  cloreto: number | null
  sulfato: number | null
  ph: number | null
  calcio: number | null
  magnesio: number | null
  tdsSource: TdsSource | null
  ghOrigem: string | null
  khOrigem: string | null
  avisos: string[]
}

export const DESTILADA: WaterProfile = {
  gh: 0, kh: 0, tds: 0, sodio: 0, cloreto: 0, sulfato: 0, ph: null, calcio: 0, magnesio: 0,
  tdsSource: null, ghOrigem: null, khOrigem: null, avisos: [],
}

/**
 * Mistura [fracao] de [p] com (1 - fracao) de [outra]. Sem [outra], mistura com água
 * destilada / osmose reversa (zero minerais). O pH não mistura de forma linear, então some.
 */
export function mix(p: WaterProfile, outra: WaterProfile | null, fracao: number): WaterProfile {
  const o = outra ?? DESTILADA
  const m = (a: number | null, b: number | null) => (a == null || b == null ? null : a * fracao + b * (1 - fracao))
  return {
    gh: m(p.gh, o.gh),
    kh: m(p.kh, o.kh),
    tds: m(p.tds, o.tds),
    sodio: m(p.sodio, o.sodio),
    cloreto: m(p.cloreto, o.cloreto),
    sulfato: m(p.sulfato, o.sulfato),
    ph: null,
    calcio: m(p.calcio, o.calcio),
    magnesio: m(p.magnesio, o.magnesio),
    tdsSource: 'MISTURA',
    ghOrigem: 'calculada para a mistura',
    khOrigem: 'calculada para a mistura',
    avisos: [],
  }
}

export function profileFrom(v: Values): WaterProfile {
  const avisos: string[] = []
  const ca = v.CALCIO
  const mg = v.MAGNESIO
  const co3 = v.CARBONATO
  const hco3Estimado = v.BICARBONATO == null && co3 == null && v.KH == null ? bicarbonatoPorBalanco(v) : null
  const hco3 = v.BICARBONATO ?? hco3Estimado ?? undefined

  let gh: number | null = null
  let ghOrigem: string | null = null
  if (v.GH != null) {
    gh = v.GH
    ghOrigem = 'medida por você'
  } else if (ca != null || mg != null) {
    gh = (ca ?? 0) * Chemistry.CA_CACO3 + (mg ?? 0) * Chemistry.MG_CACO3
    ghOrigem = `Ca ${fmt(ca ?? 0)} × 2,497 + Mg ${fmt(mg ?? 0)} × 4,118`
    if (ca == null) avisos.push('Cálcio não informado: considerei 0 na dureza.')
    if (mg == null) avisos.push('Magnésio não informado: considerei 0 na dureza.')
  }

  let kh: number | null = null
  let khOrigem: string | null = null
  if (v.KH != null) {
    kh = v.KH
    khOrigem = 'medida por você'
  } else if (hco3 != null || co3 != null) {
    kh = (hco3 ?? 0) * Chemistry.HCO3_CACO3 + (co3 ?? 0) * Chemistry.CO3_CACO3
    let s = ''
    if (hco3Estimado != null) s += `Bicarbonato estimado em ${fmt(hco3Estimado, 1)} × 0,82 (o rótulo não informa)`
    else if (hco3 != null) s += `Bicarbonato ${fmt(hco3)} × 0,82`
    if (hco3 != null && co3 != null && co3 > 0) s += ' + '
    if (co3 != null && co3 > 0) s += `Carbonato ${fmt(co3)} × 1,67`
    khOrigem = s
  }

  const ions: Field[] = ['CARBONATO', 'CALCIO', 'MAGNESIO', 'SODIO', 'POTASSIO', 'SULFATO', 'CLORETO', 'NITRATO', 'FLUORETO']
  let tds: number | null = null
  let tdsSource: TdsSource | null = null
  if (v.TDS != null) [tds, tdsSource] = [v.TDS, 'MEDIDO']
  else if (v.RESIDUO != null) [tds, tdsSource] = [v.RESIDUO, 'RESIDUO']
  else if (v.CONDUTIVIDADE != null) [tds, tdsSource] = [v.CONDUTIVIDADE * Chemistry.TDS_POR_US, 'CONDUTIVIDADE']
  else if (ca != null && mg != null && hco3 != null) {
    tds = ions.reduce((s, f) => s + (v[f] ?? 0), 0) + hco3 * Chemistry.HCO3_NO_RESIDUO
    tdsSource = 'IONS'
  }

  if (hco3Estimado != null) {
    avisos.push(
      `O rótulo não informa bicarbonato. Estimei ~${fmt(hco3Estimado, 1)} mg/L pelo equilíbrio ` +
        'entre cátions e ânions; se tiver o valor real, preencha que fica mais preciso.',
    )
  }

  return {
    gh, kh, tds,
    sodio: v.SODIO ?? null,
    cloreto: v.CLORETO ?? null,
    sulfato: v.SULFATO ?? null,
    ph: v.PH ?? null,
    calcio: ca ?? null,
    magnesio: mg ?? null,
    tdsSource, ghOrigem, khOrigem, avisos,
  }
}
