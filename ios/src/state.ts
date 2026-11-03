import { useSyncExternalStore } from 'react'
import { type Evaluation, evaluate } from './domain/evaluator'
import { profileFrom } from './domain/profile'
import type { WaterLabel } from './model'
import * as db from './store'

/** Estado do app inteiro: as águas, o formulário aberto e a última água alterada. */
export interface Editing {
  original: WaterLabel | null
  photo?: Blob
  paste?: boolean
}

interface State {
  waters: WaterLabel[]
  evals: Map<string, Evaluation>
  loaded: boolean
  editing: Editing | null
  /** Água recém-salva: a linha dela fica marcada na lista até a pessoa voltar para lá */
  changed: string | null
}

let state: State = { waters: [], evals: new Map(), loaded: false, editing: null, changed: null }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  if (patch.waters) state.evals = new Map(state.waters.map((w) => [w.id, evaluate(profileFrom(w.values))]))
  listeners.forEach((l) => l())
}

export function useApp<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => pick(state),
  )
}

export const getState = () => state

export function ranking(s: State): [WaterLabel, Evaluation][] {
  return s.waters
    .map((w) => [w, s.evals.get(w.id)!] as [WaterLabel, Evaluation])
    .sort((a, b) => (b[1].score ?? -1) - (a[1].score ?? -1))
}

export async function load() {
  try {
    const ws = await db.loadWaters()
    set({ waters: ws.sort((a, b) => a.createdAt - b.createdAt), loaded: true })
  } catch {
    set({ loaded: true })
    throw new Error('Não consegui abrir os dados salvos')
  }
  db.persist()
}

export const openEditor = (e: Editing) => set({ editing: e })
export const closeEditor = () => set({ editing: null })
export const clearChanged = () => state.changed && set({ changed: null })

export interface Saved {
  water: Omit<WaterLabel, 'id' | 'createdAt' | 'photoId'>
  /** undefined = foto não mudou; null = removida */
  photo: Blob | null | undefined
}

/** Grava e devolve o id, para o chamador abrir o resultado. */
export async function save(original: WaterLabel | null, s: Saved): Promise<string> {
  const id = original?.id ?? crypto.randomUUID()
  let photoId = original?.photoId
  if (s.photo !== undefined) {
    if (photoId) await db.deletePhoto(photoId)
    photoId = undefined
    if (s.photo) {
      photoId = crypto.randomUUID()
      await db.putPhoto(photoId, await db.shrink(s.photo, 1600, 0.8))
    }
  }
  const w: WaterLabel = { ...s.water, id, photoId, createdAt: original?.createdAt ?? Date.now() }
  await db.putWater(w)
  set({
    waters: original ? state.waters.map((x) => (x.id === id ? w : x)) : [...state.waters, w],
    changed: id,
  })
  return id
}

export async function remove(id: string) {
  const w = state.waters.find((x) => x.id === id)
  if (!w) return
  await db.deleteWater(id)
  if (w.photoId) await db.deletePhoto(w.photoId).catch(() => {})
  set({ waters: state.waters.filter((x) => x.id !== id) })
}
