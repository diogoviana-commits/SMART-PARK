/**
 * Cadastro, login, política de senha e trava de tentativas. Portado de
 * UsuarioControllerTest.java, mais a trava que agora sobrevive a instâncias novas.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { usuarios } from '../servidor/db/esquema.js'
import { noParque } from '../servidor/tempo.js'
import { entrar, entrarComoAdministrador, novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
beforeAll(async () => {
  amb = await prepararAmbiente()
})

const cadastro = (dados: Record<string, unknown>) => pedir(amb, 'POST', '/api/usuarios', { corpo: dados })
let n = 0
const emailNovo = () => `pessoa${++n}.${Date.now()}@exemplo.com`

describe('cadastro', () => {
  it('cadastra visitante sem devolver a senha', async () => {
    const r = await cadastro({ nome: 'Ana Souza', email: emailNovo(), senha: 'caminhada no lago' })
    expect(r.status).toBe(201)
    expect(r.corpo.perfil).toBe('VISITANTE')
    expect(r.cabecalhos.get('location')).toBe(`/api/usuarios/${r.corpo.id}`)
    expect(JSON.stringify(r.corpo)).not.toMatch(/senha|caminhada no lago/i)
  })

  it('guarda a senha com hash BCrypt, nunca em texto puro', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Bia', email, senha: 'caminhada no lago' })
    const [linha] = await amb.conexao.banco.select().from(usuarios).where(eq(usuarios.email, email))
    expect(linha.senhaHash).toMatch(/^\$2[aby]\$12\$/)
    expect(linha.senhaHash).not.toContain('caminhada')
  })

  it('o perfil não pode ser escolhido no cadastro', async () => {
    const r = await cadastro({ nome: 'Esperto', email: emailNovo(), senha: 'caminhada no lago', perfil: 'ADMINISTRADOR' })
    expect(r.status).toBe(201)
    expect(r.corpo.perfil).toBe('VISITANTE')
  })

  it('e-mail repetido é recusado, sem diferenciar maiúsculas', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Caio', email, senha: 'caminhada no lago' })
    const r = await cadastro({ nome: 'Caio 2', email: email.toUpperCase(), senha: 'caminhada no lago' })
    expect(r.status).toBe(409)
    expect(r.corpo.mensagem).toBe('Este e-mail já está cadastrado.')
  })

  it.each([
    ['muito curta', 'curta', 'senha: deve ter entre 8 e 72 caracteres'],
    ['muito comum', '12345678', 'Essa senha é muito comum e seria adivinhada rápido. Escolha outra.'],
    ['repetitiva', 'abababab', 'Essa senha é muito comum e seria adivinhada rápido. Escolha outra.'],
    ['com o nome', 'eu sou a Fernanda!', 'A senha não pode conter o seu nome ou o seu e-mail.'],
  ])('senha %s é recusada', async (_, senha, mensagem) => {
    const r = await cadastro({ nome: 'Fernanda', email: emailNovo(), senha })
    expect(r.status).toBe(400)
    expect(r.corpo.mensagem).toBe(mensagem)
  })

  it('senha além do limite do BCrypt (72 bytes) é recusada', async () => {
    // 36 caracteres acentuados = 72 bytes em UTF-8; com mais um passa do limite
    const r = await cadastro({ nome: 'Gil', email: emailNovo(), senha: 'ã'.repeat(36) + 'x' })
    expect(r.status).toBe(400)
  })

  it('e-mail inválido é recusado', async () => {
    const r = await cadastro({ nome: 'Hugo', email: 'nao-e-email', senha: 'caminhada no lago' })
    expect(r.status).toBe(400)
    expect(r.corpo.mensagem).toBe('email: deve ser um e-mail válido')
  })

  it('nome acima de 120 caracteres volta 400 explicado, não erro 500', async () => {
    const r = await cadastro({ nome: 'x'.repeat(121), email: emailNovo(), senha: 'caminhada no lago' })
    expect(r.status).toBe(400)
  })
})

describe('login', () => {
  it('abre a sessão e devolve os dados da conta', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Íris', email, senha: 'caminhada no lago' })
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: email.toUpperCase(), senha: 'caminhada no lago' } })
    expect(r.status).toBe(200)
    expect(r.corpo.usuario.email).toBe(email)
    expect(r.corpo.usuario.ultimoAcesso).not.toBeNull()
  })

  it('e-mail inexistente recebe a mesma resposta que senha errada', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Jó', email, senha: 'caminhada no lago' })
    const errada = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'outra senha qualquer' } })
    const inexistente = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email: emailNovo(), senha: 'x' } })
    expect(errada.status).toBe(401)
    expect(inexistente.status).toBe(401)
    expect(errada.corpo.mensagem).toBe(inexistente.corpo.mensagem)
  })

  it('aceita o hash $2a$ gerado pelo Spring na versão em Java', async () => {
    const email = emailNovo()
    // O Spring Security grava "$2a$"; o algoritmo é o mesmo do "$2b$" para senhas em ASCII.
    const hashDoSpring = (await bcrypt.hash('senha da era java', 10)).replace(/^\$2b\$/, '$2a$')
    await amb.conexao.banco
      .insert(usuarios)
      .values({ nome: 'Conta Antiga', email, senhaHash: hashDoSpring, perfil: 'VISITANTE', dataCadastro: noParque() })
    expect(await entrar(amb, email, 'senha da era java')).toMatch(/^__Host-smartpark_sessao=/)
  })
})

describe('trava de tentativas', () => {
  it('trava depois de 5 senhas erradas, mesmo com a senha certa', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Kai', email, senha: 'caminhada no lago' })
    for (let i = 0; i < 5; i++) {
      expect((await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'errada demais' } })).status).toBe(401)
    }
    const r = await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'caminhada no lago' } })
    expect(r.status).toBe(429)
    expect(r.corpo.mensagem).toContain('Aguarde 15 minutos')
  })

  it('a trava vale numa instância nova da função (fica no banco, não na memória)', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Lia', email, senha: 'caminhada no lago' })
    for (let i = 0; i < 5; i++) {
      // Cada tentativa numa instância diferente, como pode acontecer na Vercel
      await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'errada demais' }, app: amb.novaInstancia() })
    }
    const r = await pedir(amb, 'POST', '/api/usuarios/login', {
      corpo: { email, senha: 'caminhada no lago' },
      app: amb.novaInstancia(),
    })
    expect(r.status).toBe(429)
  })

  it('login correto zera a contagem', async () => {
    const email = emailNovo()
    await cadastro({ nome: 'Mel', email, senha: 'caminhada no lago' })
    for (let i = 0; i < 4; i++) await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'errada demais' } })
    await entrar(amb, email, 'caminhada no lago')
    for (let i = 0; i < 4; i++) await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'errada demais' } })
    expect((await pedir(amb, 'POST', '/api/usuarios/login', { corpo: { email, senha: 'caminhada no lago' } })).status).toBe(200)
  })
})

describe('contas', () => {
  it('"eu" devolve a conta do token', async () => {
    const { sessao, id } = await novoVisitante(amb, 'Nina')
    const r = await pedir(amb, 'GET', '/api/usuarios/eu', { sessao })
    expect(r.corpo.id).toBe(id)
    expect(r.corpo.nome).toBe('Nina')
  })

  it('ninguém vê a conta de outra pessoa trocando o id', async () => {
    const a = await novoVisitante(amb)
    const b = await novoVisitante(amb)
    expect((await pedir(amb, 'GET', `/api/usuarios/${b.id}`, { sessao: a.sessao })).status).toBe(403)
    expect((await pedir(amb, 'GET', `/api/usuarios/${a.id}`, { sessao: a.sessao })).status).toBe(200)
  })

  it('administrador cria outro administrador', async () => {
    const sessao = await entrarComoAdministrador(amb)
    const r = await pedir(amb, 'POST', '/api/usuarios/administradores', {
      sessao,
      corpo: { nome: 'Gestora', email: emailNovo(), senha: 'gestao do parque' },
    })
    expect(r.status).toBe(201)
    expect(r.corpo.perfil).toBe('ADMINISTRADOR')
  })

  it('remover a própria conta apaga as avaliações e encerra a sessão', async () => {
    const { sessao, id } = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/pois/3/avaliacoes', { sessao, corpo: { nota: 4 } })
    const r = await pedir(amb, 'DELETE', `/api/usuarios/${id}`, { sessao })
    expect(r.status).toBe(204)
    expect(r.cabecalhos.get('set-cookie')).toContain('Max-Age=0')
    const lista = await pedir(amb, 'GET', '/api/pois/3/avaliacoes')
    expect(lista.corpo.some((a: { usuarioId: number }) => a.usuarioId === id)).toBe(false)
  })
})
