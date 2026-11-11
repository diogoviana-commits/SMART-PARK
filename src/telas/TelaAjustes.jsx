import { useEffect, useState } from 'react'
import { apagarConta, atualizarPerfil, meuPerfil } from '../api.js'
import { Cabecalho } from '../components/Comuns.jsx'

function Alternar({ titulo, descricao, ligado, aoMudar, desabilitado }) {
  return (
    <label className="ajuste">
      <span className="ajuste-texto">
        <strong>{titulo}</strong>
        {descricao && <span>{descricao}</span>}
      </span>
      <input type="checkbox" role="switch" className="interruptor" checked={ligado} disabled={desabilitado} onChange={(e) => aoMudar(e.target.checked)} />
    </label>
  )
}

const PERGUNTAS = [
  ['Preciso de conta para usar?', 'Não. Mapa, rotas, agenda e feed abrem sem conta. A conta (gratuita) é pedida para avaliar, publicar, seguir pessoas e fazer as missões.'],
  ['Como funciona a rota?', 'Toque num ponto e em "Como chegar a pé". A rota segue as trilhas e calçadas do parque, é calculada no seu celular e é refeita se você sair do caminho. Com "Só rotas acessíveis" ligado, ela desvia das escadas.'],
  ['Como registro uma visita?', 'Perto de um ponto (até 30 m), abra Missões e toque em "Registrar visita aqui". Cada ponto conta uma vez por dia.'],
  ['Minha localização fica guardada?', 'Não. A posição é usada no seu aparelho para a rota. Ela só é enviada ao registrar uma visita, para conferir que você está no ponto, e não fica num histórico.'],
  ['Como instalo o app?', 'No Android, abra o site no Chrome e toque em "Instalar app" no menu. No iPhone, abra no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".'],
]

/**
 * Ajustes, como no protótipo: acessibilidade, avisos, mapa, idioma e conta.
 * As preferências ficam no aparelho; nome e privacidade, na conta.
 */
