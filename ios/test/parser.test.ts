import { describe, expect, it } from 'vitest'
import { parse, parseText, type OcrLine } from '../src/ocr/parser'
import { DAVILA, PETROPOLIS } from './fixtures'

/** Uma linha por item, uma embaixo da outra. */
const linhas = (...textos: string[]): OcrLine[] =>
  textos.map((t, i) => ({ text: t, left: 0, top: i * 40, right: t.length * 12, bottom: i * 40 + 30 }))

/** Embaralha de forma determinística, como o Random(1) do teste Android. */
function embaralhar<T>(xs: T[]): T[] {
  let seed = 1
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return xs.map((x) => [rnd(), x] as const).sort((a, b) => a[0] - b[0]).map((p) => p[1])
}

describe('leitura do rótulo', () => {
  it('rótulo com valores na mesma linha', () => {
    const v = parse(
      linhas(
        'COMPOSIÇÃO QUÍMICA (mg/L)',
        'Bicarbonato (HCO3-) ........ 45,20',
        'Cálcio ......................... 8,345',
        'Magnésio...................2,10',
        'Sódio  5,4  mg/L',
        'Potássio 1,12',
        'Sulfato 0,85 Cloreto 1,30',
        'Nitrato < 0,01',
        'Estrôncio 0,045',
        'CARACTERÍSTICAS FÍSICO-QUÍMICAS',
        'pH a 25°C ................ 7,45',
        'Temperatura da água na fonte 22,3°C',
        'Condutividade elétrica a 25 ºC 125,3 µS/cm',
        'Resíduo de evaporação a 180°C, calculado ..... 95,26 mg/L',
      ),
    ).values
    expect(v).toEqual({
      BICARBONATO: 45.2, CALCIO: 8.345, MAGNESIO: 2.1, SODIO: 5.4, POTASSIO: 1.12, SULFATO: 0.85,
      CLORETO: 1.3, NITRATO: 0.01, PH: 7.45, CONDUTIVIDADE: 125.3, RESIDUO: 95.26,
    })
  })

  it('OCR sem acento e sem grau', () => {
    const v = parse(linhas('Calcio 12.5', 'rnagnesio 3,2', 'pH a 25 C 6,8', 'Condutividade eletrica a 25 C 98')).values
    expect(v).toEqual({ CALCIO: 12.5, MAGNESIO: 3.2, PH: 6.8, CONDUTIVIDADE: 98 })
  })

  it('tabela em duas colunas', () => {
    const nomes = ['Bicarbonato', 'Cálcio', 'Magnésio', 'Sódio']
    const valores = ['60,1', '15,3', '4,8', '3,9']
    const lines = [
      ...nomes.map((n, i) => ({ text: n, left: 10, top: 100 + i * 50, right: 200, bottom: 135 + i * 50 })),
      ...valores.map((n, i) => ({ text: `${n} mg/L`, left: 400, top: 102 + i * 50, right: 520, bottom: 137 + i * 50 })),
    ]
    expect(parse(embaralhar(lines)).values).toEqual({ BICARBONATO: 60.1, CALCIO: 15.3, MAGNESIO: 4.8, SODIO: 3.9 })
  })

  it('tabela horizontal com nomes em cima e valores embaixo', () => {
    const cab: OcrLine = {
      text: 'Cálcio Magnésio Sódio', left: 0, top: 0, right: 600, bottom: 30,
      words: [
        { text: 'Cálcio', left: 0, top: 0, right: 150, bottom: 30 },
        { text: 'Magnésio', left: 220, top: 0, right: 400, bottom: 30 },
        { text: 'Sódio', left: 470, top: 0, right: 600, bottom: 30 },
      ],
    }
    const vals: OcrLine = {
      text: '9,87 2,30 1,05', left: 0, top: 40, right: 600, bottom: 70,
      words: [
        { text: '9,87', left: 30, top: 40, right: 120, bottom: 70 },
        { text: '2,30', left: 260, top: 40, right: 350, bottom: 70 },
        { text: '1,05', left: 490, top: 40, right: 580, bottom: 70 },
      ],
    }
    expect(parse([cab, vals]).values).toEqual({ CALCIO: 9.87, MAGNESIO: 2.3, SODIO: 1.05 })
  })

  it('condutividade em notação científica', () => {
    expect(parse(linhas('Condutividade elétrica a 25°C: 1,52 x 10² µS/cm')).values.CONDUTIVIDADE).toBeCloseTo(152, 6)
  })

  it('classificação não vira valor', () => {
    const v = parse(linhas('Classificação: Água mineral fluoretada, alcalino-bicarbonatada, cálcica', 'Cálcio 7,7')).values
    expect(v).toEqual({ CALCIO: 7.7 })
  })

  it('fonte', () => {
    const lines: OcrLine[] = [
      { text: 'PEDRA AZUL', left: 0, top: 0, right: 400, bottom: 90 },
      { text: 'Água mineral natural sem gás', left: 0, top: 100, right: 400, bottom: 130 },
      { text: 'Fonte: Bica da Serra - Vale/MG', left: 0, top: 140, right: 400, bottom: 170 },
      { text: 'Cálcio 4,2', left: 0, top: 180, right: 400, bottom: 210 },
      { text: 'Magnésio 1,1', left: 0, top: 220, right: 400, bottom: 250 },
    ]
    expect(parse(lines).source).toBe('Bica da Serra - Vale/MG')
    expect(parse(linhas('FONTE BICA DA SERRA.')).source).toBe('BICA DA SERRA')
  })
})

