/** 1234.5 → "1234,5"; até [casas] decimais, sem zeros sobrando. */
export function fmt(v: number, casas = 2): string {
  const f = 10 ** Math.max(casas, 0)
  // Arredonda metade para cima, como o HALF_UP do Android (o toFixed erra em 1,005)
  const r = Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9) / f
  return String(r === 0 ? 0 : r).replace('.', ',')
}

/** Aceita "8,35", "8.35", " 8 " e devolve null para texto inválido ou vazio. */
export function parseNumber(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null
  return Number(t)
}
