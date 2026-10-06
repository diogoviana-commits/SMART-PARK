import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapaParque from './components/MapaParque.jsx'
import FiltroCategorias from './components/FiltroCategorias.jsx'
import CardPoi from './components/CardPoi.jsx'
import PainelEventos from './components/PainelEventos.jsx'
import TelaEntrada from './components/TelaEntrada.jsx'
import Conta from './components/Conta.jsx'
import Navegacao from './components/Navegacao.jsx'
import { IconeCategoria, Logotipo } from './icones.jsx'
import { distancia, trechoRestante } from './geo.js'
import {
  SessaoExpirada,
  acordarServidor,
  calcularRota,
  listarCategorias,
  listarEventos,
  listarPois,
  quandoSessaoExpirar,
  sair,
  sessaoAtual,
} from './api.js'

/** Afastado da linha mais que isto, o visitante saiu do caminho: a rota é refeita. */
const DESVIO_PARA_RECALCULAR_M = 35
/** Intervalo mínimo entre dois recálculos automáticos, para não martelar a API. */
const INTERVALO_RECALCULO_MS = 20_000
/** A esta distância do destino, considera que a pessoa chegou. */
const RAIO_DE_CHEGADA_M = 20

function Lupa() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

/**
 * Porta de entrada: o mapa só aparece para quem está logado (RNF03).
 *
 * A mesma regra vale no servidor — toda rota de dados da API exige login —,
 * então esconder a tela aqui é conforto, não a proteção em si.
 */