export default function TelaAjustes({ sessao, aoPedirLogin, irPara, preferencias, aoMudarPreferencia, aoAtualizarSessao, aoSair, aoReverTour }) {
  const [perfil, setPerfil] = useState(null)
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState(null)
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const [instalar, setInstalar] = useState(null)
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches

  useEffect(() => {
    if (!sessao) return
    meuPerfil()
      .then((p) => {
        setPerfil(p)
        setNome(p.nome)
      })
      .catch(() => {})
  }, [sessao])

  // O Chrome avisa quando o site pode ser instalado; guardamos o aviso para o botão.
  useEffect(() => {
    const aoPoder = (e) => {
      e.preventDefault()
      setInstalar(e)
    }
    window.addEventListener('beforeinstallprompt', aoPoder)
    return () => window.removeEventListener('beforeinstallprompt', aoPoder)
  }, [])

  async function salvarNome(evento) {
    evento.preventDefault()
    try {
      const p = await atualizarPerfil({ nome: nome.trim() })
      setPerfil(p)
      aoAtualizarSessao((s) => (s ? { ...s, usuario: { ...s.usuario, nome: p.nome } } : s))
      setMensagem('Nome atualizado.')
    } catch (e) {
      setMensagem(e.message)
    }
  }

  async function mudarPrivacidade(publico) {
    const p = await atualizarPerfil({ perfilPublico: publico })
    setPerfil(p)
  }

  async function apagar() {
    await apagarConta(sessao.usuario.id)
    aoAtualizarSessao(null)
    irPara('mapa')
  }

  const tamanho = preferencias.tamanhoTexto
  return (
    <div className="tela">
      <Cabecalho
        titulo="Ajustes"
        acao={
          <button type="button" className="botao-icone-claro" aria-label="Voltar ao perfil" onClick={() => irPara('perfil')}>
            ←
          </button>
        }
      />
      <main className="tela-conteudo">
        <section className="grupo-ajustes" aria-labelledby="aj-acess">
          <h2 id="aj-acess">Acessibilidade</h2>
          <div className="ajuste">
            <span className="ajuste-texto">
              <strong>Tamanho do texto</strong>
              <span>Vale para todas as telas</span>
            </span>
            <span className="passo-a-passo">
              <button type="button" aria-label="Diminuir o texto" disabled={tamanho <= 100} onClick={() => aoMudarPreferencia('tamanhoTexto', tamanho - 10)}>
                −
              </button>
              <span className="num" aria-live="polite">{tamanho}%</span>
              <button type="button" aria-label="Aumentar o texto" disabled={tamanho >= 150} onClick={() => aoMudarPreferencia('tamanhoTexto', tamanho + 10)}>
                +
              </button>
            </span>
          </div>
          <Alternar titulo="Alto contraste" descricao="Reforça os textos secundários e as bordas" ligado={preferencias.altoContraste} aoMudar={(v) => aoMudarPreferencia('altoContraste', v)} />
          <Alternar titulo="Só rotas acessíveis" descricao="Mostra só pontos acessíveis e a rota evita escadas" ligado={preferencias.soRotasAcessiveis} aoMudar={(v) => aoMudarPreferencia('soRotasAcessiveis', v)} />
          <Alternar titulo="Descrever imagens" descricao="Escreve o nome da categoria junto dos ícones do mapa" ligado={preferencias.descreverImagens} aoMudar={(v) => aoMudarPreferencia('descreverImagens', v)} />
        </section>

        <section className="grupo-ajustes" aria-labelledby="aj-avisos">
          <h2 id="aj-avisos">Avisos</h2>
          <p className="dica">Por enquanto os avisos aparecem no Feed e na Agenda; notificações no celular chegam numa próxima versão.</p>
          <Alternar titulo="Eventos do parque" ligado={preferencias.avisoEventos} aoMudar={(v) => aoMudarPreferencia('avisoEventos', v)} />
          <Alternar titulo="Missões e medalhas" ligado={preferencias.avisoMissoes} aoMudar={(v) => aoMudarPreferencia('avisoMissoes', v)} />
          <Alternar titulo="Manutenção e segurança" ligado={preferencias.avisoManutencao} aoMudar={(v) => aoMudarPreferencia('avisoManutencao', v)} />
        </section>

        <section className="grupo-ajustes" aria-labelledby="aj-app">
          <h2 id="aj-app">Aplicativo</h2>
          <div className="ajuste">
            <span className="ajuste-texto">
              <strong>Instalar no celular</strong>
              <span>
                {instalado
                  ? 'Já instalado neste aparelho. Os caminhos do parque e as últimas consultas funcionam sem sinal.'
                  : 'Abre em tela cheia, com ícone próprio, e funciona com sinal fraco.'}
              </span>
            </span>
            {!instalado && instalar && (
              <button type="button" className="botao-secundario" onClick={() => instalar.prompt()}>
                Instalar
              </button>
            )}
          </div>
          {!instalado && !instalar && (
            <p className="dica">No iPhone: Safari › Compartilhar › Adicionar à Tela de Início. No Android: menu do Chrome › Instalar app.</p>
          )}
          <div className="ajuste">
            <span className="ajuste-texto">
              <strong>Idioma</strong>
              <span>Português (Brasil)</span>
            </span>
          </div>
        </section>

        <section className="grupo-ajustes" aria-labelledby="aj-conta">
          <h2 id="aj-conta">Conta</h2>
          {!sessao ? (
            <button type="button" className="botao-principal" onClick={aoPedirLogin}>
              Entrar ou criar conta
            </button>
          ) : (
            <>
              <form className="ajuste ajuste-form" onSubmit={salvarNome}>
                <label className="ajuste-texto" htmlFor="aj-nome">
                  <strong>Meus dados</strong>
                  <span>{sessao.usuario.email}</span>
                </label>
                <span className="linha-form">
                  <input id="aj-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
                  <button type="submit" className="botao-secundario" disabled={!nome.trim() || nome.trim() === perfil?.nome}>
                    Salvar
                  </button>
                </span>
              </form>
              <Alternar
                titulo="Perfil público"
                descricao="Aparecer no ranking e poder ser seguido. Desligado, ninguém vê seu perfil."
                ligado={perfil?.perfilPublico ?? true}
                desabilitado={!perfil}
                aoMudar={mudarPrivacidade}
              />
              {mensagem && <p className="dica" role="status">{mensagem}</p>}
              <div className="ajuste">
                <span className="ajuste-texto">
                  <strong>Sair</strong>
                  <span>Encerra a sessão em todos os aparelhos</span>
                </span>
                <button type="button" className="botao-secundario" onClick={aoSair}>
                  Sair
                </button>
              </div>
              {!confirmarApagar ? (
                <button type="button" className="botao-discreto texto-perigo" onClick={() => setConfirmarApagar(true)}>
                  Apagar minha conta
                </button>
              ) : (
                <div className="confirmacao" role="alert">
                  <p>Apagar a conta remove suas avaliações, publicações, visitas e medalhas. Não dá para desfazer.</p>
                  <div className="confirmacao-acoes">
                    <button type="button" className="botao-perigo" onClick={apagar}>
                      Sim, apagar a conta
                    </button>
                    <button type="button" className="botao-discreto" onClick={() => setConfirmarApagar(false)}>
                      Manter
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="grupo-ajustes" aria-labelledby="aj-ajuda">
          <h2 id="aj-ajuda">Ajuda</h2>
          {PERGUNTAS.map(([p, r]) => (
            <details key={p} className="pergunta">
              <summary>{p}</summary>
              <p>{r}</p>
            </details>
          ))}
          <button type="button" className="botao-secundario" onClick={aoReverTour}>
            Rever o tour de boas-vindas
          </button>
        </section>
      </main>
    </div>
  )
}
