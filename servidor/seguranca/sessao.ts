/**
 * Sessão: token JWT assinado com HMAC-SHA256, levado num cookie HttpOnly.
 *
 * - O token carrega a "versão" da conta. Sair incrementa a versão no banco, e
 *   todo token emitido antes para de valer na hora, em qualquer aparelho,
 *   inclusive uma cópia roubada.
 * - O cookie é HttpOnly (o JavaScript da página não lê), Secure, SameSite=Strict
 *   (o navegador não o envia em pedidos vindos de outro site) e tem o prefixo
 *   __Host- (só é aceito se for Secure, sem Domain e com Path=/).
 */
import { jwtVerify, SignJWT } from 'jose'
import type { Configuracao } from '../config.js'

export interface DadosDoToken {
  email: string
  uid: number
  perfil: string
  versao: number
}

const chave = (config: Configuracao) => new TextEncoder().encode(config.segredoJwt)

export async function emitirToken(config: Configuracao, dados: DadosDoToken): Promise<{ token: string; expiraEm: Date }> {
  const expiraEm = new Date(Date.now() + config.duracaoSessaoMin * 60_000)
  const token = await new SignJWT({ uid: dados.uid, perfil: dados.perfil, ver: dados.versao })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(dados.email)
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(chave(config))
  return { token, expiraEm }
}

/** @returns os dados do token, ou null se for inválido, adulterado ou vencido */
export async function lerToken(config: Configuracao, token: string): Promise<DadosDoToken | null> {
  try {
    const { payload } = await jwtVerify(token, chave(config), { algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number' || typeof payload.uid !== 'number') {
      return null
    }
    return { email: payload.sub, uid: payload.uid, perfil: String(payload.perfil), versao: payload.ver }
  } catch {
    return null
  }
}

export const nomeDoCookie = (config: Configuracao) => (config.cookieSeguro ? '__Host-smartpark_sessao' : 'smartpark_sessao')

function cookie(config: Configuracao, valor: string, maxAgeSegundos: number): string {
  const partes = [
    `${nomeDoCookie(config)}=${valor}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSegundos}`,
  ]
  if (config.cookieSeguro) partes.push('Secure')
  return partes.join('; ')
}

export const cookieDeSessao = (config: Configuracao, token: string) =>
  cookie(config, token, config.duracaoSessaoMin * 60)

export const cookieApagado = (config: Configuracao) => cookie(config, '', 0)

/** Lê o token do cabeçalho Authorization (clientes que não são navegador) ou do cookie. */
export function tokenDaRequisicao(config: Configuracao, autorizacao?: string, cookies?: string): string | null {
  if (autorizacao?.startsWith('Bearer ')) return autorizacao.slice(7).trim() || null
  if (!cookies) return null
  const nome = nomeDoCookie(config)
  for (const parte of cookies.split(';')) {
    const [chaveCookie, ...resto] = parte.trim().split('=')
    if (chaveCookie === nome) return resto.join('=') || null
  }
  return null
}
