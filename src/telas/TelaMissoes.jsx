import { useCallback, useEffect, useState } from 'react'
import { listarMissoes, meuPerfil, pontosProximos, ranking, registrarVisita } from '../api.js'
import { Avatar, BarraNivel, Cabecalho, Carregando, Erro, PedirConta, Progresso, posicaoAtual } from '../components/Comuns.jsx'

const formatoKm = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

function valor(m, x) {
  return m.tipo === 'DISTANCIA' ? `${formatoKm.format(x)} km` : formatoKm.format(x)
}

function Missao({ m }) {
  return (
    <li className={`missao${m.concluida ? ' missao-feita' : ''}`}>
      <span className="missao-marca" aria-hidden="true">
        {m.concluida ? '✓' : ''}
      </span>
      <div className="missao-corpo">
        <div className="missao-topo">
          <strong>{m.descricao ?? m.nome}</strong>
          <span className="missao-xp num">+{m.pontosRecompensa} XP</span>
        </div>
        <Progresso fracao={m.fracaoConcluida} rotulo={`Progresso de ${m.nome}`} />
        <span className="missao-conta num">
          {valor(m, m.progressoAtual)} de {valor(m, m.valorMeta)}
          {m.concluida && ' · concluída'}
        </span>
      </div>
    </li>
  )
}

function Medalha({ m }) {
  return (
    <li className={`medalha${m.conquistada ? ' medalha-ganha' : ''}`}>
      <span className="medalha-icone" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2h10l-2 6H9L7 2Zm5 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2.5-1.2 2.4-2.6.4 1.9 1.8-.5 2.6 2.4-1.3 2.4 1.3-.5-2.6 1.9-1.8-2.6-.4L12 11.5Z" />
        </svg>
      </span>
      <strong>{m.nome}</strong>
      <span className="medalha-descricao">{m.descricao}</span>
      {!m.conquistada && <Progresso fracao={m.progresso / m.meta} rotulo={`Progresso da medalha ${m.nome}`} />}
      <span className="so-leitor">{m.conquistada ? 'Conquistada' : 'Ainda não conquistada'}</span>
    </li>
  )
}

