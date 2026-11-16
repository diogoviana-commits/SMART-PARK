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
  /** Endereço público do site, usado nos links enviados por e-mail e na volta do Google */
  urlSite: string
  /** Envio de e-mail pela Resend; sem chave, não há envio em ambiente publicado */
  email: { chave?: string; remetente?: string }
  /** Login com Google (OAuth); sem cliente configurado, o botão não aparece */
  google: {
    clienteId?: string
    segredo?: string
    /** Troca o código devolvido pelo Google pelos dados da pessoa. Substituível nos testes. */
    trocarCodigo?: (codigo: string, urlDeRetorno: string) => Promise<PessoaDoGoogle>
  }
}

export interface PessoaDoGoogle {
  id: string
  email: string
  nome: string
  emailVerificado: boolean
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
    // O endereço nunca vem do cabeçalho Host da requisição: quem o forjasse
    // receberia, no próprio site, o link de redefinir a senha de outra pessoa.
    urlSite: (
      env.SMARTPARK_URL_SITE?.trim() ||
      (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')
    ).replace(/\/+$/, ''),
    email: { chave: env.SMARTPARK_EMAIL_CHAVE || undefined, remetente: env.SMARTPARK_EMAIL_REMETENTE || undefined },
    google: { clienteId: env.SMARTPARK_GOOGLE_ID || undefined, segredo: env.SMARTPARK_GOOGLE_SEGREDO || undefined },
  }
}
