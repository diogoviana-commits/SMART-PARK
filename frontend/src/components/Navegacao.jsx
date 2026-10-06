import { comprimento, distanciaLegivel, minutosAPe } from '../geo.js'

/**
 * Faixa sobre o mapa enquanto há uma rota: para onde se vai, quanto falta e o
 * aviso de chegada. A distância e o tempo diminuem conforme o visitante anda.
 */
export default function Navegacao({ rota, restante, chegou, semLocalizacao, aoEncerrar }) {
  const metros = restante && restante.length > 1 ? comprimento(restante) : rota.distanciaMetros

  if (chegou) {
    return (
      <div className="navegacao navegacao-chegou" role="status">
        <div className="navegacao-texto">
          <strong>Você chegou!</strong>
          <span>{rota.destino.nome}</span>
        </div>
        <button type="button" className="navegacao-botao" onClick={aoEncerrar}>
          Fechar
        </button>
      </div>
    )
  }

  return (
    <div className="navegacao" role="status" aria-live="polite">
      <div className="navegacao-texto">
        <span className="navegacao-destino">Indo para {rota.destino.nome}</span>
        <strong>
          {distanciaLegivel(metros)} · {minutosAPe(metros)} min a pé
        </strong>
        {rota.foraDosCaminhos && (
          <small>Você está longe dos caminhos mapeados: o começo do trajeto é em linha reta.</small>
        )}
        {semLocalizacao && <small>Sem sinal de GPS: a distância não está sendo atualizada.</small>}
      </div>
      <button type="button" className="navegacao-botao" onClick={aoEncerrar} aria-label="Encerrar a rota">
        Encerrar
      </button>
    </div>
  )
}
