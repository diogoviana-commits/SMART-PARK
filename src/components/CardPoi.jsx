import { useEffect, useState } from 'react'
import { IconeCategoria } from '../icones.jsx'
import Avaliacoes from './Avaliacoes.jsx'
import { distancia, distanciaLegivel } from '../geo.js'
import { desfavoritar, favoritar, listarFavoritos, registrarVisita, reportarProblema } from '../api.js'

const TIPOS_DE_PROBLEMA = [
  ['LIMPEZA', 'Sujo ou sem limpeza'],
  ['QUEBRADO', 'Quebrado ou com defeito'],
  ['FECHADO', 'Fechado no horário de funcionamento'],
  ['ACESSIBILIDADE', 'Problema de acessibilidade'],
  ['SEGURANCA', 'Risco à segurança'],
  ['INFORMACAO', 'Informação errada no app'],
  ['OUTRO', 'Outro'],
]

/** A visita só vale a até 30 m do ponto (o servidor confere de novo). */
const RAIO_DA_VISITA_M = 30

/** Favoritos de quem está logado, carregados uma vez e compartilhados entre os cards. */
let favoritosCarregados = null

function ReportarProblema({ poi, aoFechar }) {
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [estado, setEstado] = useState('editando')
  const [erro, setErro] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    setEstado('enviando')
    try {
      await reportarProblema(poi.id, tipo, descricao)
      setEstado('enviado')
    } catch (e) {
      setErro(e.message)
      setEstado('editando')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="aviso aviso-sucesso" role="status">
        <div>
          Obrigado! A administração do parque recebeu o aviso sobre {poi.nome}.{' '}
          <button type="button" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <form className="form-problema" onSubmit={enviar}>
      <fieldset>
        <legend>O que está acontecendo em {poi.nome}?</legend>
        {TIPOS_DE_PROBLEMA.map(([valor, rotulo]) => (
          <label key={valor} className="opcao">
            <input type="radio" name="tipo-problema" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} required />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <label className="campo">
        <span>Detalhes (opcional)</span>
        <textarea rows={2} maxLength={600} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>
      {erro && <p className="caixa-erro" role="alert">{erro}</p>}
      <div className="confirmacao-acoes">
        <button type="submit" className="botao-principal" disabled={!tipo || estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviar aviso'}
        </button>
        <button type="button" className="botao-discreto" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

const ROTULOS_STATUS = {
  EM_FUNCIONAMENTO: 'Aberto',
  EM_MANUTENCAO: 'Em manutenção',
  FECHADO: 'Fechado',
}

function horario(poi) {
  if (!poi.horarioAbertura || !poi.horarioFechamento) return 'Sempre aberto'
  return `${poi.horarioAbertura.slice(0, 5)} – ${poi.horarioFechamento.slice(0, 5)}`
}

/**
 * Card do ponto selecionado (RF07), com o botão que traça a rota a pé (RF05) e
 * as avaliações dos visitantes (RF10).
 */
export default function CardPoi({
  poi,
  rota,
  calculandoRota,
  aoPedirRota,
  temLocalizacao,
  posicaoUsuario,
  evitandoEscadas,
  sessao,
  aoMudarAvaliacao,
  aoPedirLogin,
}) {
  const [favorito, setFavorito] = useState(false)
  const [reportando, setReportando] = useState(false)
  const [visita, setVisita] = useState(null)

  useEffect(() => {
    setReportando(false)
    setVisita(null)
    if (!sessao) {
      favoritosCarregados = null
      setFavorito(false)
      return
    }
    favoritosCarregados ??= listarFavoritos().then((lista) => new Set(lista.map((f) => f.id))).catch(() => new Set())
    favoritosCarregados.then((ids) => setFavorito(ids.has(poi.id)))
  }, [poi.id, sessao])

  async function alternarFavorito() {
    if (!sessao) return aoPedirLogin()
    const novo = !favorito
    setFavorito(novo)
    try {
      await (novo ? favoritar(poi.id) : desfavoritar(poi.id))
      const ids = await favoritosCarregados
      if (ids) novo ? ids.add(poi.id) : ids.delete(poi.id)
    } catch {
      setFavorito(!novo)
    }
  }

  const afastamento = posicaoUsuario ? distancia(posicaoUsuario.coords, [poi.latitude, poi.longitude]) : null
  const pertoDoPonto = afastamento !== null && afastamento <= RAIO_DA_VISITA_M

  async function marcarVisita() {
    if (!sessao) return aoPedirLogin()
    setVisita({ estado: 'enviando' })
    try {
      const r = await registrarVisita(poi.id, posicaoUsuario.coords[0], posicaoUsuario.coords[1])
      setVisita({ estado: 'feita', concluidas: r.missoesConcluidas })
    } catch (e) {
      setVisita({ estado: 'erro', mensagem: e.message })
    }
  }

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

      <div className="card-atalhos">
        <button
          type="button"
          className="botao-icone-card"
          aria-pressed={favorito}
          aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar'}
          title={favorito ? 'Remover dos favoritos' : 'Favoritar'}
          onClick={alternarFavorito}
        >
          {favorito ? '★' : '☆'}
        </button>
        <button
          type="button"
          className="botao-icone-card"
          aria-expanded={reportando}
          aria-label="Reportar problema"
          title="Reportar problema"
          onClick={() => (sessao ? setReportando((v) => !v) : aoPedirLogin())}
        >
          ⚑
        </button>
      </div>

      {poi.descricao && <p className="card-descricao">{poi.descricao}</p>}

      {reportando && <ReportarProblema poi={poi} aoFechar={() => setReportando(false)} />}

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
              cerca de {rotaDesteponto.duracaoMinutos} min a pé pelos caminhos do parque
              {evitandoEscadas && ', sem escadas'} — acompanhe no mapa
            </span>
          </div>
        )}
      </div>

      {pertoDoPonto && visita?.estado !== 'feita' && (
        <div className="estou-aqui">
          <button type="button" className="botao-lima" onClick={marcarVisita} disabled={visita?.estado === 'enviando'}>
            {visita?.estado === 'enviando' ? 'Registrando…' : 'Estou aqui: registrar visita'}
          </button>
          {visita?.estado === 'erro' && <p className="caixa-erro" role="alert">{visita.mensagem}</p>}
        </div>
      )}
      {visita?.estado === 'feita' && (
        <div className="aviso aviso-sucesso" role="status">
          <div>
            Visita registrada (+10 XP)
            {visita.concluidas.length > 0 && <> · Missão concluída: {visita.concluidas.join(', ')}!</>}
          </div>
        </div>
      )}

      <Avaliacoes
        poi={poi}
        sessao={sessao}
        aoMudar={aoMudarAvaliacao}
        aoPedirLogin={aoPedirLogin}
      />
    </div>
  )
}