export default function App() {
  // conectando: acordando o servidor e conferindo se já há sessão aberta
  // entrar: servidor no ar, sem sessão  |  logado  |  fora-do-ar
  const [estado, setEstado] = useState('conectando')
  const [sessao, setSessao] = useState(null)
  const [tentativaConexao, setTentativaConexao] = useState(0)
  const [recomecar, setRecomecar] = useState(0)
  const [aviso, setAviso] = useState(null)

  const encerrar = useCallback((mensagem) => {
    setSessao(null)
    setAviso(mensagem ?? null)
    setEstado('entrar')
  }, [])

  // Qualquer 401 da API (sessão expirada, encerrada em outro aparelho) volta
  // para a tela de entrada, em vez de deixar a pessoa num mapa que não carrega.
  useEffect(() => {
    quandoSessaoExpirar(() => encerrar('Sua sessão terminou. Entre de novo para continuar.'))
  }, [encerrar])

  useEffect(() => {
    let cancelado = false
    setEstado((anterior) => (anterior === 'logado' ? anterior : 'conectando'))

    async function conectar() {
      const noAr = await acordarServidor((n) => !cancelado && setTentativaConexao(n))
      if (cancelado) return
      if (!noAr) {
        setEstado((anterior) => (anterior === 'logado' ? anterior : 'fora-do-ar'))
        return
      }
      try {
        const atual = await sessaoAtual()
        if (cancelado) return
        if (atual) {
          setSessao(atual)
          setEstado('logado')
        } else {
          // Se a pessoa entrou pelo formulário enquanto o servidor acordava,
          // a sessão dela já está valendo: não volta para a tela de entrada.
          setEstado((anterior) => (anterior === 'logado' ? anterior : 'entrar'))
        }
      } catch {
        if (!cancelado) setEstado((anterior) => (anterior === 'logado' ? anterior : 'fora-do-ar'))
      }
    }

    conectar()
    return () => {
      cancelado = true
    }
  }, [recomecar])

  // Ao voltar para a aba, confere se a sessão continua valendo: a pessoa pode
  // ter saído em outro aparelho, o que encerra esta sessão também.
  useEffect(() => {
    if (estado !== 'logado') return
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') sessaoAtual().catch(() => {})
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [estado])

  if (estado === 'logado' && sessao) {
    return (
      <TelaMapa
        sessao={sessao}
        aoSair={async () => {
          await sair()
          encerrar(null)
        }}
      />
    )
  }

  return (
    <TelaEntrada
      conectando={estado === 'conectando'}
      foraDoAr={estado === 'fora-do-ar'}
      tentativaConexao={tentativaConexao}
      aviso={aviso}
      aoTentarDeNovo={() => setRecomecar((n) => n + 1)}
      aoAutenticar={(nova) => {
        setSessao(nova)
        setAviso(null)
        setEstado('logado')
      }}
    />
  )
}

/** O mapa do parque, com lista, filtros, agenda e navegação até os pontos. */
function TelaMapa({ sessao, aoSair }) {
  const [categorias, setCategorias] = useState([])
  const [pois, setPois] = useState([])
  const [eventos, setEventos] = useState([])

  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)
  const [somenteAcessiveis, setSomenteAcessiveis] = useState(false)

  const [poiSelecionadoId, setPoiSelecionadoId] = useState(null)
  // { coords: [lat, lon], precisao: metros }
  const [posicaoUsuario, setPosicaoUsuario] = useState(null)
  const [rota, setRota] = useState(null)
  const [calculandoRota, setCalculandoRota] = useState(false)
  const [chegou, setChegou] = useState(false)
  const [seguindo, setSeguindo] = useState(false)
  const ultimoCalculo = useRef(0)

  const [painelAberto, setPainelAberto] = useState(false)
  const [fonteGrande, setFonteGrande] = useState(false)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  /** Sessão expirada já é tratada pelo App, que volta para a tela de entrada. */
  const mostrarErro = useCallback((e) => {
    if (!(e instanceof SessaoExpirada)) setErro(e.message)
  }, [])

  useEffect(() => {
    listarCategorias().then(setCategorias).catch(mostrarErro)
    listarEventos().then(setEventos).catch(mostrarErro)
  }, [tentativa, mostrarErro])

  useEffect(() => {
    listarPois({ busca: buscaAplicada, categoria: categoriaAtiva, acessivel: somenteAcessiveis })
      .then((resultado) => {
        setPois(resultado)
        setErro(null)
      })
      .catch(mostrarErro)
  }, [buscaAplicada, categoriaAtiva, somenteAcessiveis, tentativa, mostrarErro])

  // Localizacao do visitante em tempo real (RF04)
  useEffect(() => {
    if (!navigator.geolocation) return
    const observador = navigator.geolocation.watchPosition(
      (posicao) =>
        setPosicaoUsuario({
          coords: [posicao.coords.latitude, posicao.coords.longitude],
          precisao: posicao.coords.accuracy,
        }),
      () => setPosicaoUsuario(null),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(observador)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('fonte-grande', fonteGrande)
  }, [fonteGrande])

  // Esc recolhe o painel, como manda o padrão de camadas sobrepostas
  useEffect(() => {
    if (!painelAberto) return
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setPainelAberto(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [painelAberto])

  const poiSelecionado = useMemo(
    () => pois.find((poi) => poi.id === poiSelecionadoId) ?? null,
    [pois, poiSelecionadoId],
  )

  /**
   * Traça a rota até o destino. Com o filtro de acessibilidade ligado, a rota
   * desvia das escadas.
   *
   * @param silencioso recálculo automático no meio do caminho: não mexe no
   *        painel nem reenquadra a tela de quem está andando
   */
  const tracarRota = useCallback(
    async (destinoId, { silencioso = false } = {}) => {
      if (!destinoId || !posicaoUsuario) return
      ultimoCalculo.current = Date.now()
      if (!silencioso) setCalculandoRota(true)
      try {
        const nova = await calcularRota(
          destinoId,
          posicaoUsuario.coords[0],
          posicaoUsuario.coords[1],
          somenteAcessiveis,
        )
        if (silencioso) {
          // Só substitui se a pessoa não encerrou a rota enquanto o pedido ia e voltava.
          setRota((atual) => (atual ? { ...nova, recalculada: true } : atual))
        } else {
          setRota(nova)
          setChegou(false)
          setSeguindo(true) // acompanha o visitante enquanto ele anda
          setPainelAberto(false) // deixa o mapa à mostra para acompanhar o trajeto
        }
        setErro(null)
      } catch (e) {
        if (!silencioso) mostrarErro(e)
      } finally {
        if (!silencioso) setCalculandoRota(false)
      }
    },
    [posicaoUsuario, somenteAcessiveis, mostrarErro],
  )

  const pedirRota = useCallback(() => tracarRota(poiSelecionado?.id), [tracarRota, poiSelecionado])

  const encerrarRota = useCallback(() => {
    setRota(null)
    setChegou(false)
  }, [])

  // O trecho que falta, a partir de onde o visitante está agora.
  const linhaDaRota = useMemo(
    () => rota?.pontos.map((p) => [p.latitude, p.longitude]) ?? null,
    [rota],
  )
  const andamento = useMemo(() => {
    if (!linhaDaRota) return null
    if (!posicaoUsuario) return { restante: linhaDaRota, afastamento: 0 }
    return trechoRestante(linhaDaRota, posicaoUsuario.coords)
  }, [linhaDaRota, posicaoUsuario])

  // Chegada e desvio, conferidos a cada nova posição do GPS.
  useEffect(() => {
    if (!rota || chegou || !posicaoUsuario) return
    const destino = [rota.destino.latitude, rota.destino.longitude]
    if (distancia(posicaoUsuario.coords, destino) <= RAIO_DE_CHEGADA_M) {
      setChegou(true)
      return
    }
    // Afastamento menor que a margem de erro do GPS não é desvio: é ruído.
    const margem = Math.max(DESVIO_PARA_RECALCULAR_M, posicaoUsuario.precisao ?? 0)
    if (andamento?.afastamento > margem && Date.now() - ultimoCalculo.current > INTERVALO_RECALCULO_MS) {
      tracarRota(rota.destino.id, { silencioso: true })
    }
  }, [rota, chegou, posicaoUsuario, andamento, tracarRota])

  /** Vindo do mapa: abre o painel, senão o card fica escondido atrás dele. */
  const selecionarNoMapa = useCallback((poi) => {
    setPoiSelecionadoId(poi?.id ?? null)
    setPainelAberto(true)
  }, [])

  const selecionarNaLista = useCallback((poi) => {
    setPoiSelecionadoId(poi?.id ?? null)
    setSeguindo(false) // o mapa vai até o ponto escolhido, em vez de ficar preso no visitante
  }, [])

  const irParaEvento = useCallback((poiId) => {
    setCategoriaAtiva(null)
    setSomenteAcessiveis(false)
    setBusca('')
    setBuscaAplicada('')
    setPoiSelecionadoId(poiId)
    setSeguindo(false)
  }, [])

  const temFiltro = Boolean(buscaAplicada || categoriaAtiva || somenteAcessiveis)

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <Logotipo />
          <div>
            <h1>Smart Park</h1>
            <p>Espaço Verde Chico Mendes</p>
          </div>
        </div>
        <div className="topo-acoes">
          <Conta sessao={sessao} aoSair={aoSair} />
          <button
            type="button"
            className="botao-fonte"
            aria-pressed={fonteGrande}
            onClick={() => setFonteGrande((valor) => !valor)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 20 8.4 4h2.3L16 20h-2.3l-1.3-4H6.6l-1.3 4H3Zm4.2-6h4.3L9.4 7.6 7.2 14Zm11.3 6v-3.2h-3.2v-1.9h3.2V11.7h1.9v3.2h3.2v1.9h-3.2V20h-1.9Z" />
            </svg>
            Fonte
          </button>
        </div>
      </header>

      <div className="corpo">
        <main className="mapa-area">
          <MapaParque
            pois={pois}
            poiSelecionado={poiSelecionado}
            aoSelecionarPoi={selecionarNoMapa}
            posicaoUsuario={posicaoUsuario}
            // Rota recalculada no caminho não reenquadra o mapa: a pessoa está andando.
            rota={rota?.recalculada ? null : rota}
            trajeto={chegou ? null : andamento?.restante}
            seguindo={seguindo}
            aoMudarSeguindo={setSeguindo}
          />
          {rota && (
            <Navegacao
              rota={rota}
              restante={andamento?.restante}
              chegou={chegou}
              semLocalizacao={!posicaoUsuario}
              aoEncerrar={encerrarRota}
            />
          )}
        </main>

        <aside className="painel" data-aberto={painelAberto} aria-label="Pontos e eventos do parque">
          <div className="painel-cabecalho">
            <button
              type="button"
              className="puxador"
              onClick={() => setPainelAberto((valor) => !valor)}
              aria-expanded={painelAberto}
              aria-label={painelAberto ? 'Recolher a lista' : 'Expandir a lista'}
            >
              <span />
            </button>
            <button
              type="button"
              className="botao-recolher"
              onClick={() => setPainelAberto(false)}
              aria-label="Recolher a lista"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>

          <div className="painel-conteudo">
            <form
              className="busca"
              role="search"
              onSubmit={(evento) => {
                evento.preventDefault()
                setBuscaAplicada(busca)
              }}
            >
              <Lupa />
              <input
                type="search"
                aria-label="Buscar ponto de interesse"
                placeholder="Banheiro, quadra, lanchonete…"
                value={busca}
                maxLength={100}
                onChange={(evento) => setBusca(evento.target.value)}
                onBlur={() => setBuscaAplicada(busca)}
              />
            </form>

            {erro && (
              <div className="aviso aviso-erro" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2 1.5 20.5h21L12 2Zm-1 6.5h2v6h-2v-6Zm0 7.5h2v2h-2v-2Z" />
                </svg>
                <div>
                  {erro}{' '}
                  <button type="button" onClick={() => setTentativa((n) => n + 1)}>
                    Tentar de novo
                  </button>
                </div>
              </div>
            )}

            {!posicaoUsuario && !erro && (
              <div className="aviso aviso-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                </svg>
                <div>
                  Permita o acesso à localização para ver onde você está e traçar rotas pelos
                  caminhos do parque.
                </div>
              </div>
            )}

            <FiltroCategorias
              categorias={categorias}
              categoriaAtiva={categoriaAtiva}
              aoTrocarCategoria={setCategoriaAtiva}
              somenteAcessiveis={somenteAcessiveis}
              aoTrocarAcessibilidade={setSomenteAcessiveis}
            />

            {poiSelecionado && (
              <>
                <div className="secao">
                  <h2>Ponto selecionado</h2>
                </div>
                <CardPoi
                  poi={poiSelecionado}
                  rota={rota}
                  calculandoRota={calculandoRota}
                  aoPedirRota={pedirRota}
                  temLocalizacao={Boolean(posicaoUsuario)}
                  evitandoEscadas={somenteAcessiveis}
                  sessao={sessao}
                  // Uma nota nova muda a media do ponto: recarrega a lista para o
                  // card e o item da lista mostrarem o mesmo numero.
                  aoMudarAvaliacao={() => setTentativa((n) => n + 1)}
                />
              </>
            )}

            <div className="secao">
              <h2>Pontos do parque</h2>
              <span>
                {pois.length} {pois.length === 1 ? 'ponto' : 'pontos'}
              </span>
            </div>

            {pois.length > 0 ? (
              <ul className="lista">
                {pois.map((poi) => (
                  <li key={poi.id}>
                    <button
                      type="button"
                      className="item"
                      aria-current={poi.id === poiSelecionadoId}
                      onClick={() => selecionarNaLista(poi)}
                    >
                      <span className="selo" style={{ background: poi.categoria.cor }}>
                        <IconeCategoria slug={poi.categoria.slug} tamanho={15} />
                      </span>
                      <span className="item-texto">
                        <span className="item-nome">{poi.nome}</span>
                        <span className="item-meta">
                          {poi.categoria.nome}
                          {poi.acessivel && ' · acessível'}
                          {poi.statusOperacional === 'EM_MANUTENCAO' && ' · em manutenção'}
                          {poi.notaMedia != null && (
                            <>
                              {' · '}
                              <span className="nota">
                                ★ {poi.notaMedia.toFixed(1)}
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vazio">
                {temFiltro
                  ? 'Nenhum ponto com esses filtros. Tente limpar a busca ou escolher outra categoria.'
                  : 'Nenhum ponto cadastrado ainda.'}
              </p>
            )}

            <div className="secao">
              <h2>Agenda</h2>
              <span>próximos 30 dias</span>
            </div>
            <PainelEventos eventos={eventos} aoSelecionarLocal={irParaEvento} />
          </div>
        </aside>
      </div>
    </div>
  )
}
