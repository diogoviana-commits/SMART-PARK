/**
 * O que a conta faz por e-mail e pelo Google (RF01 e RF02 da Especificação):
 * confirmar o e-mail do cadastro, recuperar a senha e entrar com Google.
 *
 * Decisões que valem registrar:
 * - O link enviado por e-mail carrega um código aleatório de 256 bits. No banco
 *   fica só o hash dele: quem lesse o banco não conseguiria usar os links.
 * - "Esqueci minha senha" responde igual, e no mesmo tempo, exista a conta ou não.
 * - Redefinir a senha encerra todas as sessões abertas da conta.
 * - O endereço dos links vem da configuração, nunca do cabeçalho da requisição.
 * - Google: quem já tem conta com o mesmo e-mail passa a entrar pelos dois
 *   caminhos. Se o e-mail dessa conta nunca foi confirmado, a senha antiga é
 *   descartada: ela pode ter sido criada por outra pessoa, usando o e-mail alheio.
 */
import { createHash, randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { and, count, eq, gt, gte, isNull, sql } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { z } from 'zod'
import type { Configuracao, PessoaDoGoogle } from '../config.js'
import type { Ambiente, Ctx, UsuarioLogado } from '../contexto.js'
import { corpoJson, exigirLogin } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import { codigos, tentativasLogin, usuarios } from '../db/esquema.js'
import { emailDisponivel, enviarEmail } from '../email.js'
import { ErroHttp } from '../erros.js'
import { gerarHash, validarSenhaNova } from '../seguranca/senha.js'
import { cookieDeSessao, emitirToken } from '../seguranca/sessao.js'
import { noParque } from '../tempo.js'

const VALIDADE_SENHA_MIN = 60
const VALIDADE_EMAIL_MIN = 48 * 60
/** Links de um mesmo tipo que uma conta pode pedir por hora. */
const MAXIMO_POR_HORA = 3
/** Tempo mínimo de resposta do "esqueci minha senha", para a conta que existe não demorar mais. */
const ESPERA_UNIFORME_MS = 1_200

const hashDo = (codigo: string) => createHash('sha256').update(codigo).digest('hex')
const daquiA = (minutos: number) => noParque(new Date(Date.now() + minutos * 60_000))

type Tipo = 'SENHA' | 'EMAIL'

async function podePedir(banco: Banco, usuarioId: number, tipo: Tipo): Promise<boolean> {
  const [{ n }] = await banco
    .select({ n: count() })
    .from(codigos)
    .where(and(eq(codigos.usuarioId, usuarioId), eq(codigos.tipo, tipo), gte(codigos.criado, daquiA(-60))))
  return Number(n) < MAXIMO_POR_HORA
}

async function criarCodigo(banco: Banco, usuarioId: number, tipo: Tipo, minutos: number): Promise<string> {
  const codigo = randomBytes(32).toString('base64url')
  await banco.insert(codigos).values({ usuarioId, tipo, hash: hashDo(codigo), criado: noParque(), expira: daquiA(minutos) })
  return codigo
}

const valido = (codigo: string, tipo: Tipo) =>
  and(eq(codigos.hash, hashDo(codigo)), eq(codigos.tipo, tipo), isNull(codigos.usado), gt(codigos.expira, noParque()))

/** Marca o código como usado, numa operação só: dois pedidos com o mesmo link não passam os dois. */
async function consumir(banco: Banco, codigo: string, tipo: Tipo) {
  const [linha] = await banco.update(codigos).set({ usado: noParque() }).where(valido(codigo, tipo)).returning()
  return linha ?? null
}

/** Envia o link de confirmação do e-mail. Falha de envio não derruba o cadastro. */
export async function enviarConfirmacao(c: Ctx, usuario: UsuarioLogado): Promise<boolean> {
  const config = c.get('config')
  if (!emailDisponivel(config) || usuario.emailConfirmado) return false
  try {
    const codigo = await criarCodigo(c.get('banco'), usuario.id, 'EMAIL', VALIDADE_EMAIL_MIN)
    await enviarEmail(config, {
      para: usuario.email,
      assunto: 'Confirme seu e-mail no Smart Park',
      paragrafos: [
        `Olá, ${usuario.nome.split(/\s+/)[0]}!`,
        'Confirme que este e-mail é seu para concluir o cadastro no Smart Park. O link vale por 48 horas.',
        'Se você não criou essa conta, ignore esta mensagem.',
      ],
      acao: { rotulo: 'Confirmar meu e-mail', url: `${config.urlSite}/#/confirmar/${codigo}` },
    })
    return true
  } catch (erro) {
    console.error('Não foi possível enviar a confirmação de e-mail:', erro)
    return false
  }
}

// ------------------------------------------------------------------- Google ---

const CHAVES_DO_GOOGLE = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const COOKIE_DO_GOOGLE = 'smartpark_google'
const urlDeRetorno = (config: Configuracao) => `${config.urlSite}/api/usuarios/google/retorno`

export const googleDisponivel = (config: Configuracao) =>
  Boolean(config.google.trocarCodigo || (config.google.clienteId && config.google.segredo))

/** Troca o código pelo token de identidade e confere a assinatura do Google. */
async function trocarNoGoogle(config: Configuracao, codigo: string): Promise<PessoaDoGoogle> {
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: config.google.clienteId!,
      client_secret: config.google.segredo!,
      redirect_uri: urlDeRetorno(config),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(8_000),
  })
  const dados = (await resposta.json().catch(() => null)) as { id_token?: string } | null
  if (!resposta.ok || !dados?.id_token) throw new Error(`O Google recusou o código (${resposta.status}).`)
  const { payload } = await jwtVerify(dados.id_token, CHAVES_DO_GOOGLE, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.google.clienteId,
  })
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('Resposta do Google sem identificação.')
  return {
    id: payload.sub,
    email: payload.email,
    nome: typeof payload.name === 'string' && payload.name.trim() ? payload.name : payload.email.split('@')[0],
    emailVerificado: payload.email_verified === true,
  }
}

