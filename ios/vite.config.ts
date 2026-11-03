import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Publicado em https://luisfelipe210.github.io/brewater/
const base = process.env.BASE ?? '/brewater/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/icon.svg'],
      manifest: {
        name: 'Brewater',
        short_name: 'Brewater',
        description: 'Descubra se a água mineral serve para café especial',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1E120C',
        theme_color: '#1E120C',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // O OCR (Tesseract + modelo em português) também fica guardado: funciona sem internet
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}', 'ocr/*'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
