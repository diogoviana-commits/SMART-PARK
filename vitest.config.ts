import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['testes/**/*.test.ts'],
    environment: 'node',
    // Cada arquivo sobe o seu PostgreSQL embutido e todos rodam juntos: num
    // computador ocupado, um teste que cria dois ou tres bancos passa de 30 s.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
