import type { Worker } from 'tesseract.js'
import type { OcrLine } from './parser'

/*
 * OCR no aparelho com Tesseract (WebAssembly). Os arquivos ficam no próprio site, em /ocr/,
 * e o service worker guarda tudo: funciona offline e a foto não sai do iPhone.
 */
let worker: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  worker ??= import('tesseract.js').then(async ({ createWorker, OEM, PSM }) => {
    const base = `${import.meta.env.BASE_URL}ocr/`
    const w = await createWorker('por', OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      gzip: true,
      workerBlobURL: false,
    })
    // No modo automático a linha da tabela vem inteira ("Cálcio ..... 9,871"); no modo esparso
    // nome e valor viram blocos separados, longe demais um do outro
    await w.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: '1' })
    return w
  })
  worker.catch(() => (worker = null))
  return worker
}

/** Cinza com contraste esticado: o Tesseract erra bem menos em rótulo colorido. */
async function prepare(photo: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(photo, { imageOrientation: 'from-image' })
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const hist = new Uint32Array(256)
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    d[i] = y
    hist[d[i]]++
  }
  // Corta 1% de cada ponta para o reflexo da garrafa não achatar o resto
  const n = d.length / 4
  let lo = 0, hi = 255, acc = 0
  while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++
  acc = 0
  while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--
  const span = Math.max(hi - lo, 1)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(255, Math.max(0, ((d[i] - lo) * 255) / span))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export async function readLabel(photo: Blob, onProgress?: (p: number) => void): Promise<OcrLine[]> {
  const [w, img] = await Promise.all([getWorker(), prepare(photo)])
  const progress = setInterval(() => onProgress?.(-1), 1000)
  try {
    const { data } = await w.recognize(img, {}, { blocks: true, text: false })
    const lines: OcrLine[] = []
    for (const b of data.blocks ?? []) {
      for (const p of b.paragraphs) {
        for (const l of p.lines) {
          const text = l.text.trim()
          if (!text) continue
          lines.push({
            text,
            left: l.bbox.x0, top: l.bbox.y0, right: l.bbox.x1, bottom: l.bbox.y1,
            words: l.words.map((wd) => ({ text: wd.text, left: wd.bbox.x0, top: wd.bbox.y0, right: wd.bbox.x1, bottom: wd.bbox.y1 })),
          })
        }
      }
    }
    return lines
  } finally {
    clearInterval(progress)
  }
}
