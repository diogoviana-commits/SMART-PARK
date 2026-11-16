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

// ------------------------------------------------------- missões e visitas ---

export const listarMissoes = () => pedir('/api/missoes')

/** Registra a visita a um ponto; o servidor confere se a posição está a até 30 m. */
export const registrarVisita = (poiId, latitude, longitude) =>
  pedir('/api/visitas', { metodo: 'POST', corpo: { poiId, latitude, longitude } })

export const pontosProximos = (lat, lon, raio = 30) =>
  pedir('/api/pois/proximos', { parametros: { lat, lon, raio } })

// ------------------------------------------------------ favoritos e problemas ---

export const listarFavoritos = () => pedir('/api/favoritos')
export const favoritar = (poiId) => pedir(`/api/pois/${poiId}/favorito`, { metodo: 'POST' })
export const desfavoritar = (poiId) => pedir(`/api/pois/${poiId}/favorito`, { metodo: 'DELETE' })
export const reportarProblema = (poiId, tipo, descricao) =>
  pedir(`/api/pois/${poiId}/problemas`, { metodo: 'POST', corpo: { tipo, descricao: descricao?.trim() || null } })

// ---------------------------------------------------------------------- feed ---

export const carregarFeed = (aba = 'para-voce') => pedir('/api/feed', { parametros: { aba } })
export const publicar = (texto, poiId) =>
  pedir('/api/publicacoes', { metodo: 'POST', corpo: { texto, poiId: poiId || null } })
export const apagarPublicacao = (id) => pedir(`/api/publicacoes/${id}`, { metodo: 'DELETE' })
export const curtir = (id, sim) => pedir(`/api/publicacoes/${id}/curtida`, { metodo: sim ? 'POST' : 'DELETE' })
export const listarComentarios = (id) => pedir(`/api/publicacoes/${id}/comentarios`)
export const comentar = (id, texto) =>
  pedir(`/api/publicacoes/${id}/comentarios`, { metodo: 'POST', corpo: { texto } })
export const denunciar = (id) => pedir(`/api/publicacoes/${id}/denuncia`, { metodo: 'POST' })

// --------------------------------------------------- perfil, amigos e ranking ---

export const meuPerfil = () => pedir('/api/perfil')
export const atualizarPerfil = (dados) => pedir('/api/perfil', { metodo: 'PATCH', corpo: dados })
export const perfilDe = (id) => pedir(`/api/perfis/${id}`)
export const seguir = (id, sim) => pedir(`/api/perfis/${id}/seguir`, { metodo: sim ? 'POST' : 'DELETE' })
export const quemSigo = () => pedir('/api/perfil/seguindo')
export const ranking = (escopo = 'geral') => pedir('/api/ranking', { parametros: { escopo } })
export const apagarConta = (id) => pedir(`/api/usuarios/${id}`, { metodo: 'DELETE' })

// ------------------------------------------- e-mail, senha e login com Google ---

/** O que depende de serviço externo configurado: { email, google }. */
let recursosDoSite = null
export function recursos() {
  recursosDoSite ??= pedir('/api/recursos').catch(() => {
    recursosDoSite = null
    return { email: false, google: false }
  })
  return recursosDoSite
}

/** RF02: pede o link de redefinição. A resposta é a mesma, exista a conta ou não. */
export const esqueciSenha = (email) => pedir('/api/usuarios/senha/esqueci', { metodo: 'POST', corpo: { email } })
export const redefinirSenha = (codigo, senha) =>
  pedir('/api/usuarios/senha/redefinir', { metodo: 'POST', corpo: { codigo, senha }, avisarSeExpirar: false })
/** RF01: confirma o e-mail com o código do link recebido. */
export const confirmarEmail = (codigo) =>
  pedir('/api/usuarios/confirmar', { metodo: 'POST', corpo: { codigo }, avisarSeExpirar: false })
export const reenviarConfirmacao = () => pedir('/api/usuarios/confirmar/reenviar', { metodo: 'POST' })
/** Endereço que inicia o login com Google (navegação da página inteira, não fetch). */
export const ENTRAR_COM_GOOGLE = '/api/usuarios/google/iniciar'

/** RF10: sugestão sobre o parque ou o app, lida pela administração. */
export const enviarSugestao = (texto) => pedir('/api/sugestoes', { metodo: 'POST', corpo: { texto } })

// ------------------------------------------------------------ administração ---

const enviar = (metodo) => (caminho, corpo) => pedir(caminho, { metodo, corpo })
const criar = enviar('POST')
const trocar = enviar('PUT')
const ajustar = enviar('PATCH')
const remover = (caminho) => pedir(caminho, { metodo: 'DELETE' })

/** RF12, UC07–UC10: tudo o que só a administração do parque faz. */
export const administracao = {
  relatorio: (dias) => pedir('/api/relatorios', { parametros: { dias } }),

  criarPonto: (dados) => criar('/api/pois', dados),
  salvarPonto: (id, dados) => trocar(`/api/pois/${id}`, dados),
  removerPonto: (id) => remover(`/api/pois/${id}`),
  enviarFoto: (id, tipo, dados) => trocar(`/api/pois/${id}/foto`, { tipo, dados }),
  removerFoto: (id) => remover(`/api/pois/${id}/foto`),

  eventos: () => pedir('/api/eventos', { parametros: { todos: true } }),
  criarEvento: (dados) => criar('/api/eventos', dados),
  salvarEvento: (id, dados) => trocar(`/api/eventos/${id}`, dados),
  removerEvento: (id) => remover(`/api/eventos/${id}`),

  avisos: () => pedir('/api/avisos', { parametros: { todos: true } }),
  criarAviso: (dados) => criar('/api/avisos', dados),
  salvarAviso: (id, dados) => trocar(`/api/avisos/${id}`, dados),
  removerAviso: (id) => remover(`/api/avisos/${id}`),

  problemas: (situacao) => pedir('/api/problemas', { parametros: { situacao } }),
  marcarProblema: (id, situacao) => ajustar(`/api/problemas/${id}`, { situacao }),
  sugestoes: (situacao) => pedir('/api/sugestoes', { parametros: { situacao } }),
  marcarSugestao: (id, situacao) => ajustar(`/api/sugestoes/${id}`, { situacao }),

  denunciadas: () => pedir('/api/publicacoes/denunciadas'),
  ocultarPublicacao: (id, oculta) => ajustar(`/api/publicacoes/${id}`, { oculta }),

  usuarios: () => pedir('/api/usuarios'),
  mudarUsuario: (id, dados) => ajustar(`/api/usuarios/${id}`, dados),
}
