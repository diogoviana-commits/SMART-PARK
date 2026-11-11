import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento, /api vai para a API local (npm run dev:api, porta 8787).
// Publicado, site e API ficam no mesmo domínio da Vercel, sem encaminhamento.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
