// Camada fina de acesso a API do Smart Park.
// O caminho e relativo: em dev o Vite encaminha /api para o Spring Boot (ver vite.config.js).

async function pedir(caminho, parametros) {
  const url = new URL(caminho, window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  const resposta = await fetch(url)
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status} ao consultar a API.`
    try {
      const corpo = await resposta.json()
      if (corpo?.mensagem) mensagem = corpo.mensagem
    } catch {
      // resposta sem corpo JSON: mantem a mensagem padrao
    }
    throw new Error(mensagem)
  }
  return resposta.json()
}

export const listarCategorias = () => pedir('/api/categorias')

export const listarPois = ({ busca, categoria, acessivel } = {}) =>
  pedir('/api/pois', { busca, categoria, acessivel: acessivel ? true : undefined })

export const calcularRota = (poiId, lat, lon) => pedir(`/api/pois/${poiId}/rota`, { lat, lon })

export const listarEventos = () => pedir('/api/eventos')
