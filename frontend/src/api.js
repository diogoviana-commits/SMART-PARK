// Camada de acesso à API do Smart Park, com reserva embutida.
//
// Em desenvolvimento, VITE_API_URL fica vazia e as chamadas saem como caminho
// relativo (/api/...), que o Vite encaminha para o Spring Boot — sem CORS.
//
// Em produção o front e a API ficam em servidores diferentes (a Vercel não roda
// Java), então VITE_API_URL aponta para o endereço público da API.
//
// Quando a API não responde, as CONSULTAS caem para os dados embutidos em
// dadosDemonstracao.js. Sem isso o endereço publicado mostraria um mapa vazio
// sempre que o backend estivesse fora do ar. A tela avisa que está nesse modo:
// não é para o visitante achar que está vendo dados ao vivo.
//
// Entrar, cadastrar e avaliar NÃO têm reserva, de propósito. Uma tela que
// fingisse aceitar um cadastro sem servidor estaria mentindo: a conta não
// existiria, e a pessoa descobriria isso na próxima vez que tentasse entrar.
import { CATEGORIAS_DEMO, eventosDemo, poisDemo } from './dadosDemonstracao.js'

// Endereco da API publicada. Fica no codigo, e nao so em variavel de ambiente,
// para o site publicado continuar apontando para o lugar certo sem depender de
// configuracao no painel da Vercel. VITE_API_URL, quando definida, tem
// precedencia — util para apontar para outra API sem mexer no codigo.
const API_PUBLICADA = 'https://smartpark-api-kncs.onrender.com'

// Em desenvolvimento o caminho fica relativo, e o proxy do Vite encaminha para
// a API local; sem isso, rodar localmente falaria com o servidor de producao.
const BASE_API = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || API_PUBLICADA).replace(/\/+$/, '')

/** A API não está acessível — diferente de ela responder que algo deu errado. */
class ApiIndisponivel extends Error {}

/** O token não vale mais (expirou, ou a conta foi removida). */
export class SessaoExpirada extends Error {
  constructor() {
    super('Sua sessão terminou. Entre de novo para continuar.')
  }
}

let usandoDemonstracao = false

/** True quando a última consulta veio dos dados embutidos, e não da API. */
export const emModoDemonstracao = () => usandoDemonstracao

// ------------------------------------------------------------------ sessão ---

const CHAVE_SESSAO = 'smartpark.sessao'

/**
 * Guarda a sessão no localStorage para a pessoa não ter que entrar de novo a
 * cada vez que abre o site. O token é um JWT assinado pelo servidor: quem o
 * copiasse usaria a conta, mas ele vale poucas horas e o servidor não confia em
 * nada além da própria assinatura.
 */
function lerSessaoSalva() {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return null
    const salva = JSON.parse(bruto)
    if (!salva?.token || !salva?.usuario) return null
    // Token vencido não serve para nada: melhor cair na tela de entrar agora do
    // que deixar a pessoa preencher uma avaliação e levar 401 ao enviar.
    if (salva.expiraEm && new Date(salva.expiraEm) <= new Date()) {
      localStorage.removeItem(CHAVE_SESSAO)
      return null
    }
    return salva
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue sem sessão salva.
    return null
  }
}

let sessao = lerSessaoSalva()

function guardarSessao(nova) {
  sessao = nova
  try {
    if (nova) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(nova))
    else localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // Sem armazenamento a sessão vale só enquanto a aba estiver aberta.
  }
  return nova
}

/** Sessão atual, ou null. O App lê isto na primeira renderização. */
export const sessaoAtual = () => sessao

export function sair() {
  guardarSessao(null)
}

// ------------------------------------------------------------------ pedido ---