describe('rótulos reais', () => {
  it('Petrópolis, garrafa curva, tabela em 4 colunas', () => {
    const v = parse(PETROPOLIS).values
    expect(v.CLORETO).toBeCloseTo(11.37, 6)
    expect(v.SODIO).toBeCloseTo(6.652, 6)
    expect(v.SULFATO).toBeCloseTo(2.22, 6)
    expect(v.BICARBONATO).toBeCloseTo(1.96, 6)
    expect(v.MAGNESIO).toBeCloseTo(0.956, 6)
    expect(v.CALCIO).toBeCloseTo(0.477, 6)
    // No rótulo é 1,225; o OCR leu "1,25"
    expect(v.POTASSIO).toBeCloseTo(1.25, 6)
    // "1,06" virou "106": acima do limite legal de nitrato, melhor deixar em branco
    expect(v.NITRATO).toBeUndefined()
    // O resíduo está cortado na foto: não pode pegar o "12" de "12 meses"
    expect(v.RESIDUO).toBeUndefined()
  })

  it("Dias d'Ávila, duas colunas, sem bicarbonato", () => {
    const r = parse(DAVILA)
    expect(r.values).toEqual({
      NITRATO: 18, CLORETO: 15.19, SODIO: 13.493, SULFATO: 4.82,
      CALCIO: 2.333, MAGNESIO: 2.21, POTASSIO: 0.971, FLUORETO: 0.01,
    })
    expect(r.source).toBe("SENHOR DO BONFIM - DIAS D'ÂVILA/BA")
  })
})

describe('texto colado do iPhone', () => {
  it('um item por linha', () => {
    const v = parseText('Composição química (mg/L)\nCálcio 8,345\nMagnésio 2,10\nBicarbonato 45,20\npH a 25°C 7,45').values
    expect(v).toEqual({ CALCIO: 8.345, MAGNESIO: 2.1, BICARBONATO: 45.2, PH: 7.45 })
  })

  it('coluna de nomes seguida da coluna de valores', () => {
    const v = parseText('Cálcio\nMagnésio\nSódio\nBicarbonato\n2,333\n2,210\n13,493\n31,5').values
    expect(v).toEqual({ CALCIO: 2.333, MAGNESIO: 2.21, SODIO: 13.493, BICARBONATO: 31.5 })
  })
})

describe('Tesseract', () => {
  it('modo automático, tabela em duas colunas com pontilhado', () => {
    // Saída real do Tesseract (por, LSTM, PSM 3) para um rótulo sintético
    const t: [string, number, number, number, number][] = [
      ['COMPOSIÇÃO QUÍMICA (mg/L)', 92, 69, 741, 120],
      ['Bicarbonato                                    38,52', 113, 173, 758, 205],
      ['Cálcio                                             9,871', 112, 234, 752, 267],
      ['Magnésio                   3,214', 113, 292, 759, 337],
      ['Sódio                                                4,05', 112, 358, 758, 391],
      ['Potássio                                            1,62', 113, 420, 758, 453],
      ['Sulfato                                              0,85', 112, 482, 758, 515],
      ['Cloreto                                              2,11', 112, 544, 752, 577],
      ['pH a 25ºC ......... 7,35', 112, 655, 438, 687],
      ['Resíduo de evaporação a 180ºC ..... 68,40', 113, 714, 774, 748],
      ['Fonte: Bica do Vale - Lindóia/SP', 113, 794, 628, 821],
    ]
    const r = parse(t.map(([text, left, top, right, bottom]) => ({ text, left, top, right, bottom })))
    expect(r.values).toEqual({
      BICARBONATO: 38.52, CALCIO: 9.871, MAGNESIO: 3.214, SODIO: 4.05, POTASSIO: 1.62,
      SULFATO: 0.85, CLORETO: 2.11, PH: 7.35, RESIDUO: 68.4,
    })
    expect(r.source).toBe('Bica do Vale - Lindóia/SP')
  })
})
