import { BlockFooter, BlockTitle, Block, Icon, Link, List, ListButton, ListInput, Navbar, NavLeft, NavRight, NavTitle, Page, Popup } from 'framework7-react'
import { useState } from 'react'

/** Texto copiado com o Texto ao Vivo do iPhone (Fotos, Câmera ou a própria foto no app). */
export function Paste(props: { onUse: (t: string) => void; onClose: () => void }) {
  const [opened, setOpened] = useState(true)
  const [text, setText] = useState('')
  const [erro, setErro] = useState('')

  async function colar() {
    try {
      setText(await navigator.clipboard.readText())
      setErro('')
    } catch {
      setErro('Não deu para ler a área de transferência. Toque e segure na caixa de texto e escolha Colar.')
    }
  }

  return (
    <Popup opened={opened} push swipeToClose onPopupClosed={props.onClose} className="paste">
      <Page>
        <Navbar>
          <NavLeft><Link onClick={() => setOpened(false)}>Cancelar</Link></NavLeft>
          <NavTitle>Colar texto</NavTitle>
          <NavRight>
            <Link className={text.trim() ? 'save' : 'disabled'} onClick={() => { props.onUse(text); setOpened(false) }}>Usar</Link>
          </NavRight>
        </Navbar>

        <BlockTitle>Copie a tabela com o iPhone</BlockTitle>
        <Block strong inset>
          <ol className="steps">
            <li>Abra a foto do rótulo no app Fotos, ou aponte a Câmera para a tabela.</li>
            <li>Toque e segure no texto, escolha <b>Selecionar Tudo</b> e depois <b>Copiar</b>.</li>
            <li>Volte aqui e toque em <b>Colar</b>.</li>
          </ol>
        </Block>
        <List strong inset>
          <ListButton onClick={colar}><Icon aria-hidden="true" f7="doc_on_clipboard" />Colar</ListButton>
        </List>

        <BlockTitle>Texto</BlockTitle>
        <List strong inset>
          <ListInput
            type="textarea"
            className="paste-box"
            placeholder={'Cálcio 8,345\nMagnésio 2,10\nBicarbonato 45,20'}
            value={text}
            onInput={(ev) => setText(ev.target.value)}
          />
        </List>
        <BlockFooter className={erro ? 'error' : undefined}>
          {erro || 'Pode editar antes de usar. O app procura cada mineral e o número ao lado.'}
        </BlockFooter>
      </Page>
    </Popup>
  )
}
