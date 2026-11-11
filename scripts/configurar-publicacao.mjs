// Prepara a publicação do Smart Park na Vercel, sem nenhum segredo aparecer na tela.
//
//   node scripts/configurar-publicacao.mjs      (ou dê dois cliques em configurar-publicacao.bat)
//
// 1. Pega no Neon o endereço do banco (conexão sem pooling) e confere se é o
//    banco do Smart Park.
// 2. Grava na Vercel: DATABASE_URL, SMARTPARK_JWT_SECRET (gerado aqui) e, se você
//    quiser, SMARTPARK_ADMIN_SENHA.
// 3. Abre o painel da Render para você suspender a API antiga.
//
// Precisa do Vercel CLI logado (vercel login). O CLI do Neon é baixado na hora
// pelo npx e abre o navegador para você entrar na conta do Neon.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

// O Node avisa (DEP0190) que argumentos com shell não são escapados; aqui nenhum
// argumento vem de fora do script, e no Windows os CLIs .cmd precisam do shell.
process.noDeprecation = true

const PROJETO_VERCEL = 'smart-park'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))

const titulo = (t) => console.log(`\n=== ${t} ===`)
const ok = (t) => console.log(`  [ok] ${t}`)
const falhar = (t) => {
  console.error(`\n  [erro] ${t}\n`)
  process.exit(1)
}

/** Roda um comando; `entrada` vai pelo stdin (nunca como argumento, para não aparecer em lugar nenhum). */
function rodar(comando, args, { entrada, mostrar = false, semEntrada = false } = {}) {
  const r = spawnSync(comando, args, {
    cwd: RAIZ,
    input: entrada,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    // semEntrada: o comando não pode parar esperando uma resposta que ninguém vê
    stdio: [semEntrada ? 'ignore' : entrada === undefined ? 'inherit' : 'pipe', mostrar ? 'inherit' : 'pipe', mostrar ? 'inherit' : 'pipe'],
  })
  return { codigo: r.status, saida: (r.stdout ?? '').trim(), erro: (r.stderr ?? '').trim() }
}

function perguntar(pergunta, { oculto = false } = {}) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) {
      // Não ecoa o que é digitado (senha, endereço do banco)
      rl._writeToOutput = (texto) => {
        if (texto.includes(pergunta)) rl.output.write(texto)
      }
    }
    rl.question(pergunta, (resposta) => {
      rl.close()
      if (oculto) process.stdout.write('\n')
      resolver(resposta.trim())
    })
  })
}

const neon = (args) => rodar('npx', ['-y', 'neonctl@latest', ...args], { semEntrada: true })

/** Lista em JSON do CLI do Neon; vazia se não der. */
function listaNeon(args) {
  try {
    const dados = JSON.parse(neon([...args, '--output', 'json']).saida)
    return Array.isArray(dados) ? dados : (Object.values(dados).find(Array.isArray) ?? [])
  } catch {
    return []
  }
}

/** Uma opção da lista: se só houver uma, ela; se houver várias, pergunta. */
async function escolher(itens, descricao, preferida) {
  if (itens.length <= 1) return itens[0]
  const padrao = itens.findIndex((i) => i.name === preferida)
  itens.forEach((i, n) => console.log(`   ${n + 1}) ${i.name}${n === padrao ? '  (sugerido)' : ''}`))
  const resposta = await perguntar(`  Qual ${descricao}? Número${padrao >= 0 ? ' (Enter = sugerido)' : ''}: `)
  if (!resposta && padrao >= 0) return itens[padrao]
  return itens[Number(resposta) - 1]
}

async function enderecoDoNeon() {
  titulo('1/4  Banco no Neon')
  console.log('  O navegador vai abrir para você entrar na conta do Neon.')
  console.log('  (Se não abrir, copie o endereço que aparecer abaixo e abra no navegador.)')
  // Login à vista: o CLI mostra o endereço de autorização e espera você entrar.
  const login = rodar('npx', ['-y', 'neonctl@latest', 'auth'], { mostrar: true })
  if (login.codigo !== 0) console.log('  [aviso] o login no Neon não terminou; vou pedir o endereço à mão.')
  const lista = neon(['projects', 'list', '--output', 'json'])
  let projetos = []
  try {
    const dados = JSON.parse(lista.saida)
    projetos = Array.isArray(dados) ? dados : (dados.projects ?? [])
  } catch {
    console.log('  Não consegui listar os projetos do Neon pelo CLI.')
  }

  let projeto = projetos[0]
  if (projetos.length > 1) {
    projetos.forEach((p, i) => console.log(`   ${i + 1}) ${p.name} (${p.id})`))
    const escolha = Number(await perguntar('  Qual é o projeto do Smart Park? Número: '))
    projeto = projetos[escolha - 1]
  }

  if (projeto) {
    console.log(`  Projeto "${projeto.name}". Buscando os bancos e usuários dele...`)
    const bancos = listaNeon(['databases', 'list', '--project-id', projeto.id])
    const banco = await escolher(bancos, 'é o banco do Smart Park', 'neondb')
    const usuarios = listaNeon(['roles', 'list', '--project-id', projeto.id])
    const usuario = await escolher(usuarios, 'usuário usar', banco?.owner_name)

    const args = ['connection-string', '--project-id', projeto.id] // sem pooling é o padrão do CLI
    if (banco) args.push('--database-name', banco.name)
    if (usuario) args.push('--role-name', usuario.name)
    const r = neon(args)
    const url = r.saida
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith('postgres'))
    if (r.codigo === 0 && url) {
      ok(`endereço obtido (projeto "${projeto.name}", banco "${banco?.name ?? 'padrão'}")`)
      return url
    }
    console.log(`  O CLI do Neon não devolveu o endereço${r.erro ? `: ${r.erro.split(/\r?\n/)[0]}` : '.'}`)
  }

  console.log('\n  Copie o endereço à mão: console.neon.tech > projeto > Connect,')
  console.log('  com "Connection pooling" DESLIGADO. Ele não vai aparecer enquanto você cola.')
  return perguntar('  Cole o endereço e tecle Enter: ', { oculto: true })
}

