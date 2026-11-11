/**
 * O que cada requisição carrega: o banco, a configuração e quem está logado.
 */
import type { Context, MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import type { Configuracao } from './config.js'
import type { Banco } from './db/conexao.js'
import { usuarios } from './db/esquema.js'
import { ErroHttp, corpoDeErro } from './erros.js'
import { lerToken, tokenDaRequisicao } from './seguranca/sessao.js'

export type UsuarioLogado = typeof usuarios.$inferSelect

export type Ambiente = {
  Variables: {
    banco: Banco
    config: Configuracao
    usuario: UsuarioLogado | null
  }
}

export type Ctx = Context<Ambiente>

/** Cabeçalho que o site envia em toda requisição que altera algo. */
export const CABECALHO_CSRF = 'X-Requested-With'
export const VALOR_CSRF = 'SmartPark'
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Proteção contra CSRF, segunda camada (a primeira é o SameSite=Strict do
 * cookie): toda requisição que altera algo precisa do cabeçalho do site, que um
 * formulário de outro site não consegue enviar. Clientes com token Bearer não
 * usam cookie, então não estão sujeitos a CSRF.
 */
export const protecaoCsrf: MiddlewareHandler<Ambiente> = async (c, next) => {
  const altera = !METODOS_SEGUROS.has(c.req.method)
  const bearer = c.req.header('Authorization')?.startsWith('Bearer ')
  if (altera && !bearer && c.req.header(CABECALHO_CSRF) !== VALOR_CSRF) {
    return c.json(corpoDeErro(403, 'Requisição recusada: origem não confirmada.'), 403)
  }
  await next()
}

/**
 * Identifica quem está logado. Token ausente, inválido, vencido ou de uma sessão
 * encerrada (versão da conta mudou) não é erro aqui: a requisição segue como
 * anônima, e cada rota decide se exige login.
 */
export const autenticar: MiddlewareHandler<Ambiente> = async (c, next) => {
  c.set('usuario', null)
  const config = c.get('config')
  const token = tokenDaRequisicao(config, c.req.header('Authorization'), c.req.header('Cookie'))
  const dados = token ? await lerToken(config, token) : null
  if (dados) {
    const [usuario] = await c.get('banco').select().from(usuarios).where(eq(usuarios.id, dados.uid))
    if (usuario && usuario.email === dados.email && usuario.versaoToken === dados.versao) {
      c.set('usuario', usuario)
    }
  }
  await next()
}

export function exigirLogin(c: Ctx): UsuarioLogado {
  const usuario = c.get('usuario')
  if (!usuario) throw new ErroHttp(401, 'Entre na sua conta para continuar.')
  return usuario
}

export function exigirAdministrador(c: Ctx): UsuarioLogado {
  const usuario = exigirLogin(c)
  if (usuario.perfil !== 'ADMINISTRADOR') throw new ErroHttp(403, 'Apenas a administração do parque pode fazer isso.')
  return usuario
}

/** Lê o id da URL; texto que não é número inteiro positivo vira 404. */
export function idDaRota(c: Ctx, nome = 'id'): number {
  const valor = Number(c.req.param(nome))
  if (!Number.isSafeInteger(valor) || valor <= 0) throw new ErroHttp(404, 'Recurso não encontrado.')
  return valor
}

/** Lê o corpo JSON; corpo ausente ou malformado vira 400, não 500. */
export async function corpoJson(c: Ctx): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    throw new ErroHttp(400, 'O corpo da requisição precisa ser um JSON válido.')
  }
}
