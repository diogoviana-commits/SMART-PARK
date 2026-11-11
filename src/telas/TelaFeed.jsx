import { useCallback, useEffect, useState } from 'react'
import {
  apagarPublicacao,
  carregarFeed,
  comentar,
  curtir,
  denunciar,
  listarComentarios,
  listarPois,
  publicar,
} from '../api.js'
import { Avatar, Cabecalho, Carregando, Erro, PedirConta, haQuanto } from '../components/Comuns.jsx'

function Aviso({ aviso, verNoMapa }) {
  return (
    <article className="aviso-oficial" aria-label="Aviso oficial">
      <p className="aviso-oficial-rotulo">Aviso oficial · {haQuanto(aviso.inicio)}</p>
      <h3>{aviso.titulo}</h3>
      <p>{aviso.texto}</p>
      {aviso.poiId && (
        <button type="button" className="botao-escuro" onClick={() => verNoMapa(aviso.poiId)}>
          Ver no mapa{aviso.poiNome ? `: ${aviso.poiNome}` : ''}
        </button>
      )}
    </article>
  )
}

function Comentarios({ publicacao, sessao, aoPedirLogin, aoMudarTotal }) {
  const [lista, setLista] = useState(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState(null)

  useEffect(() => {
    listarComentarios(publicacao.id)
      .then(setLista)
      .catch((e) => setErro(e.message))
  }, [publicacao.id])

  async function enviar(evento) {
    evento.preventDefault()
    if (!texto.trim()) return
    try {
      const novo = await comentar(publicacao.id, texto.trim())
      setLista((l) => [...(l ?? []), novo])
      aoMudarTotal(1)
      setTexto('')
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <div className="comentarios">
      {erro && <p className="caixa-erro">{erro}</p>}
      {lista === null && !erro && <Carregando />}
      {lista?.length === 0 && <p className="dica">Nenhum comentário ainda.</p>}
      <ul>
        {lista?.map((k) => (
          <li key={k.id}>
            <strong>{k.meu ? 'Você' : k.autor.nome}</strong> {k.texto}
          </li>
        ))}
      </ul>
      {sessao ? (
        <form className="comentar" onSubmit={enviar}>
          <label className="so-leitor" htmlFor={`comentar-${publicacao.id}`}>
            Escreva um comentário
          </label>
          <input
            id={`comentar-${publicacao.id}`}
            maxLength={300}
            placeholder="Escreva um comentário…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="botao-secundario" disabled={!texto.trim()}>
            Enviar
          </button>
        </form>
      ) : (
        <button type="button" className="botao-discreto" onClick={aoPedirLogin}>
          Entre para comentar
        </button>
      )}
    </div>
  )
}

function Publicacao({ p, sessao, aoPedirLogin, irPara, verNoMapa, aoRemover }) {
  const [estado, setEstado] = useState(p)
  const [abrirComentarios, setAbrirComentarios] = useState(false)
  const [menu, setMenu] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  async function alternarCurtida() {
    if (!sessao) return aoPedirLogin()
    const r = await curtir(estado.id, !estado.curtiu)
    setEstado((e) => ({ ...e, curtiu: r.curtiu, curtidas: r.curtidas }))
  }

  async function fazerDenuncia() {
    setMenu(false)
    if (!sessao) return aoPedirLogin()
    try {
      const r = await denunciar(estado.id)
      setMensagem(r.oculta ? 'Obrigado. Com as denúncias de outras pessoas, a publicação saiu do feed até a administração revisar.' : 'Denúncia recebida. Obrigado por avisar.')
      if (r.oculta) aoRemover(estado.id)
    } catch (e) {
      setMensagem(e.message)
    }
  }

  async function apagar() {
    await apagarPublicacao(estado.id)
    aoRemover(estado.id)
  }

  return (
    <article className="publicacao">
      <header className="publicacao-topo">
        <button type="button" className="publicacao-autor" onClick={() => irPara(estado.minha ? 'perfil' : `perfil/${estado.autor.id}`)}>
          <Avatar nome={estado.autor.nome} tamanho={36} />
          <span>
            <strong>{estado.minha ? 'Você' : estado.autor.nome}</strong>
            <span className="publicacao-meta">
              Nível {estado.autor.nivel} · {haQuanto(estado.momento)}
            </span>
          </span>
        </button>
        {estado.poiId && (
          <button type="button" className="etiqueta-ponto" onClick={() => verNoMapa(estado.poiId)}>
            {estado.poiNome}
          </button>
        )}
        <button type="button" className="botao-icone" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          ⋯
        </button>
        {menu && (
          <div className="menu-flutuante">
            {estado.minha ? (
              <button type="button" onClick={() => { setMenu(false); setConfirmarApagar(true) }}>
                Apagar publicação
              </button>
            ) : (
              <button type="button" onClick={fazerDenuncia}>
                Denunciar publicação
              </button>
            )}
          </div>
        )}
      </header>

      <p className="publicacao-texto">{estado.texto}</p>

      {confirmarApagar && (
        <div className="confirmacao" role="alert">
          <p>Apagar esta publicação? Não dá para desfazer.</p>
          <div className="confirmacao-acoes">
            <button type="button" className="botao-perigo" onClick={apagar}>
              Sim, apagar
            </button>
            <button type="button" className="botao-discreto" onClick={() => setConfirmarApagar(false)}>
              Manter
            </button>
          </div>
        </div>
      )}
      {mensagem && <p className="dica" role="status">{mensagem}</p>}

      <footer className="publicacao-acoes">
        <button type="button" className="acao-curtir" aria-pressed={estado.curtiu} onClick={alternarCurtida}>
          <span aria-hidden="true">{estado.curtiu ? '♥' : '♡'}</span> {estado.curtidas}
          <span className="so-leitor"> curtidas{estado.curtiu ? ', você curtiu' : ''}</span>
        </button>
        <button type="button" aria-expanded={abrirComentarios} onClick={() => setAbrirComentarios((v) => !v)}>
          <span aria-hidden="true">💬</span> {estado.comentarios}
          <span className="so-leitor"> comentários</span>
        </button>
      </footer>

      {abrirComentarios && (
        <Comentarios
          publicacao={estado}
          sessao={sessao}
          aoPedirLogin={aoPedirLogin}
          aoMudarTotal={(n) => setEstado((e) => ({ ...e, comentarios: e.comentarios + n }))}
        />
      )}
    </article>
  )
}

function NovaPublicacao({ aoPublicar }) {
  const [texto, setTexto] = useState('')
  const [poiId, setPoiId] = useState('')
  const [pontos, setPontos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    listarPois().then(setPontos).catch(() => {})
  }, [])

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      aoPublicar(await publicar(texto.trim(), poiId ? Number(poiId) : null))
      setTexto('')
      setPoiId('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="nova-publicacao" onSubmit={enviar}>
      <label className="so-leitor" htmlFor="nova-publicacao">
        Compartilhe uma dica ou sugestão
      </label>
      <textarea
        id="nova-publicacao"
        rows={2}
        maxLength={500}
        placeholder="Compartilhe uma dica ou sugestão sobre o parque…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="nova-publicacao-acoes">
        <label className="campo-compacto">
          <span className="so-leitor">Ponto do parque (opcional)</span>
          <select value={poiId} onChange={(e) => setPoiId(e.target.value)}>
            <option value="">Marcar um ponto (opcional)</option>
            {pontos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao-principal" disabled={enviando || !texto.trim()}>
          {enviando ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
      <p className="dica">{texto.length}/500 · Publicações com 3 denúncias saem do feed até a administração revisar.</p>
      {erro && <p className="caixa-erro">{erro}</p>}
    </form>
  )
}

/**
 * Feed "No parque hoje": avisos oficiais da administração no topo e as
 * publicações dos visitantes, com curtidas, comentários e denúncia.
 */
export default function TelaFeed({ sessao, aoPedirLogin, irPara, verNoMapa }) {
  const [aba, setAba] = useState('para-voce')
  const [feed, setFeed] = useState(null)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(() => {
    setErro(null)
    setFeed(null)
    carregarFeed(aba)
      .then(setFeed)
      .catch((e) => setErro(e.message))
  }, [aba])

  useEffect(() => {
    if (aba === 'seguindo' && !sessao) return
    carregar()
  }, [carregar, aba, sessao])

  const remover = (id) => setFeed((f) => ({ ...f, publicacoes: f.publicacoes.filter((p) => p.id !== id) }))

  return (
    <div className="tela">
      <Cabecalho sobretitulo="Comunidade" titulo="No parque hoje">
        <div className="abas-tela" role="tablist" aria-label="Publicações">
          <button type="button" role="tab" aria-selected={aba === 'para-voce'} onClick={() => setAba('para-voce')}>
            Para você
          </button>
          <button type="button" role="tab" aria-selected={aba === 'seguindo'} onClick={() => setAba('seguindo')}>
            Seguindo
          </button>
        </div>
      </Cabecalho>

      <main className="tela-conteudo">
        {sessao ? (
          <NovaPublicacao aoPublicar={(p) => setFeed((f) => (f ? { ...f, publicacoes: [p, ...f.publicacoes] } : f))} />
        ) : (
          <PedirConta texto="Entre para publicar dicas, curtir e comentar. Ler o feed é livre." aoPedirLogin={aoPedirLogin} />
        )}

        {aba === 'seguindo' && !sessao ? null : (
          <>
            {erro && <Erro mensagem={erro} aoTentarDeNovo={carregar} />}
            {!feed && !erro && <Carregando />}
            {feed?.avisos.map((a) => <Aviso key={a.id} aviso={a} verNoMapa={verNoMapa} />)}
            {feed && feed.publicacoes.length === 0 && (
              <p className="vazio">
                {aba === 'seguindo'
                  ? 'Ninguém que você segue publicou ainda. Toque no nome de alguém no feed para ver o perfil e seguir.'
                  : 'Nenhuma publicação ainda. Que tal ser a primeira pessoa?'}
              </p>
            )}
            {feed?.publicacoes.map((p) => (
              <Publicacao
                key={p.id}
                p={p}
                sessao={sessao}
                aoPedirLogin={aoPedirLogin}
                irPara={irPara}
                verNoMapa={verNoMapa}
                aoRemover={remover}
              />
            ))}
          </>
        )}
      </main>
    </div>
  )
}
