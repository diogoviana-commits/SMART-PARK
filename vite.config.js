import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Em desenvolvimento, /api vai para a API local (npm run dev:api, porta 8787).
// Publicado, site e API ficam no mesmo domínio da Vercel, sem encaminhamento.
//
// O site é um PWA: o celular oferece "Instalar app" / "Adicionar à Tela de
// Início", e ele abre em tela cheia, com ícone próprio. O service worker guarda o
// app, a rede de trilhas (a rota funciona sem sinal) e as últimas consultas.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icones/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Smart Park · Espaço Verde Chico Mendes',
        short_name: 'Smart Park',
        description:
          'Mapa interativo do Espaço Verde Chico Mendes: banheiros, quadras, lanchonetes, rotas a pé, agenda, missões e comunidade.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F2A1E',
        theme_color: '#0F2A1E',
        categories: ['travel', 'navigation', 'lifestyle'],
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Consultas abertas: a mais nova quando há sinal, a última guardada sem sinal.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /^\/api\/(pois|categorias|eventos|avisos|missoes)(\/|$|\?)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'consultas-do-parque',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
          {
            // Blocos do mapa que a pessoa já viu. Baixar o mapa em massa é proibido
            // pela política do OpenStreetMap; guardar o que foi visto, não.
            urlPattern: /^https:\/\/[a-c]?\.?tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-do-parque',
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
