/**
 * Configuração da API, lida das variáveis de ambiente.
 *
 * "Exposto" é qualquer ambiente publicado na internet (produção e prévias da
 * Vercel). Nele, a API se recusa a subir com o segredo de desenvolvimento do JWT:
 * esse segredo está no repositório público, e com ele qualquer pessoa forjaria um
 * token de administrador.
 */
export interface Configuracao {
  exposto: boolean
  segredoJwt: string
  /** Validade da sessão, em minutos */
  duracaoSessaoMin: number
  /** Cookie com Secure e prefixo __Host- (exige HTTPS) */
  cookieSeguro: boolean
  maxTentativasLogin: number
  bloqueioMin: number
  senhaAdministrador?: string
}

export const SEGREDO_DEV = 'segredo-de-desenvolvimento-do-smart-park-troque-em-producao-1234567890'

type Ambiente = Record<string, string | undefined>

export function lerConfiguracao(env: Ambiente = process.env): Configuracao {
  const exposto = env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'production'
  const segredo = env.SMARTPARK_JWT_SECRET?.trim() || SEGREDO_DEV

  if (Buffer.byteLength(segredo, 'utf8') < 32) {
    throw new Error('O segredo do JWT precisa de ao menos 32 caracteres. Ajuste SMARTPARK_JWT_SECRET.')
  }
  if (exposto && segredo === SEGREDO_DEV) {
    throw new Error('Ambiente publicado sem SMARTPARK_JWT_SECRET: a API não sobe com o segredo de desenvolvimento.')
  }

  return {
    exposto,
    segredoJwt: segredo,
    duracaoSessaoMin: Number(env.SMARTPARK_SESSAO_MINUTOS ?? 120),
    cookieSeguro: env.SMARTPARK_COOKIE_SEGURO !== 'false',
    maxTentativasLogin: Number(env.SMARTPARK_LOGIN_MAX_TENTATIVAS ?? 5),
    bloqueioMin: Number(env.SMARTPARK_LOGIN_BLOQUEIO_MINUTOS ?? 15),
    senhaAdministrador: env.SMARTPARK_ADMIN_SENHA || undefined,
  }
}
