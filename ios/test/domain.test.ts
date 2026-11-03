import { describe, expect, it } from 'vitest'
import { evaluate } from '../src/domain/evaluator'
import { fmt, parseNumber } from '../src/domain/format'
import { melhorDiluicao, melhorMistura, percentual, precisaMineralizar } from '../src/domain/improvements'
import { profileFrom } from '../src/domain/profile'
import type { Values, WaterLabel } from '../src/model'

const avaliar = (v: Values) => evaluate(profileFrom(v))
const label = (id: string, brand: string, values: Values): WaterLabel =>
  ({ id, brand, source: '', notes: '', values, createdAt: 0 })

describe('avaliação', () => {
  it('conversões para CaCO3', () => {
    const p = profileFrom({ CALCIO: 20, MAGNESIO: 5, BICARBONATO: 50 })
    expect(p.gh!).toBeCloseTo(70.53, 2)
    expect(p.kh!).toBeCloseTo(41.01, 2)
    // Sem resíduo nem condutividade: soma dos íons, descontando o que o bicarbonato perde a 180 °C.
    expect(p.tdsSource).toBe('IONS')
    expect(p.tds!).toBeCloseTo(20 + 5 + 50 * 0.4918, 2)
  })

  it('água equilibrada é excelente', () => {
    const e = avaliar({ CALCIO: 22, MAGNESIO: 6, BICARBONATO: 55, SODIO: 5, PH: 7.1, RESIDUO: 140 })
    expect(e.verdict).toBe('EXCELENTE')
    expect(e.results.every((r) => r.status === 'IDEAL')).toBe(true)
  })

  it('água muito leve não é recomendada e pede mineralização', () => {
    const e = avaliar({ CALCIO: 1.5, MAGNESIO: 0.6, BICARBONATO: 8, SODIO: 2, PH: 5.4, RESIDUO: 22 })
    expect(e.score!).toBeLessThan(50)
    expect(e.verdict).toBe('RUIM')
    expect(precisaMineralizar(e.profile)).toBe(true)
    expect(melhorDiluicao(e.profile)).toBeNull()
  })

  it('água dura fica no máximo regular e sugere diluição', () => {
    const e = avaliar({ CALCIO: 70, MAGNESIO: 20, BICARBONATO: 260, SODIO: 8, PH: 7.6, RESIDUO: 320 })
    expect(e.score!).toBeLessThanOrEqual(69)
    const d = melhorDiluicao(e.profile)!
    expect(d).not.toBeNull()
    expect(percentual(d)).toBeGreaterThanOrEqual(15)
    expect(percentual(d)).toBeLessThanOrEqual(40)
    expect(d.nota).toBeGreaterThanOrEqual(80)
  })

  it('mistura de duas águas cadastradas', () => {
    const leve = label('a', 'Leve', { CALCIO: 2, MAGNESIO: 1, BICARBONATO: 10, RESIDUO: 30 })
    const dura = label('b', 'Dura', { CALCIO: 60, MAGNESIO: 18, BICARBONATO: 200, RESIDUO: 280 })
    const m = melhorMistura(leve, profileFrom(leve.values), [leve, dura])!
    expect(m.parceira!.id).toBe('b')
    expect(m.nota).toBeGreaterThanOrEqual(80)
  })

  it('sem bicarbonato no rótulo estima pelo balanço de cargas', () => {
    // Dias d'Ávila: cátions 0,910 meq/L, ânions 0,820 meq/L → ~5,5 mg/L de bicarbonato
    const p = profileFrom({
      NITRATO: 18, CLORETO: 15.19, SODIO: 13.493, SULFATO: 4.82,
      CALCIO: 2.333, MAGNESIO: 2.21, POTASSIO: 0.971, FLUORETO: 0.01,
    })
    expect(Math.abs(p.kh! / 0.8202 - 5.5)).toBeLessThan(0.3)
    expect(p.avisos.some((a) => a.includes('bicarbonato'))).toBe(true)
    expect(evaluate(p).verdict).toBe('RUIM')
  })

  it('sem bicarbonato faltam dados', () => {
    const e = avaliar({ CALCIO: 20, MAGNESIO: 5 })
    expect(e.score).toBeNull()
    expect(e.verdict).toBe('INSUFICIENTE')
  })

  it('medição direta tem prioridade sobre o rótulo', () => {
    const p = profileFrom({ CALCIO: 20, MAGNESIO: 5, GH: 90, TDS: 130, RESIDUO: 80 })
    expect(p.gh).toBe(90)
    expect(p.tds).toBe(130)
    expect(p.tdsSource).toBe('MEDIDO')
  })
})

describe('formatação', () => {
  it('vírgula decimal e sem zeros sobrando', () => {
    expect(fmt(1234.5)).toBe('1234,5')
    expect(fmt(2.0)).toBe('2')
    expect(fmt(1.005, 2)).toBe('1,01')
    expect(fmt(5.4999, 1)).toBe('5,5')
  })

  it('lê número digitado', () => {
    expect(parseNumber('8,35')).toBe(8.35)
    expect(parseNumber(' 8 ')).toBe(8)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})
