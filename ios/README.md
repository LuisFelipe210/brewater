# Brewater pro iPhone

Mesma coisa do app Android, só que como site que vira app. Abre https://luisfelipe210.github.io/brewater/ no Safari, Compartilhar, "Adicionar à Tela de Início".

Usa sempre pelo ícone: o Safari e o app instalado guardam dados separados, e as águas ficam só no aparelho.

O OCR roda no próprio iPhone com Tesseract, que lê pior que o do Android em rótulo de garrafa. Quando ele erra, dá pra copiar a tabela com o Texto ao Vivo do iPhone (segura o dedo no texto da foto) e colar no app.

A química e o parser são cópia do código Kotlin, com os mesmos testes. Se mudar um, muda o outro.

```bash
npm install
npm run dev
npm test
```

Todo push que mexe em `ios/` publica sozinho no GitHub Pages.
