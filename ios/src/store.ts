import type { WaterLabel } from './model'

/** Tudo fica no aparelho, no IndexedDB do Safari: as águas e as fotos dos rótulos. */
const DB = 'brewater'
let db: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('waters', { keyPath: 'id' })
      req.result.createObjectStore('photos')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return db
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await open()
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const loadWaters = () => run<WaterLabel[]>('waters', 'readonly', (s) => s.getAll())
export const putWater = (w: WaterLabel) => run('waters', 'readwrite', (s) => s.put(w))
export const deleteWater = (id: string) => run('waters', 'readwrite', (s) => s.delete(id))

export const getPhoto = (id: string) => run<Blob | undefined>('photos', 'readonly', (s) => s.get(id))
export const putPhoto = (id: string, b: Blob) => run('photos', 'readwrite', (s) => s.put(b, id))
export const deletePhoto = (id: string) => run('photos', 'readwrite', (s) => s.delete(id))

/** Pede ao Safari para não apagar os dados quando faltar espaço. */
export function persist() {
  navigator.storage?.persist?.().catch(() => {})
}

/** Reduz a foto (a do iPhone tem 12 MP) e já corrige a rotação. */
export async function shrink(file: Blob, max = 2000, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não consegui processar a foto'))), 'image/jpeg', quality),
  )
}