function cookieDoGoogle(config: Configuracao, valor: string, maxAge: number): string {
  // Lax, e não Strict: a volta do Google é uma navegação vinda de outro site.
  const partes = [`${COOKIE_DO_GOOGLE}=${valor}`, 'Path=/api/usuarios/google', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (config.cookieSeguro) partes.push('Secure')
  return partes.join('; ')
}

function lerCookie(cabecalho: string | undefined, nome: string): string | null {
  for (const parte of (cabecalho ?? '').split(';')) {
    const [chave, ...resto] = parte.trim().split('=')
    if (chave === nome) return resto.join('=') || null
  }
  return null
}

/** Acha ou cria a conta de quem entrou pelo Google. */
async function contaDoGoogle(banco: Banco, pessoa: PessoaDoGoogle): Promise<UsuarioLogado> {
  const [porGoogle] = await banco.select().from(usuarios).where(eq(usuarios.googleId, pessoa.id))
  if (porGoogle) return porGoogle

  const email = pessoa.email.trim().toLowerCase()
  const agora = noParque()
  const [porEmail] = await banco.select().from(usuarios).where(eq(usuarios.email, email))
  if (porEmail) {
    const [vinculada] = await banco
      .update(usuarios)
      .set({
        googleId: pessoa.id,
        emailConfirmado: porEmail.emailConfirmado ?? agora,
        ...(porEmail.emailConfirmado
          ? {}
          : { senhaHash: await gerarHash(randomBytes(32).toString('base64url')), versaoToken: sql`${usuarios.versaoToken} + 1` }),
      })
      .where(eq(usuarios.id, porEmail.id))
      .returning()
    return vinculada
  }

  const [criada] = await banco
    .insert(usuarios)
    .values({
      nome: pessoa.nome.trim().slice(0, 120) || 'Visitante',
      email,
      // Conta sem senha: o hash é de um valor que ninguém conhece. Para ter
      // senha, a pessoa usa "Esqueci minha senha".
      senhaHash: await gerarHash(randomBytes(32).toString('base64url')),
      perfil: 'VISITANTE',
      dataCadastro: agora,
      emailConfirmado: agora,
      googleId: pessoa.id,
    })
    .returning()
  return criada
}

// -------------------------------------------------------------------- rotas ---

const esquemaSenhaNova = z.object({
  codigo: z.string().min(20).max(100),
  senha: z.string().min(8, 'deve ter entre 8 e 72 caracteres').max(72, 'deve ter entre 8 e 72 caracteres'),
})

export const rotasConta = new Hono<Ambiente>()
  .post('/senha/esqueci', async (c) => {
    const config = c.get('config')
    if (!emailDisponivel(config)) throw new ErroHttp(503, 'A recuperação de senha por e-mail não está disponível neste site.')
    const { email } = z.object({ email: z.string().trim().min(1, 'é obrigatório').max(160) }).parse(await corpoJson(c))
    const banco = c.get('banco')

    const trabalho = (async () => {
      const [usuario] = await banco.select().from(usuarios).where(eq(usuarios.email, email.toLowerCase()))
      if (!usuario || usuario.bloqueado || !(await podePedir(banco, usuario.id, 'SENHA'))) return
      const codigo = await criarCodigo(banco, usuario.id, 'SENHA', VALIDADE_SENHA_MIN)
      await enviarEmail(config, {
        para: usuario.email,
        assunto: 'Redefinir sua senha do Smart Park',
        paragrafos: [
          `Olá, ${usuario.nome.split(/\s+/)[0]}!`,
          'Recebemos um pedido para redefinir a senha da sua conta no Smart Park. O link vale por 1 hora e só pode ser usado uma vez.',
          'Se não foi você, ignore esta mensagem: sua senha continua a mesma.',
        ],
        acao: { rotulo: 'Criar nova senha', url: `${config.urlSite}/#/redefinir/${codigo}` },
      })
    })().catch((erro) => console.error('Falha ao enviar a recuperação de senha:', erro))

    // Resposta e tempo iguais para e-mail cadastrado ou não.
    await Promise.all([trabalho, new Promise((r) => setTimeout(r, config.exposto ? ESPERA_UNIFORME_MS : 0))])
    return c.body(null, 204)
  })

  .post('/senha/redefinir', async (c) => {
    const dados = esquemaSenhaNova.parse(await corpoJson(c))
    const banco = c.get('banco')
    const invalido = new ErroHttp(400, 'Este link não vale mais. Peça um novo em "Esqueci minha senha".')

    const [linha] = await banco.select().from(codigos).where(valido(dados.codigo, 'SENHA'))
    if (!linha) throw invalido
    const [usuario] = await banco.select().from(usuarios).where(eq(usuarios.id, linha.usuarioId))
    if (!usuario || usuario.bloqueado) throw invalido
    validarSenhaNova(dados.senha, usuario.email, usuario.nome)
    const senhaHash = await gerarHash(dados.senha)
    if (!(await consumir(banco, dados.codigo, 'SENHA'))) throw invalido

    await banco
      .update(usuarios)
      .set({
        senhaHash,
        versaoToken: sql`${usuarios.versaoToken} + 1`,
        // Quem abriu o link recebeu o e-mail: o endereço está confirmado.
        emailConfirmado: usuario.emailConfirmado ?? noParque(),
      })
      .where(eq(usuarios.id, usuario.id))
    // Os outros links de senha pendentes deixam de valer, e a trava de login é zerada.
    await banco.update(codigos).set({ usado: noParque() }).where(and(eq(codigos.usuarioId, usuario.id), eq(codigos.tipo, 'SENHA'), isNull(codigos.usado)))
    await banco.delete(tentativasLogin).where(eq(tentativasLogin.email, usuario.email))
    return c.body(null, 204)
  })

  .post('/confirmar', async (c) => {
    const { codigo } = z.object({ codigo: z.string().min(20).max(100) }).parse(await corpoJson(c))
    const banco = c.get('banco')
    const linha = await consumir(banco, codigo, 'EMAIL')
    if (!linha) throw new ErroHttp(400, 'Este link de confirmação não vale mais. Peça um novo em Ajustes.')
    await banco
      .update(usuarios)
      .set({ emailConfirmado: sql`coalesce(${usuarios.emailConfirmado}, ${noParque()})` })
      .where(eq(usuarios.id, linha.usuarioId))
    return c.body(null, 204)
  })

  .post('/confirmar/reenviar', async (c) => {
    const usuario = exigirLogin(c)
    if (usuario.emailConfirmado) throw new ErroHttp(409, 'Seu e-mail já está confirmado.')
    if (!emailDisponivel(c.get('config'))) throw new ErroHttp(503, 'O envio de e-mail não está disponível neste site.')
    if (!(await podePedir(c.get('banco'), usuario.id, 'EMAIL'))) {
      throw new ErroHttp(429, 'Você já pediu esse e-mail algumas vezes. Confira a caixa de entrada e o spam, ou tente de novo em 1 hora.')
    }
    if (!(await enviarConfirmacao(c, usuario))) throw new ErroHttp(503, 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.')
    return c.body(null, 204)
  })

  .get('/google/iniciar', (c) => {
    const config = c.get('config')
    if (!googleDisponivel(config)) throw new ErroHttp(404, 'O login com Google não está disponível neste site.')
    const estado = randomBytes(24).toString('base64url')
    const destino = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    destino.search = new URLSearchParams({
      client_id: config.google.clienteId ?? '',
      redirect_uri: urlDeRetorno(config),
      response_type: 'code',
      scope: 'openid email profile',
      state: estado,
      prompt: 'select_account',
    }).toString()
    c.header('Set-Cookie', cookieDoGoogle(config, estado, 600))
    return c.redirect(destino.toString(), 302)
  })

  .get('/google/retorno', async (c) => {
    const config = c.get('config')
    if (!googleDisponivel(config)) throw new ErroHttp(404, 'O login com Google não está disponível neste site.')
    const voltar = (rota: string) => {
      c.header('Set-Cookie', cookieDoGoogle(config, '', 0), { append: true })
      return c.redirect(`${config.urlSite}/#/${rota}`, 302)
    }

    const { code: codigo, state: estado } = c.req.query()
    const esperado = lerCookie(c.req.header('Cookie'), COOKIE_DO_GOOGLE)
    // O estado prova que a volta pertence a um pedido iniciado neste navegador.
    if (!codigo || !estado || !esperado || estado !== esperado) return voltar('entrar/google-cancelado')

    let pessoa: PessoaDoGoogle
    try {
      pessoa = await (config.google.trocarCodigo ?? ((cod) => trocarNoGoogle(config, cod)))(codigo, urlDeRetorno(config))
    } catch (erro) {
      console.error('Falha no login com Google:', erro)
      return voltar('entrar/google-falhou')
    }
    if (!pessoa.emailVerificado) return voltar('entrar/google-sem-email')

    const banco = c.get('banco')
    const conta = await contaDoGoogle(banco, pessoa)
    if (conta.bloqueado) return voltar('entrar/conta-bloqueada')

    const [atualizada] = await banco.update(usuarios).set({ ultimoAcesso: noParque() }).where(eq(usuarios.id, conta.id)).returning()
    const { token } = await emitirToken(config, {
      email: atualizada.email,
      uid: atualizada.id,
      perfil: atualizada.perfil,
      versao: atualizada.versaoToken,
    })
    c.header('Set-Cookie', cookieDeSessao(config, token), { append: true })
    return voltar('mapa')
  })
