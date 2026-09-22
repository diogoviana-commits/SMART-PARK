import { useCallback, useEffect, useMemo, useState } from 'react'
import MapaParque, { CENTRO_PARQUE } from './components/MapaParque.jsx'
import FiltroCategorias from './components/FiltroCategorias.jsx'
import CardPoi from './components/CardPoi.jsx'
import PainelEventos from './components/PainelEventos.jsx'
import { calcularRota, listarCategorias, listarEventos, listarPois } from './api.js'

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

  const [fonteGrande, setFonteGrande] = useState(false)
  const [erro, setErro] = useState(null)

  // Catalogos que nao mudam com os filtros
  useEffect(() => {
    listarCategorias().then(setCategorias).catch((e) => setErro(e.message))
    listarEventos().then(setEventos).catch((e) => setErro(e.message))
  }, [])

  // Recarrega os pontos sempre que um filtro muda (RF06)
  useEffect(() => {
    listarPois({ busca: buscaAplicada, categoria: categoriaAtiva, acessivel: somenteAcessiveis })
      .then((resultado) => {
        setPois(resultado)
        setErro(null)
      })
      .catch((e) => setErro(e.message))
  }, [buscaAplicada, categoriaAtiva, somenteAcessiveis])

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

  const poiSelecionado = useMemo(
    () => pois.find((poi) => poi.id === poiSelecionadoId) ?? null,
    [pois, poiSelecionadoId],
  )

  const selecionarPoi = useCallback((poi) => {
    setPoiSelecionadoId(poi?.id ?? null)
    setRota(null)
  }, [])

  const pedirRota = useCallback(async () => {
    if (!poiSelecionado || !posicaoUsuario) return
    setCalculandoRota(true)
    try {
      setRota(await calcularRota(poiSelecionado.id, posicaoUsuario[0], posicaoUsuario[1]))
      setErro(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCalculandoRota(false)
    }
  }, [poiSelecionado, posicaoUsuario])

  // Vindo da agenda: limpa os filtros para garantir que o ponto do evento aparece
  const selecionarPorId = useCallback((poiId) => {
    setCategoriaAtiva(null)
    setSomenteAcessiveis(false)
    setBusca('')
    setBuscaAplicada('')
    setPoiSelecionadoId(poiId)
    setRota(null)
  }, [])

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Smart Park</h1>
          <p>Parque Espaço Verde Chico Mendes · São Caetano do Sul</p>
        </div>
        <button
          type="button"
          className="botao-acessibilidade"
          aria-pressed={fonteGrande}
          onClick={() => setFonteGrande((valor) => !valor)}
        >
          A+ Fonte maior
        </button>
      </header>

      <div className="corpo">
        <aside className="lateral">
          {erro && <div className="aviso erro">{erro}</div>}
          {!posicaoUsuario && (
            <div className="aviso info">
              Permita o acesso à localização para ver sua posição no mapa e calcular rotas.
            </div>
          )}

          <form
            className="busca"
            onSubmit={(evento) => {
              evento.preventDefault()
              setBuscaAplicada(busca)
            }}
          >
            <label htmlFor="campo-busca" style={{ position: 'absolute', left: -9999 }}>
              Buscar ponto de interesse
            </label>
            <input
              id="campo-busca"
              type="search"
              placeholder="Buscar banheiro, quadra, lanchonete..."
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
            <button type="submit" className="chip">
              Buscar
            </button>
          </form>

          <FiltroCategorias
            categorias={categorias}
            categoriaAtiva={categoriaAtiva}
            aoTrocarCategoria={setCategoriaAtiva}
            somenteAcessiveis={somenteAcessiveis}
            aoTrocarAcessibilidade={setSomenteAcessiveis}
          />

          {poiSelecionado && (
            <>
              <div className="secao-titulo">Ponto selecionado</div>
              <CardPoi
                poi={poiSelecionado}
                rota={rota}
                calculandoRota={calculandoRota}
                aoPedirRota={pedirRota}
                temLocalizacao={Boolean(posicaoUsuario)}
              />
            </>
          )}

          <div className="secao-titulo">
            Pontos de interesse ({pois.length})
          </div>
          <ul className="lista-pois">
            {pois.map((poi) => (
              <li key={poi.id}>
                <button
                  type="button"
                  className={`item-poi ${poi.id === poiSelecionadoId ? 'ativo' : ''}`}
                  onClick={() => selecionarPoi(poi)}
                >
                  <span className="marca" style={{ background: poi.categoria.cor }} />
                  <span>
                    <span className="nome">{poi.nome}</span>
                    <span className="meta">
                      {poi.categoria.nome}
                      {poi.acessivel ? ' · acessível' : ''}
                      {poi.statusOperacional === 'EM_MANUTENCAO' ? ' · em manutenção' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {pois.length === 0 && (
              <li style={{ fontSize: '0.85em', color: '#6b7280' }}>
                Nenhum ponto encontrado com esses filtros.
              </li>
            )}
          </ul>

          <div className="secao-titulo">Agenda de eventos</div>
          <PainelEventos eventos={eventos} aoSelecionarLocal={selecionarPorId} />
        </aside>

        <main className="mapa-area">
          <MapaParque
            pois={pois}
            poiSelecionado={poiSelecionado}
            aoSelecionarPoi={selecionarPoi}
            posicaoUsuario={posicaoUsuario ?? null}
            rota={rota}
            centroPadrao={CENTRO_PARQUE}
          />
        </main>
      </div>
    </div>
  )
}
