import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import TelaEntrada, { RedefinirSenha } from './components/TelaEntrada.jsx'
import BarraInferior from './components/BarraInferior.jsx'
import PrimeiroAcesso from './components/PrimeiroAcesso.jsx'
import TelaMapa from './telas/TelaMapa.jsx'
import TelaAgenda from './telas/TelaAgenda.jsx'
import TelaMissoes from './telas/TelaMissoes.jsx'
import TelaFeed from './telas/TelaFeed.jsx'
import TelaPerfil from './telas/TelaPerfil.jsx'
import TelaAjustes from './telas/TelaAjustes.jsx'
import { confirmarEmail, quandoSessaoExpirar, sair, sessaoAtual } from './api.js'
import { lerPreferencias, gravarPreferencias, aplicarPreferencias } from './preferencias.js'

// A administração é uma tela grande que só a equipe do parque abre: fica fora do
// pacote que todo visitante baixa.
const TelaAdmin = lazy(() => import('./telas/TelaAdmin.jsx'))

/** Lê a tela da URL: #/mapa, #/agenda, #/missoes, #/feed, #/perfil, #/perfil/12, #/ajustes, #/admin */
function rotaAtual() {
  const [, tela = 'mapa', parametro] = window.location.hash.replace(/^#/, '').split('/')
  return { tela: tela || 'mapa', parametro: parametro || null }
}

/** Avisos da volta do login com Google, quando ele não se completa. */
const MOTIVOS_DE_ENTRADA = {
  'google-cancelado': 'O login com Google não foi concluído. Tente de novo.',
  'google-falhou': 'Não foi possível confirmar sua conta no Google. Tente de novo ou entre com e-mail e senha.',
  'google-sem-email': 'O Google informou que este e-mail ainda não foi verificado. Verifique-o no Google ou entre com e-mail e senha.',
  'conta-bloqueada': 'Esta conta foi bloqueada pela administração do parque.',
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
  const [redefinir, setRedefinir] = useState(null)
  const [recado, setRecado] = useState(null)
  const passagem = useRef(null)

  useEffect(() => {
    const aoMudar = () => setRota(rotaAtual())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  useEffect(() => {
    aplicarPreferencias(preferencias)
    gravarPreferencias(preferencias)
  }, [preferencias])

  // Links recebidos por e-mail e a volta do Google chegam como telas de passagem:
  // fazem o que têm de fazer e saem do endereço, para o código do link não ficar
  // no histórico do navegador.
  useEffect(() => {
    if (!['redefinir', 'confirmar', 'entrar'].includes(rota.tela)) return
    const { tela, parametro } = rota
    // Em desenvolvimento o React roda o efeito duas vezes: o link só é usado uma.
    if (passagem.current === `${tela}/${parametro}`) return
    passagem.current = `${tela}/${parametro}`
    window.history.replaceState(null, '', '#/mapa')
    setRota({ tela: 'mapa', parametro: null })
    if (tela === 'redefinir' && parametro) setRedefinir(parametro)
    if (tela === 'entrar') {
      setAviso(MOTIVOS_DE_ENTRADA[parametro] ?? null)
      setEntrando(true)
    }
    if (tela === 'confirmar' && parametro) {
      confirmarEmail(parametro)
        .then(() => {
          setRecado({ tipo: 'sucesso', texto: 'E-mail confirmado. Obrigado!' })
          setSessao((s) => (s ? { ...s, usuario: { ...s.usuario, emailConfirmado: true } } : s))
        })
        .catch((e) => setRecado({ tipo: 'erro', texto: e.message }))
    }
  }, [rota])

  // O recado some sozinho; quem usa leitor de tela já o ouviu (role="status").
  useEffect(() => {
    if (!recado) return
    const relogio = setTimeout(() => setRecado(null), 8_000)
    return () => clearTimeout(relogio)
  }, [recado])

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
        {rota.tela === 'perfil' && <TelaPerfil {...comum} usuarioId={rota.parametro ? Number(rota.parametro) : null} />}
        {rota.tela === 'admin' && (
          <Suspense fallback={<p className="carregando" role="status">Carregando…</p>}>
            <TelaAdmin {...comum} />
          </Suspense>
        )}
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

      {recado && (
        <div className={`recado recado-${recado.tipo}`} role={recado.tipo === 'erro' ? 'alert' : 'status'}>
          <span>{recado.texto}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setRecado(null)}>
            ×
          </button>
        </div>
      )}

      {!preferencias.tourVisto && <PrimeiroAcesso aoTerminar={() => mudarPreferencia('tourVisto', true)} />}

      {redefinir && (
        <RedefinirSenha
          codigo={redefinir}
          aoFechar={() => setRedefinir(null)}
          aoConcluir={() => {
            setRedefinir(null)
            setSessao(null)
            setAviso('Senha alterada. Entre com a senha nova.')
            setEntrando(true)
          }}
        />
      )}

      {entrando && !redefinir && (
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
