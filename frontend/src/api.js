// Camada fina de acesso a API do Smart Park.
// O caminho e relativo: em dev o Vite encaminha /api para o Spring Boot (ver vite.config.js).

// Quando a API esta fora do ar, o proxy do Vite responde 500 com corpo vazio.
// Sem esta checagem a tela mostraria "Erro 500", que faz pensar em falha do backend.
const API_FORA_DO_AR =
  'Nao foi possivel falar com a API. Confira se ela esta rodando em http://localhost:8080 ' +
  '(janela "Smart Park - API") e tente de novo.'

async function pedir(caminho, parametros) {
  const url = new URL(caminho, window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  let resposta
  try {
    resposta = await fetch(url)
  } catch {
    // Nem o servidor de desenvolvimento respondeu
    throw new Error(API_FORA_DO_AR)
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    if (corpo?.mensagem) {
      // Erro tratado pelo backend: a mensagem ja vem pronta para o usuario
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
