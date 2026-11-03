import { openEditor } from '../state'

/*
 * Os seletores de foto ficam fora de qualquer tela: o iOS só abre a câmera a partir de um toque,
 * então o clique no input precisa acontecer no mesmo evento do botão.
 */
const inputs: Partial<Record<'camera' | 'library', HTMLInputElement>> = {}

function input(kind: 'camera' | 'library') {
  let el = inputs[kind]
  if (el) return el
  el = document.createElement('input')
  el.type = 'file'
  el.accept = 'image/*'
  if (kind === 'camera') el.setAttribute('capture', 'environment')
  el.className = 'sr-only'
  el.addEventListener('change', () => {
    const f = el!.files?.[0]
    el!.value = ''
    if (f) openEditor({ original: null, photo: f })
  })
  document.body.appendChild(el)
  return (inputs[kind] = el)
}

export const pickPhoto = (kind: 'camera' | 'library') => input(kind).click()
