/**
 * Cadastro e autenticação (RF01, RF02) e administração de contas.
 *
 * Decisões que valem registrar:
 * - Quem se cadastra é sempre VISITANTE. O perfil não vem do corpo da requisição;
 *   administradores só são criados por quem já é administrador.
 * - Mesma mensagem para e-mail inexistente e senha errada: dizer qual dos dois
 *   falhou revelaria quais e-mails estão cadastrados.
 * - O login trava depois de 5 senhas erradas seguidas, por 15 minutos. A contagem
 *   fica no banco (tb_tentativa_login), porque função serverless não tem memória.
 * - O token vai num cookie HttpOnly, nunca no corpo da resposta.
 */
import { Hono } from 'hono'
import { asc, eq, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Ambiente, Ctx, UsuarioLogado } from '../contexto.js'
import { corpoJson, exigirAdministrador, exigirLogin, idDaRota } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import { avaliacoes, checkins, conclusoes, progressosLegados, tentativasLogin, usuarios } from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { conferirSenha, gerarHash, hashParaComparacaoFalsa, validarSenhaNova } from '../seguranca/senha.js'
import { cookieApagado, cookieDeSessao, emitirToken } from '../seguranca/sessao.js'
import { noParque, paraIso } from '../tempo.js'

export const respostaUsuario = (u: UsuarioLogado) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  perfil: u.perfil,
  dataCadastro: paraIso(u.dataCadastro),
  ultimoAcesso: paraIso(u.ultimoAcesso),
})

const normalizarEmail = (email: string) => email.trim().toLowerCase()

const esquemaCadastro = z.object({
  nome: z.string().trim().min(1, 'é obrigatório').max(120, 'pode ter no máximo 120 caracteres'),
  email: z
    .string()
    .trim()
    .max(160, 'pode ter no máximo 160 caracteres')
    .pipe(z.email('deve ser um e-mail válido')),
  senha: z.string().min(8, 'deve ter entre 8 e 72 caracteres').max(72, 'deve ter entre 8 e 72 caracteres'),
})

const esquemaLogin = z.object({
  email: z.string().trim().min(1, 'é obrigatório').max(160),
  senha: z.string().min(1, 'é obrigatória').max(128),
})

async function cadastrar(c: Ctx, perfil: 'VISITANTE' | 'ADMINISTRADOR') {
  const dados = esquemaCadastro.parse(await corpoJson(c))
  const email = normalizarEmail(dados.email)
  validarSenhaNova(dados.senha, email, dados.nome)

  const banco = c.get('banco')
  const [existente] = await banco.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email))
  if (existente) throw new ErroHttp(409, 'Este e-mail já está cadastrado.')

  const [criado] = await banco
    .insert(usuarios)
    .values({ nome: dados.nome, email, senhaHash: await gerarHash(dados.senha), perfil, dataCadastro: noParque() })
    .returning()
  c.header('Location', `/api/usuarios/${criado.id}`)
  return c.json(respostaUsuario(criado), 201)
}

// ------------------------------------------------------------ trava de login ---

async function bloqueado(banco: Banco, email: string, c: Ctx): Promise<boolean> {
  const { maxTentativasLogin, bloqueioMin } = c.get('config')
  const [registro] = await banco.select().from(tentativasLogin).where(eq(tentativasLogin.email, email))
  if (!registro) return false
  const limite = noParque(new Date(Date.now() - bloqueioMin * 60_000))
  return registro.falhas >= maxTentativasLogin && registro.ultimaFalha > limite
}

async function registrarFalha(banco: Banco, email: string, c: Ctx) {
  const agora = noParque()
  const limite = noParque(new Date(Date.now() - c.get('config').bloqueioMin * 60_000))
  // Quem testa milhares de e-mails inventados faria a tabela crescer sem limite:
  // os registros com a janela vencida saem a cada nova falha.
  await banco.delete(tentativasLogin).where(lt(tentativasLogin.ultimaFalha, limite))
  // Falha depois que a janela venceu recomeça a contagem do zero.
  await banco
    .insert(tentativasLogin)
    .values({ email, falhas: 1, ultimaFalha: agora })
    .onConflictDoUpdate({
      target: tentativasLogin.email,
      set: {
        falhas: sql`CASE WHEN ${tentativasLogin.ultimaFalha} < ${limite} THEN 1 ELSE ${tentativasLogin.falhas} + 1 END`,
        ultimaFalha: agora,
      },
    })
}

// --------------------------------------------------------------------- rotas ---

