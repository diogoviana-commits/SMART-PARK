/**
 * Envio de e-mail por SMTP: a mensagem sai de verdade por uma conexão SMTP, aqui
 * recebida por um servidor mínimo que roda dentro do próprio teste.
 */
import { createServer, type Server } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lerConfiguracao } from '../servidor/config.js'
import { emailDisponivel, enviarEmail } from '../servidor/email.js'

interface Recebida {
  usuario: string
  senha: string
  de: string
  para: string
  corpo: string
}

const recebidas: Recebida[] = []
let servidor: Server
let porta: number

beforeAll(async () => {
  servidor = createServer((conexao) => {
    const atual: Partial<Recebida> = {}
    let lendoCorpo = false
    let pendente = ''
    const dizer = (linha: string) => conexao.write(`${linha}\r\n`)
    dizer('220 teste ESMTP')
    conexao.on('data', (pedaco) => {
      pendente += pedaco.toString('utf8')
      if (lendoCorpo) {
        const fim = pendente.indexOf('\r\n.\r\n')
        if (fim < 0) return
        atual.corpo = pendente.slice(0, fim)
        pendente = pendente.slice(fim + 5)
        lendoCorpo = false
        recebidas.push(atual as Recebida)
        dizer('250 recebida')
      }
      let quebra: number
      while (!lendoCorpo && (quebra = pendente.indexOf('\r\n')) >= 0) {
        const linha = pendente.slice(0, quebra)
        pendente = pendente.slice(quebra + 2)
        const comando = linha.toUpperCase()
        if (comando.startsWith('EHLO')) conexao.write('250-teste\r\n250 AUTH PLAIN\r\n')
        else if (comando.startsWith('AUTH PLAIN')) {
          const [, usuario, senha] = Buffer.from(linha.slice(11), 'base64').toString('utf8').split('\0')
          Object.assign(atual, { usuario, senha })
          dizer(senha === 'senhadeappcorreta' ? '235 autenticado' : '535 usuario ou senha recusados')
        } else if (comando.startsWith('MAIL FROM')) {
          atual.de = /<(.*?)>/.exec(linha)?.[1]
          dizer('250 ok')
        } else if (comando.startsWith('RCPT TO')) {
          atual.para = /<(.*?)>/.exec(linha)?.[1]
          dizer('250 ok')
        } else if (comando === 'DATA') {
          lendoCorpo = true
          dizer('354 envie a mensagem')
        } else if (comando === 'QUIT') {
          dizer('221 ate logo')
          conexao.end()
        } else dizer('250 ok')
      }
    })
    conexao.on('error', () => {})
  })
  await new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', pronto))
  porta = (servidor.address() as { port: number }).port
})

afterAll(() => new Promise((fechado) => servidor.close(fechado)))

const configuracao = (extras: Record<string, string> = {}) =>
  lerConfiguracao({
    NODE_ENV: 'production',
    SMARTPARK_JWT_SECRET: 'um-segredo-de-teste-com-mais-de-32-caracteres',
    SMARTPARK_SMTP_SERVIDOR: '127.0.0.1',
    SMARTPARK_SMTP_PORTA: String(porta),
    SMARTPARK_SMTP_USUARIO: 'parque@exemplo.com',
    // Como o Google mostra a senha de app: em grupos separados por espaço
    SMARTPARK_SMTP_SENHA: 'senh adea ppco rreta',
    ...extras,
  })

const mensagem = {
  para: 'olga@exemplo.com',
  assunto: 'Redefinir sua senha do Smart Park',
  paragrafos: ['Olá, Olga!', 'Use o botão para criar uma senha nova.'],
  acao: { rotulo: 'Criar nova senha', url: 'https://parque.exemplo/#/redefinir/abc123' },
}

describe('envio de e-mail por SMTP', () => {
  it('entrega a mensagem com o remetente da conta e o link da ação', async () => {
    const config = configuracao()
    expect(emailDisponivel(config)).toBe(true)
    await enviarEmail(config, mensagem)

    const recebida = recebidas.at(-1)!
    expect(recebida).toMatchObject({ usuario: 'parque@exemplo.com', senha: 'senhadeappcorreta', de: 'parque@exemplo.com', para: 'olga@exemplo.com' })
    expect(recebida.corpo).toContain('From: Smart Park <parque@exemplo.com>')
    expect(recebida.corpo).toContain('Subject: Redefinir sua senha do Smart Park')
    expect(recebida.corpo).toContain('https://parque.exemplo/#/redefinir/abc123')
  })

  it('usa o remetente configurado, quando há um', async () => {
    await enviarEmail(configuracao({ SMARTPARK_EMAIL_REMETENTE: 'Parque Chico Mendes <avisos@exemplo.com>' }), mensagem)
    expect(recebidas.at(-1)!.corpo).toContain('From: Parque Chico Mendes <avisos@exemplo.com>')
  })

  it('falha com erro quando o servidor recusa a senha, em vez de fingir que enviou', async () => {
    const quantas = recebidas.length
    await expect(enviarEmail(configuracao({ SMARTPARK_SMTP_SENHA: 'senha errada' }), mensagem)).rejects.toThrow()
    expect(recebidas.length).toBe(quantas)
  })

  it('publicado sem SMTP nem Resend, o e-mail fica indisponível', () => {
    const config = lerConfiguracao({ NODE_ENV: 'production', SMARTPARK_JWT_SECRET: 'um-segredo-de-teste-com-mais-de-32-caracteres' })
    expect(emailDisponivel(config)).toBe(false)
  })
})