async function conferirBanco(url) {
  if (!/^postgres(ql)?:\/\//.test(url)) falhar('Isso não parece um endereço de banco PostgreSQL.')
  if (url.includes('-pooler')) falhar('Esse é o endereço COM pooling. Desligue "Connection pooling" no Neon e copie de novo.')
  const { neon: sql } = await import('@neondatabase/serverless')
  try {
    const consulta = sql(url)
    const [linha] = await consulta`SELECT count(*)::int AS pontos FROM tb_ponto_interesse`
    ok(`conectei no banco: ${linha.pontos} pontos de interesse cadastrados`)
    if (linha.pontos === 0) console.log('  (banco vazio: a migração vai cadastrar o parque)')
  } catch (e) {
    if (String(e.message).includes('tb_ponto_interesse')) {
      console.log('  [aviso] conectei, mas esse banco não tem as tabelas do Smart Park.')
      const seguir = await perguntar('  É um banco novo, de propósito? (s/n): ')
      if (seguir.toLowerCase() !== 's') falhar('Confira se copiou o endereço do projeto certo no Neon.')
    } else {
      falhar(`Não consegui conectar no banco: ${e.message}`)
    }
  }
}

function gravarNaVercel(nome, valor) {
  for (const ambiente of ['production', 'preview']) {
    const r = rodar('vercel', ['env', 'add', nome, ambiente, '--sensitive', '--force', '--yes'], { entrada: valor })
    if (r.codigo !== 0) falhar(`A Vercel recusou ${nome} (${ambiente}): ${r.erro || r.saida}`)
  }
  ok(`${nome} gravada na Vercel (Production e Preview)`)
}

// -------------------------------------------------------------------------------

console.log('Smart Park: preparação da publicação na Vercel')
console.log('Nenhum endereço, senha ou segredo é mostrado na tela.')

titulo('0/4  Conta da Vercel')
const quem = rodar('vercel', ['whoami'])
if (quem.codigo !== 0) falhar('O Vercel CLI não está logado. Rode "vercel login" e tente de novo.')
ok(`logado como ${quem.saida.split(/\r?\n/).pop()}`)
if (!existsSync(`${RAIZ}/.vercel/project.json`)) {
  const link = rodar('vercel', ['link', '--yes', '--project', PROJETO_VERCEL])
  if (link.codigo !== 0) falhar(`Não consegui ligar a pasta ao projeto "${PROJETO_VERCEL}": ${link.erro || link.saida}`)
}
ok(`pasta ligada ao projeto "${PROJETO_VERCEL}"`)

const url = await enderecoDoNeon()
await conferirBanco(url)

titulo('2/4  Variáveis na Vercel')
gravarNaVercel('DATABASE_URL', url)
gravarNaVercel('SMARTPARK_JWT_SECRET', randomBytes(48).toString('base64url'))
console.log('\n  Conta de administração (admin@smartpark.uscs): serve para cadastrar eventos e pontos.')
const senhaAdmin = await perguntar('  Digite uma senha para ela (ou só Enter para não criar): ', { oculto: true })
if (senhaAdmin) {
  if (senhaAdmin.length < 12) falhar('Use uma senha de pelo menos 12 caracteres para a administração.')
  gravarNaVercel('SMARTPARK_ADMIN_SENHA', senhaAdmin)
  console.log('  Guarde essa senha num lugar seguro: ela não fica salva neste computador.')
} else {
  ok('sem conta de administração por enquanto')
}

titulo('3/4  Suspender a API antiga na Render')
console.log('  Vou abrir o painel da Render. Lá: serviço "smartpark-api" > Settings >')
console.log('  role até o fim > Suspend Service. (Suspenda, não apague.)')
rodar(process.platform === 'win32' ? 'start' : 'open', ['https://dashboard.render.com'])
await perguntar('  Tecle Enter quando tiver suspendido: ')

titulo('4/4  Pronto')
console.log('  Volte ao chat e mande: pode publicar')
console.log('  (backup do banco, migração e publicação ficam comigo)\n')
