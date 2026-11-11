import { useCallback, useEffect, useState } from 'react'
import { meuPerfil, perfilDe, quemSigo, seguir } from '../api.js'
import { Avatar, BarraNivel, Cabecalho, Carregando, Erro, PedirConta } from '../components/Comuns.jsx'

const km = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const MES_ANO = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

function Estrelas({ nota }) {
  if (!nota) return <span className="dica">sem nota</span>
  return (
    <span className="nota" aria-label={`Sua nota: ${nota} de 5`}>
      {'★'.repeat(nota)}
      <span className="estrelas-vazias">{'★'.repeat(5 - nota)}</span>
    </span>
  )
}

function Engrenagem({ irPara }) {
  return (
    <button type="button" className="botao-icone-claro" aria-label="Ajustes" onClick={() => irPara('ajustes')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
      </svg>
    </button>
  )
}

/**
 * Perfil: o seu (estatísticas, conquistas, pontos visitados, amigos) ou o de
 * outra pessoa (nível, medalhas e o botão de seguir). De outra pessoa, nunca
 * aparecem e-mail, nome completo nem os pontos visitados.
 */
export default function TelaPerfil({ sessao, aoPedirLogin, irPara, verNoMapa, usuarioId }) {
  const proprio = !usuarioId || usuarioId === sessao?.usuario?.id
  const [perfil, setPerfil] = useState(null)
  const [amigos, setAmigos] = useState([])
  const [erro, setErro] = useState(null)

  const carregar = useCallback(() => {
    setErro(null)
    setPerfil(null)
    if (proprio && !sessao) return
    const pedido = proprio ? meuPerfil() : perfilDe(usuarioId)
    pedido.then(setPerfil).catch((e) => setErro(e.message))
    if (proprio) quemSigo().then(setAmigos).catch(() => {})
  }, [proprio, sessao, usuarioId])

  useEffect(carregar, [carregar])

  async function alternarSeguir() {
    if (!sessao) return aoPedirLogin()
    const r = await seguir(perfil.id, !perfil.euSigo)
    setPerfil((p) => ({ ...p, euSigo: r.euSigo, seguidores: p.seguidores + (r.euSigo ? 1 : -1) }))
  }

  if (proprio && !sessao) {
    return (
      <div className="tela">
        <Cabecalho titulo="Perfil" acao={<Engrenagem irPara={irPara} />} />
        <main className="tela-conteudo">
          <PedirConta
            texto="Entre para acompanhar seu nível, suas medalhas, os pontos que você visitou e seguir outras pessoas."
            aoPedirLogin={aoPedirLogin}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="tela">
      <Cabecalho
        sobretitulo={perfil ? `Nível ${perfil.nivel.nivel} · desde ${MES_ANO.format(new Date(perfil.desde))}` : 'Perfil'}
        titulo={perfil?.nome ?? '…'}
        acao={proprio ? <Engrenagem irPara={irPara} /> : <button type="button" className="botao-icone-claro" aria-label="Voltar" onClick={() => history.back()}>←</button>}
      >
        {perfil && (
          <div className="perfil-topo">
            <Avatar nome={perfil.nome} tamanho={64} />
            <div className="perfil-seguidores">
              <span><strong className="num">{perfil.seguidores}</strong> seguidores</span>
              <span><strong className="num">{perfil.seguindo}</strong> seguindo</span>
            </div>
            {!proprio && (
              <button type="button" className={perfil.euSigo ? 'botao-contorno-claro' : 'botao-lima'} aria-pressed={perfil.euSigo} onClick={alternarSeguir}>
                {perfil.euSigo ? 'Seguindo' : 'Seguir'}
              </button>
            )}
          </div>
        )}
        {perfil && <BarraNivel nivel={perfil.nivel} />}
      </Cabecalho>

      <main className="tela-conteudo">
        {erro && <Erro mensagem={erro} aoTentarDeNovo={carregar} />}
        {!perfil && !erro && <Carregando />}

        {perfil && (
          <>
            <dl className="estatisticas">
              <div>
                <dt>km na semana</dt>
                <dd className="num">{km.format(perfil.estatisticas.quilometrosNaSemana)}</dd>
              </div>
              <div>
                <dt>visitas</dt>
                <dd className="num">{perfil.estatisticas.visitas}</dd>
              </div>
              <div>
                <dt>medalhas</dt>
                <dd className="num">{perfil.estatisticas.medalhas}</dd>
              </div>
              <div>
                <dt>avaliações</dt>
                <dd className="num">{perfil.estatisticas.avaliacoes}</dd>
              </div>
            </dl>

            <section className="secao-tela">
              <div className="secao-tela-titulo">
                <h2>Conquistas</h2>
                <button type="button" className="link" onClick={() => irPara('missoes')}>
                  ver todas
                </button>
              </div>
              <ul className="conquistas">
                {perfil.medalhas.map((m) => (
                  <li key={m.id} className={m.conquistada ? 'conquista-ganha' : undefined}>
                    <span aria-hidden="true">🏅</span>
                    <span>{m.nome}</span>
                    <span className="so-leitor">{m.conquistada ? 'conquistada' : 'ainda não conquistada'}</span>
                  </li>
                ))}
              </ul>
            </section>

            {proprio && (
              <section className="secao-tela">
                <div className="secao-tela-titulo">
                  <h2>Pontos visitados</h2>
                  <span className="dica">últimos 7 dias</span>
                </div>
                {perfil.pontosVisitados.length === 0 ? (
                  <p className="vazio">Nenhuma visita registrada nesta semana. Use "Registrar visita aqui" em Missões.</p>
                ) : (
                  <ul className="lista-simples">
                    {perfil.pontosVisitados.map((p) => (
                      <li key={p.poiId}>
                        <button type="button" className="link-linha" onClick={() => verNoMapa(p.poiId)}>
                          {p.nome}
                        </button>
                        <Estrelas nota={p.minhaNota} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {proprio && (
              <section className="secao-tela">
                <div className="secao-tela-titulo">
                  <h2>Amigos</h2>
                  <span className="dica">quem você segue</span>
                </div>
                {amigos.length === 0 ? (
                  <p className="vazio">Você ainda não segue ninguém. Toque no nome de alguém no Feed ou no ranking para ver o perfil.</p>
                ) : (
                  <ul className="lista-simples">
                    {amigos.map((a) => (
                      <li key={a.id}>
                        <button type="button" className="link-linha" onClick={() => irPara(`perfil/${a.id}`)}>
                          <Avatar nome={a.nome} tamanho={30} /> {a.nome}
                        </button>
                        <span className="dica">Nível {a.nivel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
