// Confere o projeto antes de publicar: tipos, testes da API e compilação do site.
//
//   npm run verificar
//
// Roda sozinho antes de todo `git push` (gancho em .githooks/pre-push). A Vercel
// publica direto da main, então um commit quebrado iria para o ar sem aviso; aqui
// o push é recusado quando algo falha. Numa emergência: git push --no-verify.
import { spawnSync } from 'node:child_process'

// No Windows, com a letra da unidade minúscula (c:\...), o Vitest carrega duas
// cópias de si mesmo e falha antes de começar.
if (process.platform === 'win32') {
  const pasta = process.cwd()
  process.chdir(pasta[0].toUpperCase() + pasta.slice(1))
}

const ETAPAS = [
  ['Conferir os tipos', 'tipos'],
  ['Testes da API', 'test'],
  ['Compilar o site', 'build'],
]

for (const [titulo, script] of ETAPAS) {
  console.log(`\n=== ${titulo} (npm run ${script}) ===`)
  const r = spawnSync('npm', ['run', '--silent', script], { stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error(`\n[falhou] ${titulo}. Nada foi enviado.`)
    process.exit(1)
  }
}
console.log('\n[ok] Tipos, testes e compilação passaram.')
