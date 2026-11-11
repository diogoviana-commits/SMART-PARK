/**
 * Apoio aos testes: um PostgreSQL de verdade (PGlite) na memória, com as mesmas
 * migrações do banco publicado e a carga inicial do parque, e a API chamada
 * diretamente, sem rede.
 */
import { criarApp } from '../servidor/app.js'
import { lerConfiguracao, type Configuracao } from '../servidor/config.js'
import { carregarDadosIniciais, EMAIL_ADMINISTRADOR } from '../servidor/db/carga.js'
import { conectarPglite, type Conexao } from '../servidor/db/conexao.js'
import { lerMigracoes, migrar } from '../servidor/db/migracoes.js'

export const SENHA_ADMIN = 'administracao-do-parque-2026'
export { EMAIL_ADMINISTRADOR }

export interface Ambiente {
  conexao: Conexao
  config: Configuracao
  app: ReturnType<typeof criarApp>
  /** Recria o app com o mesmo banco: simula uma instância nova da função serverless. */
  novaInstancia(): ReturnType<typeof criarApp>
}

export async function prepararAmbiente(variaveis: Record<string, string> = {}): Promise<Ambiente> {
  const conexao = await conectarPglite()
  await migrar(conexao.sql, lerMigracoes('db/migracoes'))
  await carregarDadosIniciais(conexao.banco, SENHA_ADMIN)
  const config = lerConfiguracao({ NODE_ENV: 'test', ...variaveis })
  return {
    conexao,
    config,
    app: criarApp(conexao.banco, config),
    novaInstancia: () => criarApp(conexao.banco, config),
  }
}

export interface Resposta<T = any> {
  status: number
  corpo: T
  cabecalhos: Headers
}

interface Opcoes {
  corpo?: unknown
  sessao?: string | null
  /** Envia o cabeçalho do site (proteção CSRF). Padrão: sim. */
  doSite?: boolean
  cabecalhos?: Record<string, string>
  app?: Ambiente['app']
}

export async function pedir<T = any>(amb: Ambiente, metodo: string, caminho: string, opcoes: Opcoes = {}): Promise<Resposta<T>> {
  const cabecalhos: Record<string, string> = { ...opcoes.cabecalhos }
  if (opcoes.doSite !== false) cabecalhos['X-Requested-With'] = 'SmartPark'
  if (opcoes.sessao) cabecalhos.Cookie = opcoes.sessao
  let body: string | undefined
  if (opcoes.corpo !== undefined && metodo !== 'GET' && metodo !== 'HEAD') {
    body = typeof opcoes.corpo === 'string' ? opcoes.corpo : JSON.stringify(opcoes.corpo)
    cabecalhos['Content-Type'] = 'application/json'
  }
  const resposta = await (opcoes.app ?? amb.app).request(caminho, { method: metodo, headers: cabecalhos, body })
  const texto = await resposta.text()
  let corpo: any = null
  try {
    corpo = texto ? JSON.parse(texto) : null
  } catch {
    corpo = texto
  }
  return { status: resposta.status, corpo, cabecalhos: resposta.headers }
}

/** Valor "nome=token" do cookie de sessão de uma resposta de login. */
export function cookieDaResposta(resposta: Resposta): string | null {
  const bruto = resposta.cabecalhos.get('set-cookie')
  return bruto ? bruto.split(';')[0] : null
}

export async function entrar(amb: Ambiente, email: string, senha: string): Promise<string> {
  const resposta = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha } })
  if (resposta.status !== 200) throw new Error(`login falhou: ${resposta.status} ${JSON.stringify(resposta.corpo)}`)
  return cookieDaResposta(resposta)!
}

let contador = 0

/** Cria um visitante novo e devolve a sessão dele. */
export async function novoVisitante(amb: Ambiente, nome = 'Maria Visitante'): Promise<{ sessao: string; id: number; email: string }> {
  contador += 1
  const email = `visitante${contador}.${Date.now()}@exemplo.com`
  const senha = 'um passeio tranquilo'
  const criado = await pedir(amb, 'POST', '/api/usuarios', { corpo: { nome, email, senha } })
  if (criado.status !== 201) throw new Error(`cadastro falhou: ${JSON.stringify(criado.corpo)}`)
  return { sessao: await entrar(amb, email, senha), id: criado.corpo.id, email }
}

export const entrarComoAdministrador = (amb: Ambiente) => entrar(amb, EMAIL_ADMINISTRADOR, SENHA_ADMIN)