function Ranking({ sessao, irPara }) {
  const [escopo, setEscopo] = useState('geral')
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    setDados(null)
    setErro(null)
    ranking(escopo)
      .then(setDados)
      .catch((e) => setErro(e.message))
  }, [escopo])

  return (
    <section>
      <div className="abas-pequenas" role="tablist" aria-label="Ranking">
        <button type="button" role="tab" aria-selected={escopo === 'geral'} onClick={() => setEscopo('geral')}>
          Todos
        </button>
        <button type="button" role="tab" aria-selected={escopo === 'amigos'} onClick={() => setEscopo('amigos')} disabled={!sessao}>
          Amigos
        </button>
      </div>
      <p className="dica">XP ganho nesta semana (renova toda segunda-feira).</p>
      {erro && <Erro mensagem={erro} />}
      {!dados && !erro && <Carregando />}
      {dados?.posicoes.length === 0 && (
        <p className="vazio">
          {escopo === 'amigos' ? 'Siga pessoas pelo Feed para competir com elas.' : 'Ninguém pontuou nesta semana ainda.'}
        </p>
      )}
      <ol className="ranking">
        {dados?.posicoes.map((p) => (
          <li key={p.usuarioId} className={p.voce ? 'ranking-voce' : undefined}>
            <span className="ranking-posicao num">{p.posicao}º</span>
            <button type="button" className="ranking-pessoa" onClick={() => irPara(p.voce ? 'perfil' : `perfil/${p.usuarioId}`)}>
              <Avatar nome={p.nome} tamanho={34} />
              <span>
                <strong>{p.voce ? `${p.nome} (você)` : p.nome}</strong>
                <span className="ranking-nivel">Nível {p.nivel}</span>
              </span>
            </button>
            <span className="ranking-xp num">{p.xpSemana} XP</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Missões (RF09): nível e XP no topo, e as missões, medalhas e ranking em abas,
 * em vez de tudo de uma vez na mesma tela (heurística 8 da avaliação).
 *
 * O progresso vem do servidor, a partir das visitas registradas: o aparelho não
 * informa quanto andou.
 */
export default function TelaMissoes({ sessao, aoPedirLogin, irPara }) {
  const [aba, setAba] = useState('hoje')
  const [missoes, setMissoes] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [erro, setErro] = useState(null)
  const [visita, setVisita] = useState({ estado: 'parado' })

  const carregar = useCallback(() => {
    setErro(null)
    listarMissoes()
      .then(setMissoes)
      .catch((e) => setErro(e.message))
    if (sessao) meuPerfil().then(setPerfil).catch(() => {})
    else setPerfil(null)
  }, [sessao])

  useEffect(carregar, [carregar])

  async function registrar(poi) {
    setVisita({ estado: 'enviando' })
    try {
      const r = await registrarVisita(poi.id, visita.posicao.latitude, visita.posicao.longitude)
      setVisita({ estado: 'feita', resultado: r })
      carregar()
    } catch (e) {
      setVisita({ estado: 'erro', mensagem: e.message })
    }
  }

  async function procurarPontos() {
    if (!sessao) return aoPedirLogin()
    setVisita({ estado: 'localizando' })
    try {
      const posicao = await posicaoAtual()
      const perto = await pontosProximos(posicao.latitude, posicao.longitude, 30)
      if (perto.length === 0) {
        setVisita({ estado: 'erro', mensagem: 'Nenhum ponto do parque a até 30 m de você. Chegue perto de um ponto do mapa e tente de novo.' })
      } else {
        setVisita({ estado: 'escolher', posicao, perto })
      }
    } catch (e) {
      setVisita({ estado: 'erro', mensagem: e.message })
    }
  }

  const doDia = missoes?.filter((m) => m.periodicidade === 'DIARIA') ?? []
  const daSemana = missoes?.filter((m) => m.periodicidade === 'SEMANAL') ?? []

  return (
    <div className="tela">
      <Cabecalho sobretitulo={perfil ? perfil.nome : 'Gamificação'} titulo="Missões">
        {perfil && <BarraNivel nivel={perfil.nivel} />}
        <button type="button" className="botao-lima" onClick={procurarPontos} disabled={visita.estado === 'localizando' || visita.estado === 'enviando'}>
          {visita.estado === 'localizando' ? 'Procurando pontos perto de você…' : 'Registrar visita aqui'}
        </button>
      </Cabecalho>

      <main className="tela-conteudo">
        {visita.estado === 'escolher' && (
          <div className="caixa-escolha" role="dialog" aria-label="Escolha o ponto da visita">
            <p>Qual destes pontos você está visitando?</p>
            <ul>
              {visita.perto.map((p) => (
                <li key={p.id}>
                  <button type="button" className="botao-secundario" onClick={() => registrar(p)}>
                    {p.nome}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="botao-discreto" onClick={() => setVisita({ estado: 'parado' })}>
              Cancelar
            </button>
          </div>
        )}
        {visita.estado === 'erro' && <Erro mensagem={visita.mensagem} />}
        {visita.estado === 'feita' && (
          <div className="aviso aviso-sucesso" role="status">
            <div>
              Visita registrada: <strong>{visita.resultado.visita.poiNome}</strong> (+10 XP)
              {visita.resultado.visita.metros > 0 && ` · ${formatoKm.format(visita.resultado.visita.metros / 1000)} km caminhados`}
              {visita.resultado.visita.evento && ` · participação em "${visita.resultado.visita.evento.nome}"`}
              {visita.resultado.missoesConcluidas.length > 0 && (
                <> · Missão concluída: {visita.resultado.missoesConcluidas.join(', ')}!</>
              )}
            </div>
          </div>
        )}

        <div className="abas-tela abas-claras" role="tablist" aria-label="Seções de missões">
          {[
            ['hoje', 'Hoje'],
            ['semana', 'Semana'],
            ['medalhas', 'Medalhas'],
            ['ranking', 'Ranking'],
          ].map(([id, rotulo]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>
              {rotulo}
            </button>
          ))}
        </div>

        {erro && <Erro mensagem={erro} aoTentarDeNovo={carregar} />}
        {!missoes && !erro && aba !== 'ranking' && <Carregando />}

        {aba === 'hoje' && missoes && (
          <>
            <p className="dica">Renovam à meia-noite.</p>
            <ul className="lista-missoes">{doDia.map((m) => <Missao key={m.id} m={m} />)}</ul>
          </>
        )}
        {aba === 'semana' && missoes && (
          <>
            <p className="dica">Renovam toda segunda-feira.</p>
            <ul className="lista-missoes">{daSemana.map((m) => <Missao key={m.id} m={m} />)}</ul>
          </>
        )}
        {aba === 'medalhas' &&
          (perfil ? (
            <ul className="grade-medalhas">{perfil.medalhas.map((m) => <Medalha key={m.id} m={m} />)}</ul>
          ) : (
            <PedirConta texto="Entre para ganhar medalhas: elas vêm das suas visitas, caminhadas e avaliações." aoPedirLogin={aoPedirLogin} />
          ))}
        {aba === 'ranking' && <Ranking sessao={sessao} irPara={irPara} />}

        {!sessao && aba !== 'medalhas' && aba !== 'ranking' && (
          <PedirConta texto="Entre para registrar visitas e fazer as missões. A conta é gratuita." aoPedirLogin={aoPedirLogin} />
        )}
      </main>
    </div>
  )
}
