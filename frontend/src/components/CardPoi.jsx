import { IconeCategoria } from '../icones.jsx'

const ROTULOS_STATUS = {
  EM_FUNCIONAMENTO: 'Aberto',
  EM_MANUTENCAO: 'Em manutenção',
  FECHADO: 'Fechado',
}

function horario(poi) {
  if (!poi.horarioAbertura || !poi.horarioFechamento) return 'Sempre aberto'
  return `${poi.horarioAbertura.slice(0, 5)} – ${poi.horarioFechamento.slice(0, 5)}`
}

function distanciaLegivel(metros) {
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`
}

/**
 * Card do ponto selecionado (RF07), com o botão que traça a rota a pé (RF05).
 */
export default function CardPoi({ poi, rota, calculandoRota, aoPedirRota, temLocalizacao }) {
  const rotaDesteponto = rota && rota.destino.id === poi.id ? rota : null

  return (
    <div className="card">
      <div className="card-topo">
        <span className="selo" style={{ background: poi.categoria.cor }}>
          <IconeCategoria slug={poi.categoria.slug} tamanho={15} />
        </span>
        <div>
          <h3>{poi.nome}</h3>
          <span className="card-categoria">
            {poi.categoria.nome}
            {poi.notaMedia != null && (
              <>
                {' · '}
                <span className="nota">★ {poi.notaMedia.toFixed(1)}</span>
                {` (${poi.totalAvaliacoes})`}
              </>
            )}
          </span>
        </div>
      </div>

      {poi.descricao && <p className="card-descricao">{poi.descricao}</p>}

      <dl className="dados">
        <div className="dado">
          <dt>Situação</dt>
          <dd className={`estado-${poi.statusOperacional}`}>
            {ROTULOS_STATUS[poi.statusOperacional] ?? poi.statusOperacional}
          </dd>
        </div>
        <div className="dado">
          <dt>Horário</dt>
          <dd>{horario(poi)}</dd>
        </div>
        <div className="dado">
          <dt>Acessibilidade</dt>
          <dd>{poi.acessivel ? 'Adaptado' : 'Sem adaptação'}</dd>
        </div>
      </dl>

      <div className="acoes">
        <button
          type="button"
          className="botao-principal"
          onClick={aoPedirRota}
          disabled={calculandoRota || !temLocalizacao}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4ZM13 15v-3h-2.5a2 2 0 0 0-1.5.7V15H7v-2.8A3.8 3.8 0 0 1 10.5 10H13V7l4 4-4 4Z" />
          </svg>
          {calculandoRota ? 'Calculando…' : 'Como chegar a pé'}
        </button>

        {!temLocalizacao && (
          <p className="dica">
            A rota precisa da sua localização. Ative o GPS e permita o acesso no navegador.
          </p>
        )}

        {rotaDesteponto && (
          <div className="rota-resumo">
            <strong>{distanciaLegivel(rotaDesteponto.distanciaMetros)}</strong>
            <span>
              cerca de {rotaDesteponto.duracaoMinutos} min a pé — o trajeto está traçado no mapa
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
