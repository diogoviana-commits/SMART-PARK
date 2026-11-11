/**
 * Controle de acesso, sessão e CSRF. Portado de SegurancaTest.java, com a regra
 * nova do mapa aberto: consultar o parque não exige conta.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { lerToken } from '../servidor/seguranca/sessao.js'
import {
  cookieDaResposta,
  entrarComoAdministrador,
  novoVisitante,
  pedir,
  prepararAmbiente,
  type Ambiente,
} from './apoio.js'

let amb: Ambiente
beforeAll(async () => {
  amb = await prepararAmbiente()
})

describe('o que é aberto', () => {
  it('checagem de saúde não exige login', async () => {
    const r = await pedir(amb, 'GET', '/api/saude')
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({ status: 'ok' })
  })

  it.each(['/api/pois', '/api/categorias', '/api/eventos', '/api/missoes', '/api/pois/1', '/api/pois/1/avaliacoes'])(
    'consultar %s não exige login (mapa aberto)',
    async (caminho) => {
      expect((await pedir(amb, 'GET', caminho)).status).toBe(200)
    },
  )
})

describe('o que exige login', () => {
  it.each([
    ['GET', '/api/usuarios/eu'],
    ['GET', '/api/missoes/pontos'],
    ['POST', '/api/pois/1/avaliacoes'],
    ['POST', '/api/visitas'],
  ])('%s %s sem login responde 401', async (metodo, caminho) => {
    const r = await pedir(amb, metodo, caminho, { corpo: {} })
    expect(r.status).toBe(401)
    expect(r.corpo.mensagem).toBe('Entre na sua conta para continuar.')
  })

  it('o cookie de sessão autentica sozinho', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await pedir(amb, 'GET', '/api/usuarios/eu', { sessao })
    expect(r.status).toBe(200)
    expect(r.corpo.perfil).toBe('VISITANTE')
  })

  it('o token também vale no cabeçalho Authorization, para clientes que não são navegador', async () => {
    const { sessao } = await novoVisitante(amb)
    const token = sessao.split('=').slice(1).join('=')
    const r = await pedir(amb, 'GET', '/api/usuarios/eu', { cabecalhos: { Authorization: `Bearer ${token}` } })
    expect(r.status).toBe(200)
  })
})

describe('o que só a administração faz', () => {
  it.each([
    ['POST', '/api/pois'],
    ['PUT', '/api/pois/1'],
    ['DELETE', '/api/pois/1'],
    ['POST', '/api/eventos'],
    ['PUT', '/api/eventos/1'],
    ['DELETE', '/api/eventos/1'],
    ['GET', '/api/usuarios'],
    ['POST', '/api/usuarios/administradores'],
  ])('%s %s: visitante recebe 403 e anônimo 401', async (metodo, caminho) => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, metodo, caminho, { sessao, corpo: {} })).status).toBe(403)
    expect((await pedir(amb, metodo, caminho, { corpo: {} })).status).toBe(401)
  })

  it('administrador lista as contas', async () => {
    const sessao = await entrarComoAdministrador(amb)
    const r = await pedir(amb, 'GET', '/api/usuarios', { sessao })
    expect(r.status).toBe(200)
    expect(r.corpo.length).toBeGreaterThan(0)
  })
})

describe('sessão', () => {
  it('o cookie é HttpOnly, Secure, SameSite=Strict e com prefixo __Host-', async () => {
    const { email } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'um passeio tranquilo' } })
    const cookie = r.cabecalhos.get('set-cookie')!
    expect(cookie).toMatch(/^__Host-smartpark_sessao=/)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Path=/')
  })

  it('o token não aparece no corpo da resposta do login', async () => {
    const { email } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'um passeio tranquilo' } })
    const token = cookieDaResposta(r)!.split('=').slice(1).join('=')
    expect(JSON.stringify(r.corpo)).not.toContain(token)
    expect(Object.keys(r.corpo).sort()).toEqual(['expiraEm', 'usuario'])
  })

  it('sair invalida o token no servidor, mesmo antes de expirar', async () => {
    const { sessao } = await novoVisitante(amb)
    const token = sessao.split('=').slice(1).join('=')
    expect(await lerToken(amb.config, token)).not.toBeNull() // assinatura e validade continuam boas...
    expect((await pedir(amb, 'POST', '/api/usuarios/sair', { sessao })).status).toBe(204)
    // ...mas a versão da conta mudou, e o mesmo token não autentica mais.
    expect((await pedir(amb, 'GET', '/api/usuarios/eu', { sessao })).status).toBe(401)
  })

  it('sair sem sessão apenas apaga o cookie', async () => {
    const r = await pedir(amb, 'POST', '/api/usuarios/sair')
    expect(r.status).toBe(204)
    expect(r.cabecalhos.get('set-cookie')).toContain('Max-Age=0')
  })

  it('token adulterado é ignorado: a requisição segue como anônima', async () => {
    const { sessao } = await novoVisitante(amb)
    const adulterado = sessao.slice(0, -3) + (sessao.endsWith('a') ? 'bbb' : 'aaa')
    expect((await pedir(amb, 'GET', '/api/usuarios/eu', { sessao: adulterado })).status).toBe(401)
  })
})

describe('proteção contra CSRF', () => {
  it('requisição que altera algo sem o cabeçalho do site é recusada', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/pois/1/avaliacoes', { sessao, doSite: false, corpo: { nota: 5 } })
    expect(r.status).toBe(403)
    expect(r.corpo.mensagem).toBe('Requisição recusada: origem não confirmada.')
  })

  it('com o cabeçalho do site, passa', async () => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/pois/1/avaliacoes', { sessao, corpo: { nota: 5 } })).status).toBe(201)
  })

  it('login sem o cabeçalho do site é recusado', async () => {
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { doSite: false, corpo: { email: 'a@b.com', senha: 'x' } })
    expect(r.status).toBe(403)
  })

  it('cliente com token Bearer não depende do cabeçalho', async () => {
    const { sessao } = await novoVisitante(amb)
    const token = sessao.split('=').slice(1).join('=')
    const r = await pedir(amb, 'POST', '/api/pois/2/avaliacoes', {
      doSite: false,
      cabecalhos: { Authorization: `Bearer ${token}` },
      corpo: { nota: 4 },
    })
    expect(r.status).toBe(201)
  })

  it('consulta (GET) não precisa do cabeçalho', async () => {
    expect((await pedir(amb, 'GET', '/api/pois', { doSite: false })).status).toBe(200)
  })
})

describe('respostas de erro', () => {
  it('rota inexistente responde 404 no formato padrão', async () => {
    const r = await pedir(amb, 'GET', '/api/nao-existe')
    expect(r.status).toBe(404)
    expect(Object.keys(r.corpo).sort()).toEqual(['erro', 'mensagem', 'momento', 'status'])
  })

  it('JSON malformado responde 400, não 500', async () => {
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: '{ quebrado' })
    expect(r.status).toBe(400)
  })

  it('id que não é número responde 404', async () => {
    expect((await pedir(amb, 'GET', '/api/pois/abc')).status).toBe(404)
  })

  it('a rota antiga de progresso autodeclarado não existe mais', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/missoes/1/progresso', { sessao, corpo: { quantidade: 999 } })
    expect(r.status).toBe(404)
  })
})
