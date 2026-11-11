/**
 * Erros com código HTTP e o formato único de resposta de erro da API:
 *   { "momento": "...", "status": 404, "erro": "Not Found", "mensagem": "..." }
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'

const NOMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
}

export class ErroHttp extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

export function corpoDeErro(status: number, mensagem: string) {
  return {
    momento: new Date().toISOString(),
    status,
    erro: NOMES[status] ?? 'Error',
    mensagem,
  }
}

/**
 * Transforma qualquer exceção numa resposta previsível. Erro inesperado vira 500
 * com mensagem genérica: detalhe de banco ou pilha de chamadas não sai para o cliente.
 */
export function tratarErro(erro: Error, c: Context) {
  if (erro instanceof ErroHttp) {
    return c.json(corpoDeErro(erro.status, erro.message), erro.status)
  }
  if (erro instanceof ZodError) {
    const primeiro = erro.issues[0]
    const campo = primeiro?.path.join('.')
    const mensagem = campo ? `${campo}: ${primeiro.message}` : (primeiro?.message ?? 'Requisição inválida.')
    return c.json(corpoDeErro(400, mensagem), 400)
  }
  console.error(erro)
  return c.json(corpoDeErro(500, 'Erro interno. Tente de novo em instantes.'), 500)
}
