import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// As chamadas para /api sao encaminhadas ao Spring Boot, o que evita CORS em dev
// e mantem o mesmo caminho relativo quando o front for servido junto da API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
