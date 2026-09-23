import { useEffect, useMemo, useState } from 'react'
import { avaliar, listarAvaliacoes, removerAvaliacao } from '../api.js'

function Estrela({ cheia }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"
         fill={cheia ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
      <path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8L12 3Z" />
    </svg>
  )
}

const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function quando(iso) {
  try {
    return DATA.format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Escolha da nota em estrelas.
 *
 * Por baixo são cinco radios de verdade, e não divs com onClick: assim funciona
 * com teclado e com leitor de tela sem nenhum código extra, e o formulário sabe
 * que é um campo obrigatório. As estrelas são só a pintura por cima.
 */
function EscolherNota({ valor, aoEscolher, desabilitado }) {
  const [prevista, setPrevista] = useState(null)
  const exibida = prevista ?? valor

  return (
    <fieldset className="estrelas" disabled={desabilitado} onMouseLeave={() => setPrevista(null)}>
      <legend>Sua nota</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className={exibida >= n ? 'estrela-ativa' : undefined}
          onMouseEnter={() => setPrevista(n)}
        >
          <input
            type="radio"
            name="nota"
            value={n}
            checked={valor === n}
            onChange={() => aoEscolher(n)}
            required
          />
          <span aria-hidden="true">
            <Estrela cheia={exibida >= n} />
          </span>
          <span className="so-leitor">
            {n} {n === 1 ? 'estrela' : 'estrelas'}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Avaliações de um ponto (RF11): média, lista e o formulário de quem está logado.
 *
 * A API guarda uma avaliação por pessoa em cada ponto, e avaliar de novo
 * substitui a anterior — então, quando a pessoa já avaliou, o formulário aparece
 * preenchido com a nota dela e o botão diz "Atualizar", em vez de fingir que
 * seria uma avaliação nova.
 */
export default function Avaliacoes({ poi, sessao, aoPedirLogin, aoMudar }) {
  const [avaliacoes, setAvaliacoes] = useState(null)
  const [erro, setErro] = useState(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aberto, setAberto] = useState(false)

  const usuarioId = sessao?.usuario?.id ?? null

  const minha = useMemo(
    () => (avaliacoes ?? []).find((a) => a.usuarioId === usuarioId) ?? null,
    [avaliacoes, usuarioId],
  )

  // Carrega só quando a pessoa abre a seção: são dezenas de pontos no mapa, e
  // buscar as avaliacoes de cada um ao selecionar seria pedido desperdiçado.
  useEffect(() => {
    setAvaliacoes(null)
    setErro(null)
    setAberto(false)
  }, [poi.id])

  useEffect(() => {
    if (!aberto || avaliacoes !== null) return
    let cancelado = false
    listarAvaliacoes(poi.id)
      .then((lista) => !cancelado && setAvaliacoes(lista))
      .catch((e) => !cancelado && setErro(e.message))
    return () => {
      cancelado = true
    }
  }, [aberto, avaliacoes, poi.id])

  useEffect(() => {
    setNota(minha?.nota ?? 0)
    setComentario(minha?.comentario ?? '')
  }, [minha])

  async function enviar(evento) {
    evento.preventDefault()
    if (!nota) return
    setEnviando(true)
    setErro(null)
    try {
      await avaliar(poi.id, nota, comentario)
      setAvaliacoes(await listarAvaliacoes(poi.id))
      aoMudar?.() // a média do ponto mudou: a lista do mapa precisa recarregar
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(id) {
    setEnviando(true)
    setErro(null)
    try {
      await removerAvaliacao(poi.id, id)
      setAvaliacoes(await listarAvaliacoes(poi.id))
      setNota(0)
      setComentario('')
      aoMudar?.()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  // Enquanto a secao esta fechada, a media e a que veio junto com o ponto. Depois
  // de aberta, ela sai da lista carregada aqui: assim o cabecalho muda no mesmo
  // instante em que a avaliacao entra na lista, em vez de esperar o mapa
  // recarregar e ficar dizendo "ainda sem notas" com a nota logo abaixo.
  const total = avaliacoes?.length ?? poi.totalAvaliacoes ?? 0
  const media =
    avaliacoes && avaliacoes.length > 0
      ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length
      : avaliacoes /* lista vazia carregada */
        ? null
        : poi.notaMedia

  return (
    <section className="avaliacoes">
      <button
        type="button"
        className="avaliacoes-abrir"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <span>
          Avaliações
          {media != null ? (
            <span className="nota">
              {' '}
              ★ {media.toFixed(1)} ({total})
            </span>
          ) : (
            <span className="avaliacoes-vazio"> ainda sem notas</span>
          )}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" aria-hidden="true"
             style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <div className="avaliacoes-corpo">
          {erro && (
            <p className="caixa-erro" role="alert">
              {erro}
            </p>
          )}

          {sessao ? (
            <form className="form-avaliacao" onSubmit={enviar}>
              <EscolherNota valor={nota} aoEscolher={setNota} desabilitado={enviando} />
              <label className="campo">
                <span>Comentário (opcional)</span>
                <textarea
                  rows={2}
                  maxLength={600}
                  value={comentario}
                  placeholder="O que ajudaria quem vier depois?"
                  onChange={(e) => setComentario(e.target.value)}
                />
              </label>
              <div className="form-avaliacao-acoes">
                <button type="submit" className="botao-principal" disabled={enviando || !nota}>
                  {enviando ? 'Enviando…' : minha ? 'Atualizar avaliação' : 'Enviar avaliação'}
                </button>
                {minha && (
                  <button
                    type="button"
                    className="botao-discreto"
                    disabled={enviando}
                    onClick={() => apagar(minha.id)}
                  >
                    Apagar a minha
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="dica">
              <button type="button" className="link" onClick={aoPedirLogin}>
                Entre na sua conta
              </button>{' '}
              para avaliar este ponto.
            </p>
          )}

          {avaliacoes === null && !erro && <p className="dica">Carregando…</p>}

          {avaliacoes?.length === 0 && (
            <p className="dica">Nenhuma avaliação ainda. A sua seria a primeira.</p>
          )}

          {avaliacoes?.length > 0 && (
            <ul className="lista-avaliacoes">
              {avaliacoes.map((a) => (
                <li key={a.id}>
                  <div className="avaliacao-topo">
                    <strong>{a.usuarioId === usuarioId ? 'Você' : a.usuarioNome}</strong>
                    <span className="nota" aria-label={`${a.nota} de 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Estrela key={n} cheia={n <= a.nota} />
                      ))}
                    </span>
                  </div>
                  {a.comentario && <p>{a.comentario}</p>}
                  <time dateTime={a.dataAvaliacao}>{quando(a.dataAvaliacao)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
