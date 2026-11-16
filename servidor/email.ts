/**
 * Envio de e-mail: confirmação de cadastro (RF01) e recuperação de senha (RF02).
 *
 * - Publicado: envia pela API da Resend, com SMARTPARK_EMAIL_CHAVE e
 *   SMARTPARK_EMAIL_REMETENTE. Sem elas, não há envio, e o site esconde o que
 *   depende de e-mail em vez de prometer uma mensagem que não chega.
 * - Desenvolvimento e testes: nada sai para a internet. A mensagem fica na
 *   caixa de saída local e, em desenvolvimento, aparece no terminal da API.
 */
import type { Configuracao } from './config.js'
import { ErroHttp } from './erros.js'

export interface Mensagem {
  para: string
  assunto: string
  /** Parágrafos de texto simples; o HTML é montado a partir deles */
  paragrafos: string[]
  /** Botão com o link da ação */
  acao: { rotulo: string; url: string }
}

/** As últimas mensagens "enviadas" em desenvolvimento e nos testes. */
export const caixaDeSaidaLocal: Mensagem[] = []

const configurado = (config: Configuracao) => Boolean(config.email.chave && config.email.remetente)

export const emailDisponivel = (config: Configuracao) => configurado(config) || !config.exposto

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function emHtml(m: Mensagem): string {
  const paragrafos = m.paragrafos.map((p) => `<p style="margin:0 0 14px">${escapar(p)}</p>`).join('')
  return `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1a241d;max-width:520px">
<p style="font-size:20px;font-weight:700;color:#0f2a1e;margin:0 0 16px">Smart Park · Espaço Verde Chico Mendes</p>
${paragrafos}
<p style="margin:22px 0"><a href="${escapar(m.acao.url)}" style="background:#1e5b3f;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapar(m.acao.rotulo)}</a></p>
<p style="font-size:13px;color:#5a6158;margin:0">Se o botão não abrir, copie este endereço no navegador:<br>${escapar(m.acao.url)}</p>
</div>`
}

const emTexto = (m: Mensagem) => `${m.paragrafos.join('\n\n')}\n\n${m.acao.rotulo}: ${m.acao.url}\n`

export async function enviarEmail(config: Configuracao, mensagem: Mensagem): Promise<void> {
  if (configurado(config)) {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.email.chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.email.remetente,
        to: [mensagem.para],
        subject: mensagem.assunto,
        text: emTexto(mensagem),
        html: emHtml(mensagem),
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!resposta.ok) throw new Error(`O serviço de e-mail respondeu ${resposta.status}.`)
    return
  }
  if (config.exposto) throw new ErroHttp(503, 'O envio de e-mail não está configurado neste site.')

  caixaDeSaidaLocal.push(mensagem)
  if (caixaDeSaidaLocal.length > 50) caixaDeSaidaLocal.shift()
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    console.log(`\n[e-mail local] para ${mensagem.para} · ${mensagem.assunto}\n${emTexto(mensagem)}`)
  }
}
