// Liga os ganchos do Git versionados em .githooks/ (roda no `npm install`).
// Na Vercel e em qualquer lugar sem repositório Git, não faz nada.
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (!process.env.VERCEL && !process.env.CI && existsSync('.git')) {
  try {
    execSync('git config core.hooksPath .githooks', { stdio: 'ignore' })
  } catch {
    // Sem Git instalado: os ganchos ficam desligados, e `npm run verificar` continua valendo.
  }
}
