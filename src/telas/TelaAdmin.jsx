import { useCallback, useEffect, useMemo, useState } from 'react'
import { administracao as adm, apagarPublicacao, listarCategorias, listarPois } from '../api.js'
import { Cabecalho, Carregando, Erro, Progresso, haQuanto } from '../components/Comuns.jsx'

/**
 * Administração do parque (RF12; UC07 a UC10 da Especificação): relatórios de
 * uso, pontos, eventos, avisos, problemas e sugestões recebidos, moderação do
 * feed e contas.
 *
 * A tela só organiza: quem decide o que cada pessoa pode fazer é a API, que
 * recusa todas estas chamadas para quem não é da administração.
 */
const SECOES = [
  ['resumo', 'Resumo'],
  ['pontos', 'Pontos'],
  ['eventos', 'Eventos'],
  ['avisos', 'Avisos'],
  ['recebidos', 'Problemas e sugestões'],
  ['feed', 'Feed'],
  ['contas', 'Contas'],
]

const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const DIA_CURTO = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const quando = (iso) => (iso ? DATA.format(new Date(iso)) : '')
/** '2026-11-20T19:00:00' → '2026-11-20T19:00', o formato do campo de data e hora. */
const paraCampo = (iso) => (iso ? iso.slice(0, 16) : '')

/** Carrega uma lista e devolve como recarregar; erro vira mensagem na tela. */
function usarLista(carregar, dependencias = []) {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState(null)
  const [vez, setVez] = useState(0)
  useEffect(() => {
    let vigente = true
    setErro(null)
    carregar()
      .then((r) => vigente && setItens(r))
      .catch((e) => vigente && setErro(e.message))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vez, ...dependencias])
  return { itens, erro, recarregar: useCallback(() => setVez((n) => n + 1), []) }
}

/** Executa uma ação da administração mostrando o erro, se houver. */
function usarAcao(depois) {
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const executar = useCallback(
    async (acao) => {
      setErro(null)
      setOcupado(true)
      try {
        const r = await acao()
        depois?.()
        return r ?? true
      } catch (e) {
        setErro(e.message)
        return false
      } finally {
        setOcupado(false)
      }
    },
    [depois],
  )
  return { executar, erro, ocupado }
}

function Campo({ rotulo, children, dica }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  )
}

