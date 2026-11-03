/** Campos que aparecem no rótulo de água mineral brasileira (ou medidos por você). */
export type Field =
  | 'BICARBONATO' | 'CALCIO' | 'MAGNESIO' | 'SODIO' | 'POTASSIO' | 'SULFATO' | 'CLORETO'
  | 'NITRATO' | 'FLUORETO' | 'CARBONATO' | 'PH' | 'CONDUTIVIDADE' | 'RESIDUO' | 'GH' | 'KH' | 'TDS'

export type Group = 'IONS' | 'FISICO' | 'MEDIDO'

export const FIELDS: Record<Field, { label: string; unit: string; group: Group }> = {
  BICARBONATO: { label: 'Bicarbonato', unit: 'mg/L', group: 'IONS' },
  CALCIO: { label: 'Cálcio', unit: 'mg/L', group: 'IONS' },
  MAGNESIO: { label: 'Magnésio', unit: 'mg/L', group: 'IONS' },
  SODIO: { label: 'Sódio', unit: 'mg/L', group: 'IONS' },
  POTASSIO: { label: 'Potássio', unit: 'mg/L', group: 'IONS' },
  SULFATO: { label: 'Sulfato', unit: 'mg/L', group: 'IONS' },
  CLORETO: { label: 'Cloreto', unit: 'mg/L', group: 'IONS' },
  NITRATO: { label: 'Nitrato', unit: 'mg/L', group: 'IONS' },
  FLUORETO: { label: 'Fluoreto', unit: 'mg/L', group: 'IONS' },
  CARBONATO: { label: 'Carbonato', unit: 'mg/L', group: 'IONS' },
  PH: { label: 'pH a 25 °C', unit: '', group: 'FISICO' },
  CONDUTIVIDADE: { label: 'Condutividade', unit: 'µS/cm', group: 'FISICO' },
  RESIDUO: { label: 'Resíduo a 180 °C', unit: 'mg/L', group: 'FISICO' },
  GH: { label: 'Dureza (GH)', unit: 'mg/L CaCO₃', group: 'MEDIDO' },
  KH: { label: 'Alcalinidade (KH)', unit: 'mg/L CaCO₃', group: 'MEDIDO' },
  TDS: { label: 'TDS (medidor)', unit: 'ppm', group: 'MEDIDO' },
}

export const FIELD_ORDER = Object.keys(FIELDS) as Field[]

export const GROUPS: Record<Group, { title: string; hint?: string }> = {
  IONS: { title: 'Composição química', hint: 'Valores em mg/L, como no rótulo' },
  FISICO: { title: 'Características físico-químicas' },
  MEDIDO: {
    title: 'Medições diretas (opcional)',
    hint: 'Se você mediu com kit ou medidor de TDS, esses valores têm prioridade sobre o rótulo',
  },
}

export type Values = Partial<Record<Field, number>>

export interface WaterLabel {
  id: string
  brand: string
  source: string
  notes: string
  values: Values
  /** Chave da foto no IndexedDB */
  photoId?: string
  createdAt: number
}
