import { useCallback, useEffect, useMemo, useState } from 'react'
import MapaParque from './components/MapaParque.jsx'
import FiltroCategorias from './components/FiltroCategorias.jsx'
import CardPoi from './components/CardPoi.jsx'
import PainelEventos from './components/PainelEventos.jsx'
import Acesso from './components/Acesso.jsx'
import Conta from './components/Conta.jsx'
import { IconeCategoria } from './icones.jsx'
import {
  calcularRota,
  conferirSessao,
  emModoDemonstracao,
  listarCategorias,
  listarEventos,
  listarPois,
  sair,
  sessaoAtual,
} from './api.js'

/** Marca do aplicativo: uma árvore dentro de um alfinete de mapa. */
function Logotipo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 2C9.9 2 5 6.8 5 12.7 5 20.5 16 30 16 30s11-9.5 11-17.3C27 6.8 22.1 2 16 2Z"
        fill="#f2ece1"
      />
      <path
        d="M16 7.5l4.4 7.2h-2.6l3 4.9h-3.9V23h-1.8v-3.4H11l3-4.9h-2.6L16 7.5Z"
        fill="#20402f"
      />
    </svg>
  )
}

function Lupa() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

export default function App() {
  const [categorias, setCategorias] = useState([])
  const [pois, setPois] = useState([])
  const [eventos, setEventos] = useState([])

  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)
  const [somenteAcessiveis, setSomenteAcessiveis] = useState(false)

  const [poiSelecionadoId, setPoiSelecionadoId] = useState(null)
  const [posicaoUsuario, setPosicaoUsuario] = useState(null)
  const [rota, setRota] = useState(null)
  const [calculandoRota, setCalculandoRota] = useState(false)

  // A sessao comeca com o que estiver salvo no navegador: assim quem ja entrou
  // nao volta deslogado a cada visita.
  const [sessao, setSessao] = useState(sessaoAtual)
  const [acessoAberto, setAcessoAberto] = useState(false)

  const [painelAberto, setPainelAberto] = useState(false)
  const [fonteGrande, setFonteGrande] = useState(false)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  // True quando os dados vieram da copia embutida, por a API nao ter respondido
  const [demonstracao, setDemonstracao] = useState(false)

  useEffect(() => {
    listarCategorias().then(setCategorias).catch((e) => setErro(e.message))
    listarEventos().then(setEventos).catch((e) => setErro(e.message))
  }, [tentativa])

  useEffect(() => {
    listarPois({ busca: buscaAplicada, categoria: categoriaAtiva, acessivel: somenteAcessiveis })
      .then((resultado) => {
        setPois(resultado)
        setDemonstracao(emModoDemonstracao())
        setErro(null)
      })
      .catch((e) => setErro(e.message))
  }, [buscaAplicada, categoriaAtiva, somenteAcessiveis, tentativa])

  // O token guardado pode ter sido revogado ou o servidor reiniciado: uma
  // conferencia na abertura evita descobrir isso so na hora de enviar algo.
  useEffect(() => {
    if (!sessaoAtual()) return
    conferirSessao().then(setSessao)
  }, [])

  // Localizacao do visitante em tempo real (RF04)
  useEffect(() => {
    if (!navigator.geolocation) return
    const observador = navigator.geolocation.watchPosition(
      (posicao) => setPosicaoUsuario([posicao.coords.latitude, posicao.coords.longitude]),
      () => setPosicaoUsuario(null),
      { enableHighAccuracy: true, maximumAge: 10_000 },
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

  /** Vindo do mapa: abre o painel, senão o card fica escondido atrás dele. */
  const selecionarNoMapa = useCallback((poi) => {
    setPoiSelecionadoId(poi?.id ?? null)
    setRota(null)
    setPainelAberto(true)
  }, [])

  const selecionarNaLista = useCallback((poi) => {
    setPoiSelecionadoId(poi?.id ?? null)
    setRota(null)
  }, [])

  const pedirRota = useCallback(async () => {
    if (!poiSelecionado || !posicaoUsuario) return
    setCalculandoRota(true)
    try {
      setRota(await calcularRota(poiSelecionado.id, posicaoUsuario[0], posicaoUsuario[1]))
      setErro(null)
      setPainelAberto(false) // deixa o mapa à mostra para acompanhar o trajeto
    } catch (e) {
      setErro(e.message)
    } finally {
      setCalculandoRota(false)
    }
  }, [poiSelecionado, posicaoUsuario])

  const irParaEvento = useCallback((poiId) => {
    setCategoriaAtiva(null)
    setSomenteAcessiveis(false)
    setBusca('')
    setBuscaAplicada('')
    setPoiSelecionadoId(poiId)
    setRota(null)
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
          <Conta
            sessao={sessao}
            aoPedirLogin={() => setAcessoAberto(true)}
            aoSair={() => {
              sair()
              setSessao(null)
            }}
          />
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
            posicaoUsuario={posicaoUsuario ?? null}
            rota={rota}
          />
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

            {demonstracao && (
              <div className="aviso aviso-demo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z" />
                </svg>
                <div>
                  Dados de demonstração: o servidor não respondeu, então o mapa está usando uma
                  cópia salva do parque.{' '}
                  <button type="button" onClick={() => setTentativa((n) => n + 1)}>
                    Tentar conectar
                  </button>
                </div>
              </div>
            )}

            {!posicaoUsuario && !erro && !demonstracao && (
              <div className="aviso aviso-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                </svg>
                <div>Permita o acesso à localização para ver onde você está e traçar rotas.</div>
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
                  sessao={sessao}
                  aoPedirLogin={() => setAcessoAberto(true)}
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

      <Acesso
        aberto={acessoAberto}
        aoFechar={() => setAcessoAberto(false)}
        aoAutenticar={(nova) => {
          setSessao(nova)
          setAcessoAberto(false)
        }}
      />
    </div>
  )
}
