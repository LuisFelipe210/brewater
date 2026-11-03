import Framework7 from 'framework7/lite'
import Accordion from 'framework7/components/accordion'
import Actions from 'framework7/components/actions'
import Input from 'framework7/components/input'
import Popup from 'framework7/components/popup'
import Preloader from 'framework7/components/preloader'
import Toast from 'framework7/components/toast'
import Framework7React from 'framework7-react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import 'framework7/css'
import 'framework7/components/accordion/css'
import 'framework7/components/actions/css'
import 'framework7/components/input/css'
import 'framework7/components/popup/css'
import 'framework7/components/preloader/css'
import 'framework7/components/toast/css'
import 'framework7-icons/css/framework7-icons.css'
import { Brewater } from './app'
import './styles.css'

// Só os componentes usados: o pacote completo passa de 1 MB
Framework7.use([Accordion, Actions, Input, Popup, Preloader, Toast, Framework7React])

// Versão nova publicada: o service worker troca sozinho e a próxima abertura já vem atualizada
registerSW({ immediate: true })

createRoot(document.getElementById('app')!).render(<Brewater />)