/** Excluir pede confirmação no próprio lugar: nada some com um toque só. */
function Excluir({ rotulo = 'Excluir', pergunta, aoConfirmar, ocupado }) {
  const [aberto, setAberto] = useState(false)
  if (!aberto) {
    return (
      <button type="button" className="botao-discreto texto-perigo" onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    )
  }
  return (
    <div className="confirmacao" role="alert">
      <p>{pergunta}</p>
      <div className="confirmacao-acoes">
        <button type="button" className="botao-perigo" disabled={ocupado} onClick={aoConfirmar}>
          Sim, {rotulo.toLowerCase()}
        </button>
        <button type="button" className="botao-discreto" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Estado({ lista, vazio }) {
  if (lista.erro) return <Erro mensagem={lista.erro} aoTentarDeNovo={lista.recarregar} />
  if (!lista.itens) return <Carregando />
  if (lista.itens.length === 0) return <p className="vazio-tela">{vazio}</p>
  return null
}

// ------------------------------------------------------------------- resumo ---

const ROTULOS_PROBLEMA = {
  LIMPEZA: 'Limpeza',
  QUEBRADO: 'Quebrado',
  FECHADO: 'Fechado no horário',
  SEGURANCA: 'Segurança',
  ACESSIBILIDADE: 'Acessibilidade',
  INFORMACAO: 'Informação errada',
  OUTRO: 'Outro',
}

function Ranking({ titulo, linhas, vazio }) {
  const maior = Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <section>
      <div className="secao-tela-titulo">
        <h2>{titulo}</h2>
      </div>
      {linhas.length === 0 ? (
        <p className="dica">{vazio}</p>
      ) : (
        <ul className="ranking-admin">
          {linhas.map((l) => (
            <li key={l.nome}>
              <span className="ranking-admin-nome">{l.nome}</span>
              <span className="num">{l.rotulo ?? l.valor}</span>
              <Progresso fracao={l.valor / maior} rotulo={`${l.nome}: ${l.rotulo ?? l.valor}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Resumo() {
  const [dias, setDias] = useState(30)
  const relatorio = usarLista(() => adm.relatorio(dias), [dias])
  const r = relatorio.itens
  const maiorDia = r ? Math.max(1, ...r.porDia.map((d) => d.visitas)) : 1

  return (
    <>
      <div className="abas-tela abas-claras" role="tablist" aria-label="Período do relatório">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" role="tab" aria-selected={dias === n} onClick={() => setDias(n)}>
            {n} dias
          </button>
        ))}
      </div>
      {relatorio.erro && <Erro mensagem={relatorio.erro} aoTentarDeNovo={relatorio.recarregar} />}
      {!r && !relatorio.erro && <Carregando />}
      {r && (
        <>
          <dl className="estatisticas">
            <div>
              <dt>visitas</dt>
              <dd className="num">{r.totais.visitas}</dd>
            </div>
            <div>
              <dt>visitantes ativos</dt>
              <dd className="num">{r.totais.visitantesAtivos}</dd>
            </div>
            <div>
              <dt>contas novas</dt>
              <dd className="num">{r.totais.contasNovas}</dd>
            </div>
            <div>
              <dt>nota média</dt>
              <dd className="num">{r.totais.notaMedia ?? '–'}</dd>
            </div>
          </dl>
          <p className="dica">
            {r.totais.contas} contas no total ({r.totais.contasBloqueadas} bloqueadas) · {r.totais.avaliacoes} avaliações e{' '}
            {r.totais.publicacoes} publicações no período · {r.totais.problemasAbertos} problemas e {r.totais.sugestoesAbertas}{' '}
            sugestões aguardando.
          </p>

          <section>
            <div className="secao-tela-titulo">
              <h2>Visitas registradas por dia</h2>
              <span className="dica">
                {DIA_CURTO.format(new Date(`${r.periodo.de}T12:00`))} a {DIA_CURTO.format(new Date(`${r.periodo.ate}T12:00`))}
              </span>
            </div>
            {r.totais.visitas === 0 ? (
              <p className="dica">Nenhuma visita registrada neste período.</p>
            ) : (
              <ol className="colunas-dia" aria-label="Visitas por dia">
                {r.porDia.map((d) => (
                  <li key={d.dia} title={`${DIA_CURTO.format(new Date(`${d.dia}T12:00`))}: ${d.visitas} visitas`}>
                    <span style={{ height: `${(d.visitas / maiorDia) * 100}%` }} />
                    <span className="so-leitor">
                      {DIA_CURTO.format(new Date(`${d.dia}T12:00`))}: {d.visitas} visitas
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Ranking
            titulo="Pontos mais visitados"
            vazio="Nenhuma visita registrada neste período."
            linhas={r.pontosMaisVisitados.map((p) => ({ nome: p.nome, valor: p.visitas }))}
          />
          <Ranking
            titulo="Visitas por categoria"
            vazio="Nenhuma visita registrada neste período."
            linhas={r.visitasPorCategoria.map((c) => ({ nome: c.categoria, valor: c.visitas }))}
          />
          <Ranking
            titulo="Pontos mais bem avaliados"
            vazio="Nenhum ponto avaliado ainda."
            linhas={r.pontosMelhorAvaliados.map((p) => ({ nome: p.nome, valor: p.notaMedia, rotulo: `★ ${p.notaMedia.toFixed(1)} (${p.avaliacoes})` }))}
          />
          <Ranking
            titulo="Missões concluídas"
            vazio="Nenhuma missão concluída neste período."
            linhas={r.missoesConcluidas.map((m) => ({ nome: m.missao, valor: m.vezes }))}
          />
          <Ranking
            titulo="Problemas em aberto, por tipo"
            vazio="Nenhum problema em aberto."
            linhas={r.problemasAbertosPorTipo.map((p) => ({ nome: ROTULOS_PROBLEMA[p.tipo] ?? p.tipo, valor: p.total }))}
          />
        </>
      )}
    </>
  )
}

// ------------------------------------------------------------------- pontos ---

const PONTO_NOVO = {
  nome: '',
  descricao: '',
  categoriaSlug: '',
  latitude: '',
  longitude: '',
  horarioAbertura: '',
  horarioFechamento: '',
  statusOperacional: 'EM_FUNCIONAMENTO',
  acessivel: false,
}

/** Lado maior da foto e peso que o servidor aceita: a foto do celular é reduzida antes de subir. */
const FOTO_LADO_MAXIMO = 1280
const FOTO_PESO_MAXIMO = 380 * 1024

async function reduzirFoto(arquivo) {
  const imagem = await createImageBitmap(arquivo)
  const escala = Math.min(1, FOTO_LADO_MAXIMO / Math.max(imagem.width, imagem.height))
  const tela = document.createElement('canvas')
  tela.width = Math.round(imagem.width * escala)
  tela.height = Math.round(imagem.height * escala)
  tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height)
  let qualidade = 0.82
  let blob
  do {
    blob = await new Promise((resolver) => tela.toBlob(resolver, 'image/jpeg', qualidade))
    qualidade -= 0.12
  } while (blob && blob.size > FOTO_PESO_MAXIMO && qualidade > 0.3)
  if (!blob || blob.size > FOTO_PESO_MAXIMO) throw new Error('Não foi possível reduzir esta foto. Tente outra imagem.')
  const url = await new Promise((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(leitor.result)
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler a foto.'))
    leitor.readAsDataURL(blob)
  })
  return String(url).split(',')[1]
}

function FormPonto({ ponto, categorias, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState(() =>
    ponto
      ? {
          nome: ponto.nome,
          descricao: ponto.descricao ?? '',
          categoriaSlug: ponto.categoria.slug,
          latitude: String(ponto.latitude),
          longitude: String(ponto.longitude),
          horarioAbertura: ponto.horarioAbertura?.slice(0, 5) ?? '',
          horarioFechamento: ponto.horarioFechamento?.slice(0, 5) ?? '',
          statusOperacional: ponto.statusOperacional,
          acessivel: ponto.acessivel,
        }
      : PONTO_NOVO,
  )
  const [fotoUrl, setFotoUrl] = useState(ponto?.fotoUrl ?? null)
  const acao = usarAcao()
  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function salvar(evento) {
    evento.preventDefault()
    const corpo = {
      nome: dados.nome,
      descricao: dados.descricao || null,
      categoriaSlug: dados.categoriaSlug,
      latitude: Number(dados.latitude.replace(',', '.')),
      longitude: Number(dados.longitude.replace(',', '.')),
      horarioAbertura: dados.horarioAbertura || null,
      horarioFechamento: dados.horarioFechamento || null,
      statusOperacional: dados.statusOperacional,
      acessivel: dados.acessivel,
    }
    if (await acao.executar(() => (ponto ? adm.salvarPonto(ponto.id, corpo) : adm.criarPonto(corpo)))) aoSalvar()
  }

  async function trocarFoto(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const r = await acao.executar(async () => adm.enviarFoto(ponto.id, 'image/jpeg', await reduzirFoto(arquivo)))
    if (r) setFotoUrl(r.fotoUrl)
  }

  return (
    <form className="form-admin" onSubmit={salvar}>
      <h3>{ponto ? `Editar: ${ponto.nome}` : 'Novo ponto'}</h3>
      <Campo rotulo="Nome">
        <input required maxLength={120} value={dados.nome} onChange={mudar('nome')} />
      </Campo>
      <Campo rotulo="Descrição">
        <textarea rows={3} maxLength={600} value={dados.descricao} onChange={mudar('descricao')} />
      </Campo>
      <div className="form-admin-dupla">
        <Campo rotulo="Categoria">
          <select required value={dados.categoriaSlug} onChange={mudar('categoriaSlug')}>
            <option value="">Escolha…</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Situação">
          <select value={dados.statusOperacional} onChange={mudar('statusOperacional')}>
            <option value="EM_FUNCIONAMENTO">Aberto</option>
            <option value="EM_MANUTENCAO">Em manutenção</option>
            <option value="FECHADO">Fechado</option>
          </select>
        </Campo>
      </div>
      <div className="form-admin-dupla">
        <Campo rotulo="Latitude">
          <input required inputMode="decimal" placeholder="-23.6321" value={dados.latitude} onChange={mudar('latitude')} />
        </Campo>
        <Campo rotulo="Longitude">
          <input required inputMode="decimal" placeholder="-46.5723" value={dados.longitude} onChange={mudar('longitude')} />
        </Campo>
      </div>
      <div className="form-admin-dupla">
        <Campo rotulo="Abre às" dica="Em branco: sempre aberto">
          <input type="time" value={dados.horarioAbertura} onChange={mudar('horarioAbertura')} />
        </Campo>
        <Campo rotulo="Fecha às">
          <input type="time" value={dados.horarioFechamento} onChange={mudar('horarioFechamento')} />
        </Campo>
      </div>
      <label className="opcao">
        <input type="checkbox" checked={dados.acessivel} onChange={mudar('acessivel')} />
        Adaptado para pessoas com deficiência ou mobilidade reduzida
      </label>

      {ponto && (
        <div className="foto-admin">
          {fotoUrl ? <img src={fotoUrl} alt={`Foto atual de ${ponto.nome}`} /> : <p className="dica">Este ponto ainda não tem foto.</p>}
          <div className="confirmacao-acoes">
            <label className="botao-secundario botao-arquivo">
              {fotoUrl ? 'Trocar a foto' : 'Enviar uma foto'}
              <input type="file" accept="image/*" onChange={trocarFoto} disabled={acao.ocupado} />
            </label>
            {fotoUrl && (
              <button
                type="button"
                className="botao-discreto texto-perigo"
                disabled={acao.ocupado}
                onClick={async () => (await acao.executar(() => adm.removerFoto(ponto.id))) && setFotoUrl(null)}
              >
                Remover a foto
              </button>
            )}
          </div>
        </div>
      )}
      {!ponto && <p className="dica">A foto é enviada depois de salvar o ponto.</p>}

      {acao.erro && (
        <p className="caixa-erro" role="alert">
          {acao.erro}
        </p>
      )}
      <div className="confirmacao-acoes">
        <button type="submit" className="botao-principal" disabled={acao.ocupado}>
          {acao.ocupado ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="botao-discreto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      {ponto && (
        <Excluir
          rotulo="Excluir o ponto"
          pergunta={`Excluir "${ponto.nome}" remove também as avaliações, visitas e a foto dele. Não dá para desfazer.`}
          ocupado={acao.ocupado}
          aoConfirmar={async () => (await acao.executar(() => adm.removerPonto(ponto.id))) && aoSalvar()}
        />
      )}
    </form>
  )
}

const SITUACAO_CURTA = { EM_FUNCIONAMENTO: 'aberto', EM_MANUTENCAO: 'em manutenção', FECHADO: 'fechado' }

function Pontos() {
  const pontos = usarLista(() => listarPois())
  const categorias = usarLista(() => listarCategorias())
  const [editando, setEditando] = useState(null) // id, 'novo' ou null
  const [busca, setBusca] = useState('')

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (pontos.itens ?? []).filter((p) => !termo || p.nome.toLowerCase().includes(termo) || p.categoria.nome.toLowerCase().includes(termo))
  }, [pontos.itens, busca])

  const fechar = () => setEditando(null)
  const salvo = () => {
    fechar()
    pontos.recarregar()
  }

  if (editando !== null && categorias.itens) {
    const ponto = editando === 'novo' ? null : pontos.itens?.find((p) => p.id === editando)
    return <FormPonto key={editando} ponto={ponto} categorias={categorias.itens} aoSalvar={salvo} aoFechar={fechar} />
  }

  return (
    <>
      <div className="linha-form">
        <input className="campo-busca-admin" type="search" aria-label="Buscar ponto" placeholder="Buscar por nome ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="botao-principal" onClick={() => setEditando('novo')}>
          Novo ponto
        </button>
      </div>
      <Estado lista={pontos} vazio="Nenhum ponto cadastrado." />
      {pontos.itens && (
        <ul className="lista-simples">
          {visiveis.map((p) => (
            <li key={p.id}>
              <button type="button" className="link-linha" onClick={() => setEditando(p.id)}>
                <strong>{p.nome}</strong>
                <span className="dica">
                  {p.categoria.nome} · {SITUACAO_CURTA[p.statusOperacional]}
                  {p.fotoUrl ? ' · com foto' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ------------------------------------------------------------------ eventos ---

function FormEvento({ evento, pontos, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState(() => ({
    nome: evento?.nome ?? '',
    descricao: evento?.descricao ?? '',
    dataHoraInicio: paraCampo(evento?.dataHoraInicio),
    dataHoraFim: paraCampo(evento?.dataHoraFim),
    poiId: evento?.poiId ? String(evento.poiId) : '',
    localDescritivo: evento && !evento.poiId ? (evento.local ?? '') : '',
    linkMaisInfo: evento?.linkMaisInfo ?? '',
  }))
  const acao = usarAcao(aoSalvar)
  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }))

  function salvar(e) {
    e.preventDefault()
    const corpo = {
      nome: dados.nome,
      descricao: dados.descricao || null,
      dataHoraInicio: dados.dataHoraInicio,
      dataHoraFim: dados.dataHoraFim || null,
      poiId: dados.poiId ? Number(dados.poiId) : null,
      localDescritivo: dados.poiId ? null : dados.localDescritivo || null,
      linkMaisInfo: dados.linkMaisInfo || null,
    }
    acao.executar(() => (evento ? adm.salvarEvento(evento.id, corpo) : adm.criarEvento(corpo)))
  }

  return (
    <form className="form-admin" onSubmit={salvar}>
      <h3>{evento ? `Editar: ${evento.nome}` : 'Novo evento'}</h3>
      <Campo rotulo="Nome">
        <input required maxLength={150} value={dados.nome} onChange={mudar('nome')} />
      </Campo>
      <Campo rotulo="Descrição">
        <textarea rows={3} maxLength={800} value={dados.descricao} onChange={mudar('descricao')} />
      </Campo>
      <div className="form-admin-dupla">
        <Campo rotulo="Começa em">
          <input type="datetime-local" required value={dados.dataHoraInicio} onChange={mudar('dataHoraInicio')} />
        </Campo>
        <Campo rotulo="Termina em">
          <input type="datetime-local" min={dados.dataHoraInicio || undefined} value={dados.dataHoraFim} onChange={mudar('dataHoraFim')} />
        </Campo>
      </div>
      <Campo rotulo="Local no parque" dica="Com o ponto escolhido, o evento ganha o botão “Ver no mapa” e conta para as missões.">
        <select value={dados.poiId} onChange={mudar('poiId')}>
          <option value="">Outro local (descrever abaixo)</option>
          {pontos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      {!dados.poiId && (
        <Campo rotulo="Descrição do local">
          <input required maxLength={200} value={dados.localDescritivo} onChange={mudar('localDescritivo')} />
        </Campo>
      )}
      <Campo rotulo="Link para mais informações (opcional)">
        <input type="url" maxLength={400} placeholder="https://" value={dados.linkMaisInfo} onChange={mudar('linkMaisInfo')} />
      </Campo>
      {acao.erro && (
        <p className="caixa-erro" role="alert">
          {acao.erro}
        </p>
      )}
      <div className="confirmacao-acoes">
        <button type="submit" className="botao-principal" disabled={acao.ocupado}>
          {acao.ocupado ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="botao-discreto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      {evento && (
        <Excluir
          rotulo="Excluir o evento"
          pergunta={`Excluir "${evento.nome}" da agenda? Não dá para desfazer.`}
          ocupado={acao.ocupado}
          aoConfirmar={() => acao.executar(() => adm.removerEvento(evento.id))}
        />
      )}
    </form>
  )
}

function Eventos() {
  const eventos = usarLista(() => adm.eventos())
  const pontos = usarLista(() => listarPois())
  const [editando, setEditando] = useState(null)
  const agora = Date.now()

  if (editando !== null && pontos.itens) {
    const evento = editando === 'novo' ? null : eventos.itens?.find((e) => e.id === editando)
    return (
      <FormEvento
        key={editando}
        evento={evento}
        pontos={pontos.itens}
        aoFechar={() => setEditando(null)}
        aoSalvar={() => {
          setEditando(null)
          eventos.recarregar()
        }}
      />
    )
  }

  // Os próximos primeiro; os que já passaram, depois.
  const ordenados = [...(eventos.itens ?? [])].sort((a, b) => {
    const pa = new Date(a.dataHoraInicio) < agora
    const pb = new Date(b.dataHoraInicio) < agora
    if (pa !== pb) return pa ? 1 : -1
    return pa ? new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio) : new Date(a.dataHoraInicio) - new Date(b.dataHoraInicio)
  })

  return (
    <>
      <button type="button" className="botao-principal" onClick={() => setEditando('novo')}>
        Novo evento
      </button>
      <Estado lista={eventos} vazio="Nenhum evento cadastrado." />
      {eventos.itens && (
        <ul className="lista-simples">
          {ordenados.map((e) => (
            <li key={e.id}>
              <button type="button" className="link-linha" onClick={() => setEditando(e.id)}>
                <strong>{e.nome}</strong>
                <span className="dica">
                  {quando(e.dataHoraInicio)} · {e.local}
                  {new Date(e.dataHoraInicio) < agora ? ' · já passou' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ------------------------------------------------------------------- avisos ---

function FormAviso({ aviso, pontos, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState(() => ({
    titulo: aviso?.titulo ?? '',
    texto: aviso?.texto ?? '',
    poiId: aviso?.poiId ? String(aviso.poiId) : '',
    inicio: paraCampo(aviso?.inicio),
    fim: paraCampo(aviso?.fim),
  }))
  const acao = usarAcao(aoSalvar)
  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }))

  function salvar(e) {
    e.preventDefault()
    const corpo = {
      titulo: dados.titulo,
      texto: dados.texto,
      poiId: dados.poiId ? Number(dados.poiId) : null,
      ...(dados.inicio ? { inicio: dados.inicio } : {}),
      fim: dados.fim || null,
    }
    acao.executar(() => (aviso ? adm.salvarAviso(aviso.id, corpo) : adm.criarAviso(corpo)))
  }

  return (
    <form className="form-admin" onSubmit={salvar}>
      <h3>{aviso ? 'Editar aviso' : 'Novo aviso oficial'}</h3>
      <p className="dica">O aviso aparece no topo do Feed de todos os visitantes enquanto estiver em vigor.</p>
      <Campo rotulo="Título">
        <input required maxLength={120} value={dados.titulo} onChange={mudar('titulo')} />
      </Campo>
      <Campo rotulo="Texto">
        <textarea required rows={4} maxLength={600} value={dados.texto} onChange={mudar('texto')} />
      </Campo>
      <Campo rotulo="Ponto relacionado (opcional)">
        <select value={dados.poiId} onChange={mudar('poiId')}>
          <option value="">Nenhum</option>
          {pontos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div className="form-admin-dupla">
        <Campo rotulo="Vale a partir de" dica="Em branco: agora">
          <input type="datetime-local" value={dados.inicio} onChange={mudar('inicio')} />
        </Campo>
        <Campo rotulo="Vale até" dica="Em branco: até ser removido">
          <input type="datetime-local" min={dados.inicio || undefined} value={dados.fim} onChange={mudar('fim')} />
        </Campo>
      </div>
      {acao.erro && (
        <p className="caixa-erro" role="alert">
          {acao.erro}
        </p>
      )}
      <div className="confirmacao-acoes">
        <button type="submit" className="botao-principal" disabled={acao.ocupado}>
          {acao.ocupado ? 'Salvando…' : aviso ? 'Salvar' : 'Publicar aviso'}
        </button>
        <button type="button" className="botao-discreto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      {aviso && (
        <Excluir
          rotulo="Excluir o aviso"
          pergunta="Excluir este aviso? Ele sai do Feed na hora."
          ocupado={acao.ocupado}
          aoConfirmar={() => acao.executar(() => adm.removerAviso(aviso.id))}
        />
      )}
    </form>
  )
}

function Avisos() {
  const avisos = usarLista(() => adm.avisos())
  const pontos = usarLista(() => listarPois())
  const [editando, setEditando] = useState(null)
  const agora = Date.now()
  const situacao = (a) => (new Date(a.inicio) > agora ? 'agendado' : a.fim && new Date(a.fim) < agora ? 'encerrado' : 'em vigor')

  if (editando !== null && pontos.itens) {
    const aviso = editando === 'novo' ? null : avisos.itens?.find((a) => a.id === editando)
    return (
      <FormAviso
        key={editando}
        aviso={aviso}
        pontos={pontos.itens}
        aoFechar={() => setEditando(null)}
        aoSalvar={() => {
          setEditando(null)
          avisos.recarregar()
        }}
      />
    )
  }

  return (
    <>
      <button type="button" className="botao-principal" onClick={() => setEditando('novo')}>
        Novo aviso
      </button>
      <Estado lista={avisos} vazio="Nenhum aviso publicado." />
      {avisos.itens && (
        <ul className="lista-simples">
          {avisos.itens.map((a) => (
            <li key={a.id}>
              <button type="button" className="link-linha" onClick={() => setEditando(a.id)}>
                <strong>{a.titulo}</strong>
                <span className="dica">
                  {situacao(a)} · desde {quando(a.inicio)}
                  {a.fim ? ` até ${quando(a.fim)}` : ''}
                  {a.poiNome ? ` · ${a.poiNome}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------------------------------------------------- problemas e sugestões ---

const SITUACOES = [
  ['ABERTO', 'Aguardando'],
  ['RESOLVIDO', 'Resolvidos'],
  ['DESCARTADO', 'Descartados'],
]

function Recebidos() {
  const [tipo, setTipo] = useState('problemas')
  const [situacao, setSituacao] = useState('ABERTO')
  const lista = usarLista(() => (tipo === 'problemas' ? adm.problemas(situacao) : adm.sugestoes(situacao)), [tipo, situacao])
  const acao = usarAcao(lista.recarregar)
  const marcar = (id, nova) => acao.executar(() => (tipo === 'problemas' ? adm.marcarProblema(id, nova) : adm.marcarSugestao(id, nova)))

  return (
    <>
      <div className="abas-tela abas-claras" role="tablist" aria-label="O que ver">
        <button type="button" role="tab" aria-selected={tipo === 'problemas'} onClick={() => setTipo('problemas')}>
          Problemas nos pontos
        </button>
        <button type="button" role="tab" aria-selected={tipo === 'sugestoes'} onClick={() => setTipo('sugestoes')}>
          Sugestões
        </button>
      </div>
      <div className="abas-tela abas-claras" role="tablist" aria-label="Situação">
        {SITUACOES.map(([id, rotulo]) => (
          <button key={id} type="button" role="tab" aria-selected={situacao === id} onClick={() => setSituacao(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      {acao.erro && <Erro mensagem={acao.erro} />}
      <Estado lista={lista} vazio={situacao === 'ABERTO' ? 'Nada aguardando. Tudo em dia.' : 'Nada por aqui.'} />
      {lista.itens && (
        <ul className="lista-cartoes">
          {lista.itens.map((item) => (
            <li key={item.id} className="cartao-admin">
              {tipo === 'problemas' ? (
                <>
                  <strong>
                    {ROTULOS_PROBLEMA[item.tipo] ?? item.tipo} · {item.poiNome}
                  </strong>
                  {item.descricao && <p>{item.descricao}</p>}
                </>
              ) : (
                <>
                  <p>{item.texto}</p>
                  <span className="dica">de {item.autor.nome}</span>
                </>
              )}
              <span className="dica">{haQuanto(item.momento)}</span>
              <div className="cartao-acoes">
                {situacao === 'ABERTO' ? (
                  <>
                    <button type="button" className="botao-secundario" disabled={acao.ocupado} onClick={() => marcar(item.id, 'RESOLVIDO')}>
                      Marcar como resolvido
                    </button>
                    <button type="button" className="botao-discreto" disabled={acao.ocupado} onClick={() => marcar(item.id, 'DESCARTADO')}>
                      Descartar
                    </button>
                  </>
                ) : (
                  <button type="button" className="botao-discreto" disabled={acao.ocupado} onClick={() => marcar(item.id, 'ABERTO')}>
                    Reabrir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// --------------------------------------------------------------------- feed ---

function Moderacao() {
  const lista = usarLista(() => adm.denunciadas())
  const acao = usarAcao(lista.recarregar)
  return (
    <>
      <p className="dica">
        Publicações denunciadas por visitantes. Com 3 denúncias de pessoas diferentes, a publicação sai do Feed sozinha e
        espera a sua revisão.
      </p>
      {acao.erro && <Erro mensagem={acao.erro} />}
      <Estado lista={lista} vazio="Nenhuma publicação denunciada." />
      {lista.itens && (
        <ul className="lista-cartoes">
          {lista.itens.map((p) => (
            <li key={p.id} className="cartao-admin">
              <strong>
                {p.autor.nome} · {p.denuncias} {p.denuncias === 1 ? 'denúncia' : 'denúncias'}
                {p.oculta ? ' · oculta' : ''}
              </strong>
              <p>{p.texto}</p>
              <span className="dica">
                {haQuanto(p.momento)}
                {p.poiNome ? ` · em ${p.poiNome}` : ''}
              </span>
              <div className="cartao-acoes">
                <button type="button" className="botao-secundario" disabled={acao.ocupado} onClick={() => acao.executar(() => adm.ocultarPublicacao(p.id, !p.oculta))}>
                  {p.oculta ? 'Devolver ao Feed' : 'Ocultar do Feed'}
                </button>
                <Excluir
                  rotulo="Apagar"
                  pergunta="Apagar esta publicação, com as curtidas e os comentários? Não dá para desfazer."
                  ocupado={acao.ocupado}
                  aoConfirmar={() => acao.executar(() => apagarPublicacao(p.id))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ------------------------------------------------------------------- contas ---

function Contas({ sessao }) {
  const lista = usarLista(() => adm.usuarios())
  const acao = usarAcao(lista.recarregar)
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const visiveis = (lista.itens ?? []).filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo))

  return (
    <>
      <input className="campo-busca-admin" type="search" aria-label="Buscar conta" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {acao.erro && <Erro mensagem={acao.erro} />}
      <Estado lista={lista} vazio="Nenhuma conta." />
      {lista.itens && (
        <ul className="lista-cartoes">
          {visiveis.map((u) => {
            const eu = u.id === sessao.usuario.id
            const admin = u.perfil === 'ADMINISTRADOR'
            return (
              <li key={u.id} className="cartao-admin">
                <strong>
                  {u.nome}
                  {eu ? ' (você)' : ''}
                </strong>
                <span className="dica">
                  {u.email} · {admin ? 'administração' : 'visitante'}
                  {u.emailConfirmado ? '' : ' · e-mail não confirmado'}
                  {u.bloqueado ? ' · BLOQUEADA' : ''}
                </span>
                <span className="dica">
                  desde {quando(u.dataCadastro)}
                  {u.ultimoAcesso ? ` · último acesso em ${quando(u.ultimoAcesso)}` : ' · nunca entrou'}
                </span>
                {!eu && (
                  <div className="cartao-acoes">
                    <button
                      type="button"
                      className={u.bloqueado ? 'botao-secundario' : 'botao-discreto texto-perigo'}
                      disabled={acao.ocupado}
                      onClick={() => acao.executar(() => adm.mudarUsuario(u.id, { bloqueado: !u.bloqueado }))}
                    >
                      {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                      type="button"
                      className="botao-discreto"
                      disabled={acao.ocupado}
                      onClick={() => acao.executar(() => adm.mudarUsuario(u.id, { perfil: admin ? 'VISITANTE' : 'ADMINISTRADOR' }))}
                    >
                      {admin ? 'Tirar da administração' : 'Tornar administrador'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// --------------------------------------------------------------------- tela ---

export default function TelaAdmin({ sessao, aoPedirLogin, irPara }) {
  const [secao, setSecao] = useState('resumo')
  const autorizado = sessao?.usuario?.perfil === 'ADMINISTRADOR'

  return (
    <div className="tela">
      <Cabecalho
        sobretitulo="Espaço Verde Chico Mendes"
        titulo="Administração"
        acao={
          <button type="button" className="botao-icone-claro" aria-label="Voltar aos ajustes" onClick={() => irPara('ajustes')}>
            ←
          </button>
        }
      >
        {autorizado && (
          <div className="abas-tela" role="tablist" aria-label="Seções da administração">
            {SECOES.map(([id, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={secao === id} onClick={() => setSecao(id)}>
                {rotulo}
              </button>
            ))}
          </div>
        )}
      </Cabecalho>
      <main className="tela-conteudo">
        {!autorizado ? (
          <div className="pedir-conta">
            <p>Esta área é da administração do parque.</p>
            {!sessao && (
              <button type="button" className="botao-principal" onClick={aoPedirLogin}>
                Entrar
              </button>
            )}
          </div>
        ) : (
          <>
            {secao === 'resumo' && <Resumo />}
            {secao === 'pontos' && <Pontos />}
            {secao === 'eventos' && <Eventos />}
            {secao === 'avisos' && <Avisos />}
            {secao === 'recebidos' && <Recebidos />}
            {secao === 'feed' && <Moderacao />}
            {secao === 'contas' && <Contas sessao={sessao} />}
          </>
        )}
      </main>
    </div>
  )
}
