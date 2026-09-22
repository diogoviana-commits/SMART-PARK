// Camada fina de acesso à API do Smart Park.
//
// Em desenvolvimento, VITE_API_URL fica vazia e as chamadas saem como caminho
// relativo (/api/...), que o Vite encaminha para o Spring Boot — sem CORS.
//
// Em produção o front e a API ficam em servidores diferentes (o Vercel não roda
// Java), então VITE_API_URL precisa apontar para o endereço público da API.
// Sem essa variável, o site publicado pediria /api ao próprio domínio do Vercel
// e receberia 404 em tudo.
const BASE_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const API_FORA_DO_AR = BASE_API
  ? `Não foi possível falar com a API em ${BASE_API}. Verifique se ela está no ar.`
  : 'Não foi possível falar com a API. Confira se ela está rodando em ' +
    'http://localhost:8080 (janela "Smart Park - API") e tente de novo.'

async function pedir(caminho, parametros) {
  const url = new URL(BASE_API + caminho, BASE_API || window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  let resposta
  try {
    resposta = await fetch(url)
  } catch {
    // A API não respondeu: fora do ar, endereço errado ou CORS bloqueado.
    throw new Error(API_FORA_DO_AR)
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    if (corpo?.mensagem) {
      // Erro tratado pelo backend: a mensagem já vem pronta para o usuário.
      throw new Error(corpo.mensagem)
    }
    if (resposta.status >= 500) {
      throw new Error(API_FORA_DO_AR)
    }
    throw new Error(`Erro ${resposta.status} ao consultar a API.`)
  }

  return resposta.json()
}

export const listarCategorias = () => pedir('/api/categorias')

export const listarPois = ({ busca, categoria, acessivel } = {}) =>
  pedir('/api/pois', { busca, categoria, acessivel: acessivel ? true : undefined })

export const calcularRota = (poiId, lat, lon) => pedir(`/api/pois/${poiId}/rota`, { lat, lon })

export const listarEventos = () => pedir('/api/eventos')
