import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { evaluate } from './domain/evaluator'
import { profileFrom } from './domain/profile'
import type { WaterLabel } from './model'
import * as store from './store'
import { Edit, type Saved } from './ui/Edit'
import { Home } from './ui/Home'
import { Camera, Clipboard, Keyboard, Photo } from './ui/icons'
import { ActionSheet, Toast } from './ui/parts'
import { Result } from './ui/Result'

type Screen = { kind: 'home' } | { kind: 'result'; id: string }
type Editing = { original: WaterLabel | null; photo?: Blob; paste?: boolean }
type Anim = { kind: 'push' } | { kind: 'pop'; leaving: Screen } | null

const PUSH_MS = 420
const POP_MS = 360

export function App() {
  const [waters, setWaters] = useState<WaterLabel[]>([])
  const [loaded, setLoaded] = useState(false)
  const [stack, setStack] = useState<Screen[]>([{ kind: 'home' }])
  const [anim, setAnim] = useState<Anim>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)

  useEffect(() => {
    store.loadWaters()
      .then((ws) => setWaters(ws.sort((a, b) => a.createdAt - b.createdAt)))
      .catch(() => setToast('Não consegui abrir os dados salvos'))
      .finally(() => setLoaded(true))
    store.persist()
  }, [])

  // Voltar do sistema (gesto do Android, botão do navegador) desempilha uma tela
  const stackRef = useRef(stack)
  stackRef.current = stack
  useEffect(() => {
    const onPop = () => {
      const s = stackRef.current
      if (s.length > 1) pop()
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const evals = useMemo(() => new Map(waters.map((w) => [w.id, evaluate(profileFrom(w.values))])), [waters])
  const ranking = useMemo(
    () => waters.map((w) => [w, evals.get(w.id)!] as const).sort((a, b) => (b[1].score ?? -1) - (a[1].score ?? -1)),
    [waters, evals],
  )

  function push(s: Screen) {
    history.pushState({ depth: stack.length }, '')
    setStack((st) => [...st, s])
    setAnim({ kind: 'push' })
    setTimeout(() => setAnim(null), PUSH_MS)
  }

  function pop() {
    const s = stackRef.current
    if (s.length < 2) return
    setStack(s.slice(0, -1))
    setAnim({ kind: 'pop', leaving: s[s.length - 1] })
    setTimeout(() => setAnim(null), POP_MS)
  }

  const back = () => history.back()

  function open(id: string) {
    const top = stack[stack.length - 1]
    if (top.kind === 'result' && top.id === id) return
    push({ kind: 'result', id })
  }

  function foto(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const f = input.files?.[0]
    input.value = ''
    if (f) setEditing({ original: null, photo: f })
  }

  async function save(s: Saved) {
    const o = editing!.original
    const id = o?.id ?? crypto.randomUUID()
    let photoId = o?.photoId
    try {
      if (s.photo !== undefined) {
        if (photoId) await store.deletePhoto(photoId)
        photoId = undefined
        if (s.photo) {
          photoId = crypto.randomUUID()
          await store.putPhoto(photoId, await store.shrink(s.photo, 1600, 0.8))
        }
      }
      const w: WaterLabel = { ...s.water, id, photoId, createdAt: o?.createdAt ?? Date.now() }
      await store.putWater(w)
      setWaters((ws) => (o ? ws.map((x) => (x.id === id ? w : x)) : [...ws, w]))
      setEditing(null)
      if (!o) push({ kind: 'result', id })
    } catch (err) {
      setToast(`Não consegui salvar: ${err instanceof Error ? err.message : err}`)
    }
  }

  async function remove(id: string) {
    const w = waters.find((x) => x.id === id)
    if (!w) return
    await store.deleteWater(id)
    if (w.photoId) await store.deletePhoto(w.photoId).catch(() => {})
    back()
    setTimeout(() => setWaters((ws) => ws.filter((x) => x.id !== id)), POP_MS)
  }

  function render(s: Screen) {
    if (s.kind === 'home') {
      return (
        <Home
          waters={ranking as [WaterLabel, ReturnType<typeof evaluate>][]}
          loaded={loaded}
          onOpen={open}
          onAdd={() => setAdding(true)}
          onCamera={() => camera.current?.click()}
          onLibrary={() => library.current?.click()}
          onManual={() => setEditing({ original: null })}
        />
      )
    }
    const w = waters.find((x) => x.id === s.id)
    if (!w) return null
    return (
      <Result
        water={w}
        eval={evals.get(w.id)!}
        all={waters}
        onBack={back}
        onEdit={() => setEditing({ original: w })}
        onDelete={() => remove(w.id)}
        onOpen={open}
      />
    )
  }

  const top = stack.length - 1
  const key = (s: Screen) => (s.kind === 'home' ? 'home' : s.id)

  return (
    <div class="stack">
      <input ref={camera} type="file" accept="image/*" capture="environment" class="sr-only" onChange={foto} />
      <input ref={library} type="file" accept="image/*" class="sr-only" onChange={foto} />

      {stack.map((s, i) => {
        // As telas de baixo continuam montadas (guardam a rolagem), só ficam escondidas
        let cls = 'screen'
        if (anim?.kind === 'push' && i === top) cls += ' push-in'
        else if (anim?.kind === 'push' && i === top - 1) cls += ' under-in'
        else if (anim?.kind === 'pop' && i === top) cls += ' under-out'
        const visible = i === top || (anim?.kind === 'push' && i === top - 1)
        return (
          <div class={cls} key={key(s)} style={{ visibility: visible ? 'visible' : 'hidden', zIndex: i }} aria-hidden={!visible}>
            {render(s)}
          </div>
        )
      })}
      {anim?.kind === 'pop' && (
        <div class="screen pop-out" key={`leaving-${key(anim.leaving)}`} style={{ zIndex: stack.length }}>
          {render(anim.leaving)}
        </div>
      )}

      {adding && (
        <ActionSheet
          title="Nova água"
          message="Fotografe a tabela de composição do rótulo"
          actions={[
            { label: 'Fotografar rótulo', icon: <Camera />, onClick: () => camera.current?.click() },
            { label: 'Escolher foto', icon: <Photo />, onClick: () => library.current?.click() },
            { label: 'Colar texto do rótulo', icon: <Clipboard />, onClick: () => setEditing({ original: null, paste: true }) },
            { label: 'Digitar valores', icon: <Keyboard />, onClick: () => setEditing({ original: null }) },
          ]}
          onClose={() => setAdding(false)}
        />
      )}

      {editing && (
        <Edit
          key={editing.original?.id ?? 'nova'}
          original={editing.original}
          photo={editing.photo}
          paste={editing.paste}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
