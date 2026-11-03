# Brewater para iPhone (PWA)

A mesma avaliação do app Android, como site que vira app na tela de início do iPhone.

**Instalar:** abra https://luisfelipe210.github.io/brewater/ no Safari → Compartilhar → **Adicionar à Tela de Início**.

- Funciona offline depois da primeira abertura, inclusive o OCR.
- As águas e as fotos ficam no próprio iPhone (IndexedDB). Use pelo ícone da tela de início: o Safari e o app instalado guardam dados separados.
- Atualiza sozinho: cada push em `ios/` publica pelo GitHub Actions e o app pega a versão nova na próxima abertura.

## Leitura do rótulo

- **Foto:** Tesseract (WebAssembly) com o modelo de português, rodando no aparelho. Os arquivos ficam em `public/ocr/`, copiados de `node_modules` por `scripts/copy-ocr.mjs`.
- **Colar texto:** o Safari não deixa sites usarem o OCR do iPhone, mas dá para copiar a tabela com o Texto ao Vivo (no Fotos, na Câmera ou tocando e segurando na própria foto dentro do app) e colar.
- O parser (`src/ocr/parser.ts`) e a química (`src/domain/`) são portes diretos do Kotlin, com os mesmos testes.

## Desenvolver

```bash
npm install
npm run dev
npm test
```
