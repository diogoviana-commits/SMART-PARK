import { useCallback, useEffect, useState } from 'react'
import TelaEntrada from './components/TelaEntrada.jsx'
import BarraInferior from './components/BarraInferior.jsx'
import PrimeiroAcesso from './components/PrimeiroAcesso.jsx'
import TelaMapa from './telas/TelaMapa.jsx'
import TelaAgenda from './telas/TelaAgenda.jsx'
import TelaMissoes from './telas/TelaMissoes.jsx'
import TelaFeed from './telas/TelaFeed.jsx'
import TelaPerfil from './telas/TelaPerfil.jsx'
import TelaAjustes from './telas/TelaAjustes.jsx'
import { quandoSessaoExpirar, sair, sessaoAtual } from './api.js'
import { lerPreferencias, gravarPreferencias, aplicarPreferencias } from './preferencias.js'

/** Lê a tela da URL: #/mapa, #/agenda, #/missoes, #/feed, #/perfil, #/perfil/12, #/ajustes */
function rotaAtual() {
  const [, tela = 'mapa', parametro] = window.location.hash.replace(/^#/, '').split('/')
  return { tela: tela || 'mapa', parametro: parametro ? Number(parametro) : null }
}

/**
 * O app: cinco destinos na barra inferior (Mapa, Agenda, Missões, Feed, Perfil),
 * como no protótipo de alta fidelidade, mais Ajustes a partir do Perfil.
 *
 * O mapa abre sem conta: quem chega ao parque quer achar o banheiro, não
 * preencher cadastro. A conta só é pedida para avaliar, fazer missões, publicar
 * e seguir pessoas; aí a tela de entrada aparece por cima e, ao entrar, a pessoa
 * volta para onde estava.
 */
export default function App() {
  const [rota, setRota] = useState(rotaAtual)
  const [sessao, setSessao] = useState(null)
  const [entrando, setEntrando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [preferencias, setPreferencias] = useState(lerPreferencias)
  const [focarPoi, setFocarPoi] = useState(null)

  useEffect(() => {
    const aoMudar = () => setRota(rotaAtual())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  useEffect(() => {
    aplicarPreferencias(preferencias)
    gravarPreferencias(preferencias)
  }, [preferencias])

  // Sessão que já estava aberta neste navegador (cookie HttpOnly).
  useEffect(() => {
    sessaoAtual()
      .then((atual) => atual && setSessao(atual))
      .catch(() => {}) // sem rede: segue como visitante anônimo
  }, [])

  // Um 401 no meio do uso tira a pessoa da conta, mas não do app.
  useEffect(() => {
    quandoSessaoExpirar(() => {
      setSessao(null)
      setAviso('Sua sessão terminou. Entre de novo para continuar.')
      setEntrando(true)
    })
  }, [])

  // Ao voltar para a aba, confere se a sessão continua valendo (pode ter saído em outro aparelho).
  useEffect(() => {
    if (!sessao) return
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') sessaoAtual().then((atual) => !atual && setSessao(null)).catch(() => {})
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [sessao])

  const irPara = useCallback((caminho) => {
    window.location.hash = `#/${caminho}`
    window.scrollTo(0, 0)
  }, [])

  const verNoMapa = useCallback(
    (poiId) => {
      setFocarPoi(poiId)
      irPara('mapa')
    },
    [irPara],
  )

  const mudarPreferencia = useCallback((chave, valor) => setPreferencias((p) => ({ ...p, [chave]: valor })), [])
  const pedirLogin = useCallback(() => setEntrando(true), [])
  const limparFoco = useCallback(() => setFocarPoi(null), [])

  const comum = { sessao, aoPedirLogin: pedirLogin, irPara, verNoMapa, preferencias }

  return (
    <>
      <div className="casco" data-tela={rota.tela}>
        {rota.tela === 'mapa' && (
          <TelaMapa
            {...comum}
            focarPoi={focarPoi}
            aoFocar={limparFoco}
            aoSair={async () => {
              await sair()
              setSessao(null)
            }}
          />
        )}
        {rota.tela === 'agenda' && <TelaAgenda {...comum} />}
        {rota.tela === 'missoes' && <TelaMissoes {...comum} />}
        {rota.tela === 'feed' && <TelaFeed {...comum} />}
        {rota.tela === 'perfil' && <TelaPerfil {...comum} usuarioId={rota.parametro} />}
        {rota.tela === 'ajustes' && (
          <TelaAjustes
            {...comum}
            aoMudarPreferencia={mudarPreferencia}
            aoAtualizarSessao={setSessao}
            aoSair={async () => {
              await sair()
              setSessao(null)
              irPara('mapa')
            }}
            aoReverTour={() => mudarPreferencia('tourVisto', false)}
          />
        )}
      </div>

      <BarraInferior tela={rota.tela} irPara={irPara} />

      {!preferencias.tourVisto && <PrimeiroAcesso aoTerminar={() => mudarPreferencia('tourVisto', true)} />}

      {entrando && (
        <TelaEntrada
          aviso={aviso}
          aoFechar={() => {
            setEntrando(false)
            setAviso(null)
          }}
          aoAutenticar={(nova) => {
            setSessao(nova)
            setAviso(null)
            setEntrando(false)
          }}
        />
      )}
    </>
  )
}