async function pedir(caminho, { parametros, metodo = 'GET', corpo, comToken = false } = {}) {
  const url = new URL(BASE_API + caminho, BASE_API || window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  const cabecalhos = {}
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  if (comToken) {
    if (!sessao) throw new SessaoExpirada()
    cabecalhos.Authorization = `Bearer ${sessao.token}`
  }

  const resposta = await fetch(url, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

  if (resposta.status === 401 && comToken) {
    // O servidor recusou o token: não adianta tentar de novo com ele.
    guardarSessao(null)
    throw new SessaoExpirada()
  }

  if (resposta.status === 204) return null

  if (!resposta.ok) {
    const corpoErro = await resposta.json().catch(() => null)
    // O TratadorDeErros do backend sempre responde { status, erro, mensagem },
    // inclusive nos erros de validacao, que ele junta em uma frase so.
    if (corpoErro?.mensagem) {
      // Erro tratado pelo backend: a mensagem já vem pronta para o usuário.
      throw new Error(corpoErro.mensagem)
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

/**
 * Para o que só funciona com servidor: troca a falha técnica por uma frase que
 * diz o que aconteceu e o que fazer. Sem isto o usuário veria "Failed to fetch".
 */
async function exigindoServidor(chamada) {
  try {
    return await chamada()
  } catch (erro) {
    if (erro instanceof ApiIndisponivel || erro instanceof TypeError) {
      throw new Error(
        'O servidor não respondeu. Entrar, criar conta e avaliar precisam dele no ar — ' +
          'o mapa continua funcionando com os dados salvos.',
      )
    }
    throw erro
  }
}

// ----------------------------------------------------------------- consulta ---

export const listarCategorias = () =>
  comReserva(() => pedir('/api/categorias'), () => CATEGORIAS_DEMO)

export const listarPois = (filtros = {}) =>
  comReserva(
    () =>
      pedir('/api/pois', {
        parametros: {
          busca: filtros.busca,
          categoria: filtros.categoria,
          acessivel: filtros.acessivel ? true : undefined,
        },
      }),
    () => poisDemo(filtros),
  )

export const listarEventos = () => comReserva(() => pedir('/api/eventos'), eventosDemo)

export const calcularRota = (poiId, lat, lon) =>
  comReserva(
    () => pedir(`/api/pois/${poiId}/rota`, { parametros: { lat, lon } }),
    () => rotaLocal(poiId, lat, lon),
  )

// -------------------------------------------------------- conta e avaliação ---

/** RF02: troca email e senha por um token JWT. */
export const entrar = (email, senha) =>
  exigindoServidor(async () => {
    const resposta = await pedir('/api/usuarios/login', {
      metodo: 'POST',
      corpo: { email, senha },
    })
    return guardarSessao({
      token: resposta.token,
      expiraEm: resposta.expiraEm,
      usuario: resposta.usuario,
    })
  })

/**
 * RF01: cria a conta e já entra com ela.
 *
 * O cadastro devolve o usuário, não o token — então o login vem logo em
 * seguida. São duas chamadas, mas a alternativa seria pedir a senha de novo
 * numa tela de login logo depois de a pessoa tê-la digitado.
 */
export const cadastrar = (nome, email, senha) =>
  exigindoServidor(async () => {
    await pedir('/api/usuarios', { metodo: 'POST', corpo: { nome, email, senha } })
    return entrar(email, senha)
  })

/** Confirma no servidor que a sessão guardada ainda vale. */
export const conferirSessao = async () => {
  if (!sessao) return null
  try {
    const usuario = await pedir('/api/usuarios/eu', { comToken: true })
    return guardarSessao({ ...sessao, usuario })
  } catch (erro) {
    if (erro instanceof SessaoExpirada) return null
    // Servidor fora do ar não é motivo para derrubar a sessão: ela pode valer.
    return sessao
  }
}

export const listarAvaliacoes = (poiId) =>
  exigindoServidor(() => pedir(`/api/pois/${poiId}/avaliacoes`))

/** RF11: avalia de 1 a 5. Avaliar de novo substitui a nota anterior. */
export const avaliar = (poiId, nota, comentario) =>
  exigindoServidor(() =>
    pedir(`/api/pois/${poiId}/avaliacoes`, {
      metodo: 'POST',
      comToken: true,
      corpo: { nota, comentario: comentario?.trim() || null },
    }),
  )

export const removerAvaliacao = (poiId, avaliacaoId) =>
  exigindoServidor(() =>
    pedir(`/api/pois/${poiId}/avaliacoes/${avaliacaoId}`, { metodo: 'DELETE', comToken: true }),
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
