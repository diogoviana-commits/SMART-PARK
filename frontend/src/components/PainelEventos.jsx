const DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' })
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const QUANDO = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Agenda de eventos (RF08). Clicar em um evento com local mapeado leva o mapa
 * até o ponto correspondente.
 */
export default function PainelEventos({ eventos, aoSelecionarLocal }) {
  if (eventos.length === 0) {
    return <p className="vazio">Nenhum evento programado para os próximos 30 dias.</p>
  }

  return (
    <ul className="eventos">
      {eventos.map((evento) => {
        const data = new Date(evento.dataHoraInicio)
        const conteudo = (
          <>
            <div className="data-bloco" aria-hidden="true">
              <span className="dia">{DIA.format(data)}</span>
              <span className="mes">{MES.format(data).replace('.', '')}</span>
            </div>
            <div>
              <span className="evento-nome">{evento.nome}</span>
              <span className="evento-meta">
                {QUANDO.format(data)}
                {evento.local && ` · ${evento.local}`}
              </span>
            </div>
          </>
        )

        return (
          <li key={evento.id}>
            {evento.poiId ? (
              <button
                type="button"
                className="evento"
                onClick={() => aoSelecionarLocal(evento.poiId)}
              >
                {conteudo}
              </button>
            ) : (
              <div className="evento">{conteudo}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
