// Sobe a API local (porta 8787) e o site (porta 5173) juntos; Ctrl+C encerra os dois.
import { spawn } from 'node:child_process'

const processos = ['dev:api', 'dev:site'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit', shell: true }),
)

const encerrar = () => {
  for (const p of processos) p.kill()
  process.exit()
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
for (const p of processos) p.on('exit', (codigo) => codigo && encerrar())
