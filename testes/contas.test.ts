/**
 * RF01, RF02 e UC10: confirmação de e-mail, recuperação de senha, login com
 * Google e bloqueio de contas pela administração.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { caixaDeSaidaLocal } from '../servidor/email.js'
import { cookieDaResposta, entrar, entrarComoAdministrador, novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
beforeAll(async () => {
  amb = await prepararAmbiente()
})

/** Código do último link enviado para o e-mail. */
function codigoPara(email: string, rota: 'redefinir' | 'confirmar'): string {
  const mensagem = [...caixaDeSaidaLocal].reverse().find((m) => m.para === email && m.acao.url.includes(`/#/${rota}/`))
  if (!mensagem) throw new Error(`nenhum e-mail de ${rota} para ${email}`)
  return mensagem.acao.url.split(`/#/${rota}/`)[1]
}

describe('confirmação de e-mail (RF01)', () => {
  it('o cadastro envia o link, e abrir o link confirma o e-mail uma única vez', async () => {
    const v = await novoVisitante(amb)
    const antes = await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: v.sessao })
    expect(antes.corpo.emailConfirmado).toBe(false)

    const codigo = codigoPara(v.email, 'confirmar')
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar', { corpo: { codigo } })).status).toBe(204)
    const depois = await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: v.sessao })
    expect(depois.corpo.emailConfirmado).toBe(true)

    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar', { corpo: { codigo } })).status).toBe(400)
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar/reenviar', { sessao: v.sessao })).status).toBe(409)
  })

  it('reenvia o link a pedido, com limite por hora', async () => {
    const v = await novoVisitante(amb)
    // O cadastro já gastou um dos três envios da hora
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar/reenviar', { sessao: v.sessao })).status).toBe(204)
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar/reenviar', { sessao: v.sessao })).status).toBe(204)
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar/reenviar', { sessao: v.sessao })).status).toBe(429)
    expect((await pedir(amb, 'POST', '/api/usuarios/confirmar/reenviar')).status).toBe(401)
  })

  it('o link de confirmação não serve para redefinir a senha', async () => {
    const v = await novoVisitante(amb)
    const codigo = codigoPara(v.email, 'confirmar')
    const r = await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo, senha: 'outra senha bem longa' } })
    expect(r.status).toBe(400)
  })
})

describe('recuperação de senha (RF02)', () => {
  it('responde igual para e-mail cadastrado e não cadastrado, e só o cadastrado recebe o link', async () => {
    const v = await novoVisitante(amb)
    const quantos = caixaDeSaidaLocal.length
    const existe = await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email.toUpperCase() } })
    const naoExiste = await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: 'ninguem@exemplo.com' } })
    expect(existe.status).toBe(204)
    expect(naoExiste.status).toBe(204)
    expect(caixaDeSaidaLocal.length).toBe(quantos + 1)
    expect(caixaDeSaidaLocal.at(-1)!.acao.url).toMatch(/^http:\/\/localhost:5173\/#\/redefinir\//)
  })

  it('o link troca a senha, vale uma vez só e encerra as sessões abertas', async () => {
    const v = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    const codigo = codigoPara(v.email, 'redefinir')

    const fraca = await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo, senha: '12345678' } })
    expect(fraca.status).toBe(400)

    const nova = 'caminhada no fim da tarde'
    expect((await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo, senha: nova } })).status).toBe(204)

    // A sessão de antes caiu; a senha antiga não entra; a nova entra
    expect((await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: v.sessao })).status).toBe(401)
    expect((await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: v.email, senha: 'um passeio tranquilo' } })).status).toBe(401)
    const sessao = await entrar(amb, v.email, nova)
    // Quem abriu o link provou que o e-mail é seu
    expect((await pedir(amb, 'GET', '/api/usuarios/eu', { sessao })).corpo.emailConfirmado).toBe(true)

    const deNovo = await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo, senha: 'mais uma senha qualquer' } })
    expect(deNovo.status).toBe(400)
  })

  it('redefinir invalida os outros links pendentes e libera o login travado', async () => {
    const v = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    const primeiro = codigoPara(v.email, 'redefinir')
    await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    const segundo = codigoPara(v.email, 'redefinir')
    expect(segundo).not.toBe(primeiro)

    for (let i = 0; i < 5; i++) await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: v.email, senha: 'senha errada' } })
    expect((await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: v.email, senha: 'um passeio tranquilo' } })).status).toBe(429)

    expect((await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo: segundo, senha: 'trilha das capivaras' } })).status).toBe(204)
    expect((await pedir(amb, 'POST', '/api/usuarios/senha/redefinir', { corpo: { codigo: primeiro, senha: 'trilha dos saguis 22' } })).status).toBe(400)
    await entrar(amb, v.email, 'trilha das capivaras')
  })

  it('limita os pedidos de link por conta', async () => {
    const v = await novoVisitante(amb)
    const quantos = caixaDeSaidaLocal.length
    for (let i = 0; i < 5; i++) await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    expect(caixaDeSaidaLocal.length).toBe(quantos + 3)
  })

  it('publicado sem serviço de e-mail, avisa que não está disponível em vez de fingir que enviou', async () => {
    const publicado = await prepararAmbiente({ NODE_ENV: 'production', SMARTPARK_JWT_SECRET: 'um-segredo-de-teste-com-mais-de-32-caracteres' })
    const recursos = await pedir(publicado, 'GET', '/api/recursos')
    expect(recursos.corpo).toEqual({ email: false, google: false })
    const r = await pedir(publicado, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: 'alguem@exemplo.com' } })
    expect(r.status).toBe(503)
  })
})

