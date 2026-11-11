// Camada de acesso à API do Smart Park.
//
// Todas as chamadas saem como caminho relativo (/api/...), na mesma origem do
// site: em desenvolvimento o Vite encaminha para a API local (porta 8787), e na
// Vercel site e API são o mesmo projeto. Estar na mesma origem é o que permite a
// sessão viajar num cookie HttpOnly, que o JavaScript desta página não consegue
// ler — uma falha de XSS não entregaria o token a ninguém.
//
// O mapa é aberto: consultar o parque não exige conta. A conta só é pedida para
// avaliar e para as missões.

/** Cabeçalho que a API exige em toda requisição que altera algo (proteção CSRF). */
const CABECALHO_DO_SITE = { 'X-Requested-With': 'SmartPark' }

/** Tempo máximo de uma chamada comum, antes de desistir e avisar. */
const TEMPO_LIMITE_MS = 25_000

/** A API não está acessível — diferente de ela responder que algo deu errado. */
export class ApiIndisponivel extends Error {
  constructor(mensagem = 'O servidor não respondeu. Verifique a conexão e tente de novo.') {
    super(mensagem)
  }
}

/** A sessão não vale mais (expirou, saiu em outro aparelho, conta removida). */
export class SessaoExpirada extends Error {
  constructor() {
    super('Sua sessão terminou. Entre de novo para continuar.')
  }
}

// Versões antigas do site guardavam o token no localStorage. Ele é apagado aqui
// para não ficar esquecido no navegador, legível por qualquer script.
try {
  localStorage.removeItem('smartpark.sessao')
} catch {
  // Armazenamento bloqueado: não havia nada salvo, então.
}

// O App se inscreve aqui para voltar à tela de entrar quando a sessão cai.
let aoExpirarSessao = () => {}
export function quandoSessaoExpirar(callback) {
  aoExpirarSessao = callback
}

async function pedir(
  caminho,
  { parametros, metodo = 'GET', corpo, tempoLimite = TEMPO_LIMITE_MS, avisarSeExpirar = true } = {},
) {
  const url = new URL(caminho, window.location.origin)
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, valor)
    }
  })

  const cabecalhos = { ...CABECALHO_DO_SITE, Accept: 'application/json' }
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), tempoLimite)
  let resposta
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
      signal: controle.signal,
    })
  } catch {
    // Rede fora, servidor desligado ou tempo esgotado: o fetch nem completou.
    throw new ApiIndisponivel()
  } finally {
    clearTimeout(relogio)
  }

  if (resposta.status === 204) return null

  const dados = await resposta.json().catch(() => null)

  if (resposta.status === 401 && caminho !== '/api/usuarios/login') {
    if (avisarSeExpirar) aoExpirarSessao()
    throw new SessaoExpirada()
  }

  if (!resposta.ok) {
    // A API sempre responde { status, erro, mensagem }. Sem esse corpo, quem
    // respondeu não foi a API (um 502 da rede, por exemplo).
    if (dados?.mensagem) throw new Error(dados.mensagem)
    throw new ApiIndisponivel()
  }

  if (dados === null) throw new ApiIndisponivel()
  return dados
}

// -------------------------------------------------------------------- sessão ---

/** RF02: entra e abre a sessão (o token fica no cookie, longe do JavaScript). */
export const entrar = (email, senha) =>
  pedir('/api/usuarios/login', { metodo: 'POST', corpo: { email, senha } })

/**
 * RF01: cria a conta e já entra com ela.
 *
 * O cadastro devolve o usuário, não a sessão — então o login vem logo em
 * seguida, sem pedir a senha de novo.
 */
export async function cadastrar(nome, email, senha) {
  await pedir('/api/usuarios', { metodo: 'POST', corpo: { nome, email, senha } })
  return entrar(email, senha)
}

/** Sessão aberta neste navegador, ou null se for preciso entrar. */
export async function sessaoAtual() {
  try {
    // Sem sessão ao abrir o site não é "sessão expirada": é só alguém que ainda
    // não entrou. Por isso esta conferência não dispara o aviso de expiração.
    const usuario = await pedir('/api/usuarios/eu', { avisarSeExpirar: false })
    return { usuario }
  } catch (erro) {
    if (erro instanceof SessaoExpirada) return null
    throw erro
  }
}

/**
 * Encerra a sessão. O servidor invalida o token em todos os aparelhos, não só
 * apaga o cookie deste navegador.
 */
export async function sair() {
  try {
    await pedir('/api/usuarios/sair', { metodo: 'POST' })
  } catch {
    // Mesmo sem resposta, a tela volta para a entrada; o token expira sozinho.
  }
}

// ------------------------------------------------------------------ consulta ---

export const listarCategorias = () => pedir('/api/categorias')

export const listarPois = (filtros = {}) =>
  pedir('/api/pois', {
    parametros: {
      busca: filtros.busca,
      categoria: filtros.categoria,
      acessivel: filtros.acessivel ? true : undefined,
    },
  })

export const listarEventos = () => pedir('/api/eventos')


// --------------------------------------------------------------- avaliação ---

export const listarAvaliacoes = (poiId) => pedir(`/api/pois/${poiId}/avaliacoes`)

/** RF10: avalia de 1 a 5. Avaliar de novo substitui a nota anterior. */
export const avaliar = (poiId, nota, comentario) =>
  pedir(`/api/pois/${poiId}/avaliacoes`, {
    metodo: 'POST',
    corpo: { nota, comentario: comentario?.trim() || null },
  })

export const removerAvaliacao = (poiId, avaliacaoId) =>
  pedir(`/api/pois/${poiId}/avaliacoes/${avaliacaoId}`, { metodo: 'DELETE' })
