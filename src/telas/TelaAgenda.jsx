import { useEffect, useMemo, useState } from 'react'
import { listarEventos } from '../api.js'
import { Cabecalho, Carregando, Erro } from '../components/Comuns.jsx'

const DIA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Data local do evento (o horário vem do parque, sem fuso). */
const data = (iso) => new Date(iso)

function chaveDoDia(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Agenda de eventos (RF08): os próximos 30 dias, agrupados por dia. Tocar em
 * "Ver no mapa" leva ao local do evento.
 */
export default function TelaAgenda({ verNoMapa }) {
  const [eventos, setEventos] = useState(null)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    setErro(null)
    listarEventos()
      .then(setEventos)
      .catch((e) => setErro(e.message))
  }, [tentativa])

  const grupos = useMemo(() => {
    if (!eventos) return []
    const hoje = new Date()
    const fimDaSemana = new Date(hoje)
    fimDaSemana.setDate(hoje.getDate() + (7 - ((hoje.getDay() + 6) % 7)))
    fimDaSemana.setHours(0, 0, 0, 0)
    const filtrados = eventos.filter((e) => {
      const d = data(e.dataHoraInicio)
      if (filtro === 'hoje') return chaveDoDia(d) === chaveDoDia(hoje)
      if (filtro === 'semana') return d < fimDaSemana
      return true
    })
    const mapa = new Map()
    for (const e of filtrados) {
      const chave = chaveDoDia(data(e.dataHoraInicio))
      if (!mapa.has(chave)) mapa.set(chave, { dia: data(e.dataHoraInicio), eventos: [] })
      mapa.get(chave).eventos.push(e)
    }
    return [...mapa.values()]
  }, [eventos, filtro])

  return (
    <div className="tela">
      <Cabecalho sobretitulo="Espaço Verde Chico Mendes" titulo="Agenda">
        <div className="abas-tela" role="tablist" aria-label="Período">
          {[
            ['todos', 'Próximos 30 dias'],
            ['semana', 'Esta semana'],
            ['hoje', 'Hoje'],
          ].map(([id, rotulo]) => (
            <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}>
              {rotulo}
            </button>
          ))}
        </div>
      </Cabecalho>

      <main className="tela-conteudo">
        {erro && <Erro mensagem={erro} aoTentarDeNovo={() => setTentativa((n) => n + 1)} />}
        {!eventos && !erro && <Carregando />}

        {eventos && grupos.length === 0 && (
          <div className="vazio-tela">
            <p>
              {filtro === 'todos'
                ? 'Nenhum evento programado para os próximos 30 dias.'
                : 'Nenhum evento neste período. Veja os próximos 30 dias.'}
            </p>
            <p className="dica">A agenda é publicada pela administração do parque. Os avisos oficiais aparecem no Feed.</p>
          </div>
        )}

        {grupos.map((g) => (
          <section key={chaveDoDia(g.dia)} className="agenda-dia">
            <h2>{DIA.format(g.dia)}</h2>
            <ul className="lista-cartoes">
              {g.eventos.map((e) => (
                <li key={e.id} className="cartao-evento">
                  <div className="cartao-evento-hora num">
                    {HORA.format(data(e.dataHoraInicio))}
                    {e.dataHoraFim && <span>até {HORA.format(data(e.dataHoraFim))}</span>}
                  </div>
                  <div className="cartao-evento-corpo">
                    <h3>{e.nome}</h3>
                    {e.descricao && <p>{e.descricao}</p>}
                    {e.local && <p className="cartao-evento-local">{e.local}</p>}
                    <div className="cartao-acoes">
                      {e.poiId && (
                        <button type="button" className="botao-secundario" onClick={() => verNoMapa(e.poiId)}>
                          Ver no mapa
                        </button>
                      )}
                      {e.linkMaisInfo && (
                        <a className="botao-discreto" href={e.linkMaisInfo} target="_blank" rel="noreferrer">
                          Mais informações
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
