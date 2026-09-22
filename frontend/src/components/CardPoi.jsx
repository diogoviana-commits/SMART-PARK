const ROTULOS_STATUS = {
  EM_FUNCIONAMENTO: 'Em funcionamento',
  EM_MANUTENCAO: 'Em manutenção',
  FECHADO: 'Fechado',
}

function horario(poi) {
  if (!poi.horarioAbertura || !poi.horarioFechamento) return 'Sempre aberto'
  return `${poi.horarioAbertura.slice(0, 5)} às ${poi.horarioFechamento.slice(0, 5)}`
}

/**
 * Card informativo do ponto selecionado, com o botao que pede a rota a pe (RF07, RF05).
 */
export default function CardPoi({ poi, rota, calculandoRota, aoPedirRota, temLocalizacao }) {
  return (
    <div className="card-poi">
      <span className="categoria" style={{ background: poi.categoria.cor }}>
        {poi.categoria.nome}
      </span>
      <h3>{poi.nome}</h3>
      {poi.descricao && <p>{poi.descricao}</p>}

      <div className="linha-dado">
        <span>Situação</span>
        <span className={`status-${poi.statusOperacional}`}>
          {ROTULOS_STATUS[poi.statusOperacional] ?? poi.statusOperacional}
        </span>
      </div>
      <div className="linha-dado">
        <span>Horário</span>
        <span>{horario(poi)}</span>
      </div>
      <div className="linha-dado">
        <span>Acessibilidade</span>
        <span>{poi.acessivel ? 'Acessível' : 'Sem adaptação'}</span>
      </div>

      <button
        type="button"
        className="botao-rota"
        onClick={aoPedirRota}
        disabled={calculandoRota || !temLocalizacao}
      >
        {calculandoRota ? 'Calculando...' : 'Como chegar a pé'}
      </button>

      {!temLocalizacao && (
        <p style={{ fontSize: '0.8em', marginTop: 8 }}>
          Ative a localização para traçar a rota até aqui.
        </p>
      )}

      {rota && rota.destino.id === poi.id && (
        <div className="resumo-rota">
          <strong>{Math.round(rota.distanciaMetros)} m</strong> · aproximadamente{' '}
          <strong>{rota.duracaoMinutos} min</strong> a pé
        </div>
      )}
    </div>
  )
}
