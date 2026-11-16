/**
 * Envia um e-mail de teste com a configuração de envio do ambiente, para conferir
 * a conta antes de publicar.
 *
 *   npm run email:testar -- voce@exemplo.com
 *
 * Usa SMARTPARK_SMTP_USUARIO e SMARTPARK_SMTP_SENHA (ou as variáveis da Resend).
 * Se elas não estiverem no ambiente, pergunta a conta e a senha de app aqui
 * mesmo, sem mostrar a senha na tela nem gravá-la em lugar nenhum.
 */
import { createInterface } from 'node:readline'
import { lerConfiguracao } from '../servidor/config.js'
import { enviarEmail } from '../servidor/email.js'

function perguntar(pergunta: string, oculto = false): Promise<string> {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) {
      const saida = rl as unknown as { _writeToOutput: (texto: string) => void; output: NodeJS.WritableStream }
      saida._writeToOutput = (texto) => {
        if (texto.includes(pergunta)) saida.output.write(texto)
      }
    }
    rl.question(pergunta, (resposta) => {
      rl.close()
      if (oculto) process.stdout.write('\n')
      resolver(resposta.trim())
    })
  })
}

const destino = process.argv[2]
if (!destino || !destino.includes('@')) {
  console.error('Informe para quem enviar: npm run email:testar -- voce@exemplo.com')
  process.exit(1)
}

const ambiente = { ...process.env }
if (!ambiente.SMARTPARK_SMTP_USUARIO && !ambiente.SMARTPARK_EMAIL_CHAVE) {
  ambiente.SMARTPARK_SMTP_USUARIO = await perguntar('Conta que envia (Gmail do projeto): ')
  ambiente.SMARTPARK_SMTP_SENHA = await perguntar('Senha de app (não aparece ao digitar ou colar): ', true)
}

const config = lerConfiguracao(ambiente)
if (!config.email.smtp && !config.email.chave) {
  console.error('Nenhum envio configurado: faltou a conta ou a senha de app.')
  process.exit(1)
}

try {
  await enviarEmail(config, {
    para: destino,
    assunto: 'Teste de envio do Smart Park',
    paragrafos: [
      'Este é um e-mail de teste do Smart Park.',
      'Se você está lendo isto, a confirmação de cadastro e a recuperação de senha vão conseguir enviar mensagens.',
    ],
    acao: { rotulo: 'Abrir o Smart Park', url: config.urlSite },
  })
  console.log(`Enviado para ${destino} por ${config.email.smtp ? config.email.smtp.servidor : 'Resend'}, de ${config.email.remetente}.`)
  console.log('Confira a caixa de entrada (e o spam) do destino.')
} catch (erro) {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  console.error(`Não foi possível enviar: ${mensagem}`)
  if (/535|Username and Password|Invalid login/i.test(mensagem)) {
    console.error('O servidor recusou a conta ou a senha. Use a senha de app de 16 letras, não a senha normal da conta.')
  }
  process.exit(1)
}
