/**
 * Backup do banco publicado (Neon), gravado neste computador.
 *
 *   npm run backup                                  gera um backup
 *   npm run backup -- --restaurar ARQUIVO --confirmar   restaura no banco de DATABASE_URL
 *
 * Gerar: usa DATABASE_URL, se definida; senão pede o endereço ao CLI do Neon
 * (precisa ter feito `npx neonctl auth` uma vez). Nenhum endereço ou senha fica
 * gravado. Os arquivos vão para a pasta de SMARTPARK_PASTA_BACKUP ou, sem ela,
 * para "Backups/SmartPark" na pasta do usuário — fora do repositório, porque
 * contêm os e-mails dos visitantes. Ficam os 12 mais recentes.
 *
 * Restaurar: substitui o conteúdo do banco de DATABASE_URL pelo do arquivo. O
 * destino precisa estar migrado (`npm run migrar`) até a versão do backup. O
 * endereço tem de ser informado: a restauração nunca escolhe o banco sozinha.
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { Pool } from '@neondatabase/serverless'
import { gerarBackup, restaurarBackup, type Backup } from '../servidor/db/backup.js'

// O Node avisa (DEP0190) sobre argumentos com shell; nenhum vem de fora do script,
// e no Windows o npx (.cmd) precisa do shell.
process.noDeprecation = true

const MANTER = 12
const PASTA = process.env.SMARTPARK_PASTA_BACKUP || join(homedir(), 'Backups', 'SmartPark')
const PREFIXO = 'smartpark-'

function neon(args: string[]): string {
  const r = spawnSync('npx', ['-y', 'neonctl@latest', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) throw new Error(`O CLI do Neon falhou (rode "npx neonctl auth" e tente de novo): ${(r.stderr ?? '').trim().split(/\r?\n/)[0]}`)
  return r.stdout
}

function enderecoPeloNeon(): string {
  const dados = JSON.parse(neon(['projects', 'list', '--output', 'json']))
  const projetos: { id: string; name: string }[] = Array.isArray(dados) ? dados : (dados.projects ?? [])
  const alvo = process.env.SMARTPARK_NEON_PROJETO
  const projeto = projetos.find((p) => (alvo ? p.id === alvo || p.name === alvo : /smart\W?park/i.test(p.name)))
  if (!projeto) throw new Error('Não achei o projeto do Smart Park no Neon. Defina SMARTPARK_NEON_PROJETO ou DATABASE_URL.')
  const url = neon(['connection-string', '--project-id', projeto.id])
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith('postgres'))
  if (!url) throw new Error('O CLI do Neon não devolveu o endereço do banco.')
  return url
}

const servidorDe = (url: string) => new URL(url).host

function registrar(texto: string) {
  console.log(texto)
  mkdirSync(PASTA, { recursive: true })
  appendFileSync(join(PASTA, 'backup.log'), `${new Date().toISOString()} ${texto}\n`)
}

async function comConexao<T>(url: string, tarefa: (cliente: { query: Pool['query'] }) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: url })
  const cliente = await pool.connect()
  try {
    return await tarefa(cliente as never)
  } finally {
    cliente.release()
    await pool.end()
  }
}

async function gerar() {
  const url = process.env.DATABASE_URL || enderecoPeloNeon()
  const backup = await comConexao(url, (c) => gerarBackup(c as never))
  const linhas = backup.tabelas.reduce((s, t) => s + t.linhas.length, 0)
  if (linhas === 0) throw new Error('O banco veio vazio: backup não gravado.')

  mkdirSync(PASTA, { recursive: true })
  const carimbo = backup.criado.replace(/[:T]/g, '-').slice(0, 16)
  const arquivo = join(PASTA, `${PREFIXO}${carimbo}.json.gz`)
  const conteudo = gzipSync(JSON.stringify(backup))
  writeFileSync(arquivo, conteudo)
  // Confere que o que foi gravado abre e tem o mesmo conteúdo
  const relido = JSON.parse(gunzipSync(readFileSync(arquivo)).toString('utf8')) as Backup
  if (relido.tabelas.length !== backup.tabelas.length) throw new Error('O arquivo gravado não confere com o backup.')

  const antigos = readdirSync(PASTA)
    .filter((n) => n.startsWith(PREFIXO) && n.endsWith('.json.gz'))
    .sort()
    .slice(0, -MANTER)
  for (const n of antigos) rmSync(join(PASTA, n))

  const usuarios = backup.tabelas.find((t) => t.nome === 'tb_usuario')?.linhas.length ?? 0
  registrar(
    `ok: ${arquivo} (V${backup.versao}, ${backup.tabelas.length} tabelas, ${linhas} linhas, ${usuarios} contas, ${(conteudo.length / 1024).toFixed(1)} KB)`,
  )
}

async function restaurar(arquivo: string, confirmado: boolean) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Defina DATABASE_URL com o banco de destino. A restauração não escolhe o banco sozinha.')
  const backup = JSON.parse(gunzipSync(readFileSync(arquivo)).toString('utf8')) as Backup
  const linhas = backup.tabelas.reduce((s, t) => s + t.linhas.length, 0)
  console.log(`Backup de ${backup.criado} (V${backup.versao}, ${linhas} linhas).`)
  console.log(`Destino: ${servidorDe(url)}. O conteúdo das tabelas dele será SUBSTITUÍDO.`)
  if (!confirmado) {
    console.log('Nada foi alterado. Repita o comando com --confirmar para restaurar.')
    return
  }
  const restauradas = await comConexao(url, (c) => restaurarBackup(c as never, backup))
  for (const [tabela, n] of Object.entries(restauradas)) console.log(`  ${tabela}: ${n}`)
  console.log('Restauração concluída.')
}

const args = process.argv.slice(2)
const posicao = args.indexOf('--restaurar')
try {
  if (posicao >= 0) {
    const arquivo = args[posicao + 1]
    if (!arquivo || arquivo.startsWith('--')) throw new Error('Informe o arquivo: --restaurar CAMINHO.json.gz')
    await restaurar(arquivo, args.includes('--confirmar'))
  } else {
    await gerar()
  }
} catch (erro) {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  if (posicao >= 0) console.error(`erro: ${mensagem}`)
  else registrar(`erro: ${mensagem}`)
  process.exit(1)
}