describe('login com Google (RF01)', () => {
  let google: Ambiente
  const pessoas: Record<string, { id: string; email: string; nome: string; emailVerificado: boolean }> = {}

  beforeAll(async () => {
    google = await prepararAmbiente()
    google.config.google = {
      clienteId: 'cliente-de-teste',
      segredo: 'segredo-de-teste',
      trocarCodigo: async (codigo) => {
        if (!pessoas[codigo]) throw new Error('código recusado')
        return pessoas[codigo]
      },
    }
  })

  /** Faz o caminho inteiro: iniciar, "voltar do Google" com o código, e devolve a resposta. */
  async function voltarDoGoogle(codigo: string, opcoes: { estado?: string } = {}) {
    const inicio = await pedir(google, 'GET', '/api/usuarios/google/iniciar')
    expect(inicio.status).toBe(302)
    const destino = new URL(inicio.cabecalhos.get('location')!)
    expect(destino.origin).toBe('https://accounts.google.com')
    expect(destino.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/usuarios/google/retorno')
    const estado = destino.searchParams.get('state')!
    const cookie = inicio.cabecalhos.get('set-cookie')!.split(';')[0]
    return pedir(google, 'GET', `/api/usuarios/google/retorno?code=${codigo}&state=${opcoes.estado ?? estado}`, { sessao: cookie })
  }

  const sessaoDe = (resposta: Awaited<ReturnType<typeof pedir>>) =>
    resposta.cabecalhos
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .find((c) => /^(__Host-)?smartpark_sessao=.+/.test(c)) ?? null

  it('cria a conta na primeira vez e reconhece a mesma pessoa na segunda', async () => {
    pessoas.olga = { id: 'g-olga', email: 'Olga@Exemplo.com', nome: 'Olga Menezes', emailVerificado: true }
    const primeira = await voltarDoGoogle('olga')
    expect(primeira.status).toBe(302)
    expect(primeira.cabecalhos.get('location')).toBe('http://localhost:5173/#/mapa')
    const eu = await pedir(google, 'GET', '/api/usuarios/eu', { sessao: sessaoDe(primeira) })
    expect(eu.corpo).toMatchObject({ nome: 'Olga Menezes', email: 'olga@exemplo.com', perfil: 'VISITANTE', emailConfirmado: true })

    const segunda = await voltarDoGoogle('olga')
    const eu2 = await pedir(google, 'GET', '/api/usuarios/eu', { sessao: sessaoDe(segunda) })
    expect(eu2.corpo.id).toBe(eu.corpo.id)
  })

  it('recusa a volta sem o estado do pedido, com código inválido ou com e-mail não verificado', async () => {
    pessoas.rui = { id: 'g-rui', email: 'rui@exemplo.com', nome: 'Rui', emailVerificado: false }
    const forjada = await voltarDoGoogle('rui', { estado: 'estado-de-outro-navegador' })
    expect(forjada.cabecalhos.get('location')).toMatch(/#\/entrar\/google-cancelado$/)
    expect(sessaoDe(forjada)).toBeNull()

    const semVerificar = await voltarDoGoogle('rui')
    expect(semVerificar.cabecalhos.get('location')).toMatch(/#\/entrar\/google-sem-email$/)
    expect(sessaoDe(semVerificar)).toBeNull()

    const invalido = await voltarDoGoogle('codigo-que-nao-existe')
    expect(invalido.cabecalhos.get('location')).toMatch(/#\/entrar\/google-falhou$/)
  })

  it('vincula a uma conta de e-mail já confirmada e mantém a senha dela', async () => {
    const v = await novoVisitante(google)
    await pedir(google, 'POST', '/api/usuarios/confirmar', { corpo: { codigo: codigoPara(v.email, 'confirmar') } })
    pessoas.confirmada = { id: 'g-confirmada', email: v.email, nome: 'Outro Nome', emailVerificado: true }
    const volta = await voltarDoGoogle('confirmada')
    expect((await pedir(google, 'GET', '/api/usuarios/eu', { sessao: sessaoDe(volta) })).corpo.id).toBe(v.id)
    await entrar(google, v.email, 'um passeio tranquilo')
  })

  it('ao vincular a uma conta nunca confirmada, descarta a senha de quem a criou', async () => {
    // Alguém se cadastra com o e-mail de outra pessoa e fica esperando ela entrar pelo Google
    const intruso = await novoVisitante(google)
    pessoas.dona = { id: 'g-dona', email: intruso.email, nome: 'Dona do E-mail', emailVerificado: true }
    const volta = await voltarDoGoogle('dona')
    expect((await pedir(google, 'GET', '/api/usuarios/eu', { sessao: sessaoDe(volta) })).status).toBe(200)

    expect((await pedir(google, 'GET', '/api/usuarios/eu', { sessao: intruso.sessao })).status).toBe(401)
    const login = await pedir(google, 'POST', '/api/usuarios/login', { corpo: { email: intruso.email, senha: 'um passeio tranquilo' } })
    expect(login.status).toBe(401)
  })

  it('sem cliente configurado, a rota não existe', async () => {
    expect((await pedir(amb, 'GET', '/api/usuarios/google/iniciar')).status).toBe(404)
  })
})

describe('administração de contas (UC10)', () => {
  it('bloquear derruba a sessão e impede o login; desbloquear devolve o acesso', async () => {
    const admin = await entrarComoAdministrador(amb)
    const v = await novoVisitante(amb)

    const bloqueio = await pedir(amb, 'PATCH', `/api/usuarios/${v.id}`, { sessao: admin, corpo: { bloqueado: true } })
    expect(bloqueio.status).toBe(200)
    expect(bloqueio.corpo.bloqueado).toBe(true)

    expect((await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: v.sessao })).status).toBe(401)
    const login = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: v.email, senha: 'um passeio tranquilo' } })
    expect(login.status).toBe(403)
    expect(cookieDaResposta(login)).toBeNull()
    // Senha errada continua com a resposta de sempre: não revela o bloqueio
    expect((await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: v.email, senha: 'errada mesmo' } })).status).toBe(401)

    // Conta bloqueada não recebe link de recuperação
    const quantos = caixaDeSaidaLocal.length
    await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    expect(caixaDeSaidaLocal.length).toBe(quantos)

    await pedir(amb, 'PATCH', `/api/usuarios/${v.id}`, { sessao: admin, corpo: { bloqueado: false } })
    await entrar(amb, v.email, 'um passeio tranquilo')
  })

  it('só a administração altera contas, e nunca a própria', async () => {
    const admin = await entrarComoAdministrador(amb)
    const v = await novoVisitante(amb)
    const outro = await novoVisitante(amb)
    expect((await pedir(amb, 'PATCH', `/api/usuarios/${outro.id}`, { sessao: v.sessao, corpo: { bloqueado: true } })).status).toBe(403)
    expect((await pedir(amb, 'PATCH', `/api/usuarios/${v.id}`, { sessao: v.sessao, corpo: { perfil: 'ADMINISTRADOR' } })).status).toBe(403)
    expect((await pedir(amb, 'PATCH', `/api/usuarios/${outro.id}`, { corpo: { bloqueado: true } })).status).toBe(401)

    const eu = await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: admin })
    expect((await pedir(amb, 'PATCH', `/api/usuarios/${eu.corpo.id}`, { sessao: admin, corpo: { perfil: 'VISITANTE' } })).status).toBe(400)
    expect((await pedir(amb, 'PATCH', `/api/usuarios/${outro.id}`, { sessao: admin, corpo: {} })).status).toBe(400)
    expect((await pedir(amb, 'PATCH', '/api/usuarios/999999', { sessao: admin, corpo: { bloqueado: true } })).status).toBe(404)
  })

  it('promove um visitante a administrador', async () => {
    const admin = await entrarComoAdministrador(amb)
    const v = await novoVisitante(amb)
    expect((await pedir(amb, 'GET', '/api/usuarios', { sessao: v.sessao })).status).toBe(403)
    const r = await pedir(amb, 'PATCH', `/api/usuarios/${v.id}`, { sessao: admin, corpo: { perfil: 'ADMINISTRADOR' } })
    expect(r.corpo.perfil).toBe('ADMINISTRADOR')
    expect((await pedir(amb, 'GET', '/api/usuarios', { sessao: v.sessao })).status).toBe(200)
  })

  it('apagar a conta leva junto os links e as sugestões dela', async () => {
    const v = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: 'Mais bancos perto do lago.' } })
    await pedir(amb, 'POST', '/api/usuarios/senha/esqueci', { corpo: { email: v.email } })
    expect((await pedir(amb, 'DELETE', `/api/usuarios/${v.id}`, { sessao: v.sessao })).status).toBe(204)
  })
})
