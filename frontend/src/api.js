// Camada de acesso à API do Smart Park, com reserva embutida.
//
// Em desenvolvimento, VITE_API_URL fica vazia e as chamadas saem como caminho
// relativo (/api/...), que o Vite encaminha para o Spring Boot — sem CORS.
//
// Em produção o front e a API ficam em servidores diferentes (a Vercel não roda
// Java), então VITE_API_URL aponta para o endereço público da API.
//
// Quando a API não responde, as consultas caem para os dados embutidos em
// dadosDemonstracao.js. Sem isso o endereço publicado mostraria um mapa vazio
// sempre que o backend estivesse fora do ar. A tela avisa que está nesse modo:
// não é para o visitante achar que está vendo dados ao vivo.
import { CATEGORIAS_DEMO, eventosDemo, poisDemo } from './dadosDemonstracao.js'

const BASE_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/** A API não está acessível — diferente de ela responder que algo deu errado. */
class ApiIndisponivel extends Error {}

let usandoDemonstracao = false

/** True quando a última consulta veio dos dados embutidos, e não da API. */
export const emModoDemonstracao = () => usandoDemonstracao

async function pedir(caminho, parametros) {
  const url = new URL(BASE_API + caminho, BASE_API || window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  const resposta = await fetch(url)

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    if (corpo?.mensagem) {
      // Erro tratado pelo backend: a mensagem já vem pronta para o usuário.
      throw new Error(corpo.mensagem)
    }
    // Resposta de erro sem o corpo que a nossa API sempre envia: quem respondeu
    // não é ela. É o que acontece no site publicado sem VITE_API_URL, em que o
    // próprio servidor do site devolve 404 para /api.
    throw new ApiIndisponivel(`A API não respondeu (HTTP ${resposta.status}).`)
  }

  try {
    return await resposta.json()
  } catch {
    // Respondeu 200, mas não com JSON. Acontece em servidor estático que devolve
    // o index.html para qualquer rota desconhecida: não é a nossa API.
    throw new ApiIndisponivel('A API respondeu algo que não é JSON.')
  }
}

/**
 * Tenta a API; se ela não responder, usa a reserva embutida.
 *
 * Erro de negócio vindo da API (404, 409...) não vira reserva: aquilo é uma
 * resposta legítima e precisa chegar ao usuário.
 */
async function comReserva(chamada, reserva) {
  try {
    const dados = await chamada()
    usandoDemonstracao = false
    return dados
  } catch (erro) {
    // TypeError = o fetch nem completou (servidor fora do ar, DNS, CORS).
    if (erro instanceof ApiIndisponivel || erro instanceof TypeError) {
      usandoDemonstracao = true
      return reserva()
    }
    throw erro
  }
}

export const listarCategorias = () =>
  comReserva(() => pedir('/api/categorias'), () => CATEGORIAS_DEMO)

export const listarPois = (filtros = {}) =>
  comReserva(
    () =>
      pedir('/api/pois', {
        busca: filtros.busca,
        categoria: filtros.categoria,
        acessivel: filtros.acessivel ? true : undefined,
      }),
    () => poisDemo(filtros),
  )

export const listarEventos = () => comReserva(() => pedir('/api/eventos'), eventosDemo)

export const calcularRota = (poiId, lat, lon) =>
  comReserva(
    () => pedir(`/api/pois/${poiId}/rota`, { lat, lon }),
    () => rotaLocal(poiId, lat, lon),
  )

// ---------------------------------------------------------------- reserva ---

const RAIO_TERRA_METROS = 6_371_000
const VELOCIDADE_CAMINHADA_M_POR_MIN = 5_000 / 60

/**
 * Mesma conta que o RotaService faz no backend (Haversine e 5 km/h), para o
 * botão "Como chegar" continuar funcionando sem a API.
 */
function rotaLocal(poiId, latOrigem, lonOrigem) {
  const destino = poisDemo().find((poi) => poi.id === poiId)
  if (!destino) {
    throw new Error('Ponto de interesse não encontrado.')
  }

  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(destino.latitude - latOrigem)
  const dLon = rad(destino.longitude - lonOrigem)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(latOrigem)) * Math.cos(rad(destino.latitude)) * Math.sin(dLon / 2) ** 2
  const distancia = RAIO_TERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return {
    destino,
    distanciaMetros: Math.round(distancia * 10) / 10,
    duracaoMinutos: Math.max(1, Math.ceil(distancia / VELOCIDADE_CAMINHADA_M_POR_MIN)),
    pontos: [
      { latitude: latOrigem, longitude: lonOrigem },
      { latitude: destino.latitude, longitude: destino.longitude },
    ],
  }
}
