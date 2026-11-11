// Rota a pé calculada no próprio aparelho (RF05).
//
// A rede de caminhos do parque (public/dados/trilhas.json, ~170 KB) é baixada
// uma vez e fica na memória; o cálculo em si leva milissegundos. Assim a rota
// não depende da API, e recalcular no meio do caminho não gasta rede.
import { calcularRota, GrafoDeTrilhas } from '../compartilhado/grafo.ts'

let rede = null

/** Carrega a rede de caminhos uma vez só; chamadas seguintes reaproveitam. */
export function carregarRede() {
  rede ??= fetch('/dados/trilhas.json')
    .then((resposta) => {
      if (!resposta.ok) throw new Error('Não foi possível carregar os caminhos do parque.')
      return resposta.json()
    })
    .then((dados) => new GrafoDeTrilhas(dados))
    .catch((erro) => {
      rede = null // deixa tentar de novo na próxima vez
      throw erro
    })
  return rede
}

/**
 * Rota da posição do visitante até o ponto, no mesmo formato que a API em Java
 * devolvia: { destino, distanciaMetros, duracaoMinutos, pontos, foraDosCaminhos }.
 */
export async function tracarRotaAte(destino, latitude, longitude, evitarEscadas = false) {
  const grafo = await carregarRede()
  const rota = calcularRota(
    grafo,
    { latitude, longitude },
    { latitude: destino.latitude, longitude: destino.longitude },
    evitarEscadas,
  )
  return { destino, ...rota }
}
