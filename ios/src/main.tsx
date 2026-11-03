import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import './styles.css'

// Versão nova publicada: o service worker troca sozinho e a próxima abertura já vem atualizada
registerSW({ immediate: true })

render(<App />, document.getElementById('app')!)
