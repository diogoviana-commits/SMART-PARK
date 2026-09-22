const formatador = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Agenda de eventos do parque (RF08). Clicar em um evento com local mapeado
 * leva o mapa ate o ponto correspondente.
 */
export default function PainelEventos({ eventos, aoSelecionarLocal }) {
  if (eventos.length === 0) {
    return <p style={{ fontSize: '0.85em', color: '#6b7280' }}>Nenhum evento nos próximos 30 dias.</p>
  }

  return (
    <ul className="eventos">
      {eventos.map((evento) => {
        const conteudo = (
          <>
            <div className="quando">{formatador.format(new Date(evento.dataHoraInicio))}</div>
            <div className="titulo">{evento.nome}</div>
            {evento.local && <div className="onde">{evento.local}</div>}
          </>
        )

        return (
          <li key={evento.id} className="evento">
            {evento.poiId ? (
              <button
                type="button"
                onClick={() => aoSelecionarLocal(evento.poiId)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                {conteudo}
              </button>
            ) : (
              conteudo
            )}
          </li>
        )
      })}
    </ul>
  )
}