export const rotasUsuarios = new Hono<Ambiente>()
  .post('/', (c) => cadastrar(c, 'VISITANTE'))

  .post('/administradores', (c) => {
    exigirAdministrador(c)
    return cadastrar(c, 'ADMINISTRADOR')
  })

  .post('/login', async (c) => {
    const dados = esquemaLogin.parse(await corpoJson(c))
    const email = normalizarEmail(dados.email)
    const banco = c.get('banco')
    const config = c.get('config')

    if (await bloqueado(banco, email, c)) {
      throw new ErroHttp(429, `Muitas tentativas seguidas. Aguarde ${config.bloqueioMin} minutos e tente novamente.`)
    }

    const [usuario] = await banco.select().from(usuarios).where(eq(usuarios.email, email))
    // Sem a conta, compara com um hash qualquer: a resposta leva o mesmo tempo, e o
    // tempo de resposta não denuncia quais e-mails existem.
    const confere = usuario
      ? await conferirSenha(dados.senha, usuario.senhaHash)
      : (await conferirSenha(dados.senha, await hashParaComparacaoFalsa()), false)

    if (!usuario || !confere) {
      await registrarFalha(banco, email, c)
      throw new ErroHttp(401, 'E-mail ou senha incorretos.')
    }

    await banco.delete(tentativasLogin).where(eq(tentativasLogin.email, email))
    const [atualizado] = await banco
      .update(usuarios)
      .set({ ultimoAcesso: noParque() })
      .where(eq(usuarios.id, usuario.id))
      .returning()

    const { token, expiraEm } = await emitirToken(config, {
      email: atualizado.email,
      uid: atualizado.id,
      perfil: atualizado.perfil,
      versao: atualizado.versaoToken,
    })
    c.header('Set-Cookie', cookieDeSessao(config, token))
    return c.json({ expiraEm: expiraEm.toISOString(), usuario: respostaUsuario(atualizado) })
  })

  /**
   * Encerra todas as sessões da conta, em qualquer aparelho. Apagar o cookie só
   * tira o token deste navegador; mudar a versão da conta é o que invalida uma
   * cópia do token. Sem sessão, apenas apaga o cookie.
   */
  .post('/sair', async (c) => {
    const usuario = c.get('usuario')
    if (usuario) {
      await c
        .get('banco')
        .update(usuarios)
        .set({ versaoToken: sql`${usuarios.versaoToken} + 1` })
        .where(eq(usuarios.id, usuario.id))
    }
    c.header('Set-Cookie', cookieApagado(c.get('config')))
    return c.body(null, 204)
  })

  .get('/eu', (c) => c.json(respostaUsuario(exigirLogin(c))))

  .get('/', async (c) => {
    exigirAdministrador(c)
    const linhas = await c.get('banco').select().from(usuarios).orderBy(asc(usuarios.id))
    return c.json(linhas.map(respostaUsuario))
  })

  /** Cada pessoa só vê a própria conta; administradores veem qualquer uma. */
  .get('/:id{[0-9]+}', async (c) => {
    const logado = exigirLogin(c)
    const id = idDaRota(c)
    if (logado.id !== id && logado.perfil !== 'ADMINISTRADOR') throw new ErroHttp(403, 'Você só pode ver a sua própria conta.')
    const [usuario] = await c.get('banco').select().from(usuarios).where(eq(usuarios.id, id))
    if (!usuario) throw new ErroHttp(404, `Usuário ${id} não encontrado.`)
    return c.json(respostaUsuario(usuario))
  })

  /** Remove a conta e tudo o que é dela. Cada pessoa só remove a própria; administradores, qualquer uma. */
  .delete('/:id{[0-9]+}', async (c) => {
    const logado = exigirLogin(c)
    const id = idDaRota(c)
    if (logado.id !== id && logado.perfil !== 'ADMINISTRADOR') throw new ErroHttp(403, 'Você só pode remover a sua própria conta.')
    const banco = c.get('banco')
    const [usuario] = await banco.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, id))
    if (!usuario) throw new ErroHttp(404, `Usuário ${id} não encontrado.`)
    await banco.delete(avaliacoes).where(eq(avaliacoes.usuarioId, id))
    await banco.delete(checkins).where(eq(checkins.usuarioId, id))
    await banco.delete(conclusoes).where(eq(conclusoes.usuarioId, id))
    await banco.delete(progressosLegados).where(eq(progressosLegados.usuarioId, id))
    await banco.delete(usuarios).where(eq(usuarios.id, id))
    if (logado.id === id) c.header('Set-Cookie', cookieApagado(c.get('config')))
    return c.body(null, 204)
  })
