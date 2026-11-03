import { App, f7, View } from 'framework7-react'
import { useEffect } from 'react'
import { load, useApp } from './state'
import { Editor } from './ui/Editor'
import { Home } from './ui/Home'
import { Result } from './ui/Result'

const routes = [
  { path: '/', component: Home },
  { path: '/agua/:id/', component: Result },
]

export function Brewater() {
  const editing = useApp((s) => s.editing)

  useEffect(() => {
    load().catch((e: Error) => f7.toast.create({ text: e.message, closeTimeout: 3500 }).open())
  }, [])

  return (
    <App theme="ios" darkMode="auto" colors={{ primary: '#B85F27' }} routes={routes} touch={{ tapHold: false }}>
      <View main url="/" iosSwipeBack browserHistory={false} />
      {editing && <Editor key={editing.original?.id ?? `nova-${Date.now()}`} editing={editing} />}
    </App>
  )
}
