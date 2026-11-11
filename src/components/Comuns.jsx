// Peças repetidas entre as telas: cabeçalho, avatar, barra de nível e convite para entrar.

export function iniciais(nome) {
  const partes = (nome ?? '').replace(/\./g, '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (partes[0][0] + ultima).toUpperCase()
}

export function Avatar({ nome, tamanho = 40 }) {
  return (
    <span className="avatar-grande" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }} aria-hidden="true">
      {iniciais(nome)}
    </span>
  )
}

/** Cabeçalho escuro das telas (o mapa tem o seu próprio). */
export function Cabecalho({ sobretitulo, titulo, acao, children }) {
  return (
    <header className="cabecalho-tela">
      <div className="cabecalho-tela-topo">
        <div>
          {sobretitulo && <p className="sobretitulo">{sobretitulo}</p>}
          <h1>{titulo}</h1>
        </div>
        {acao}
      </div>
      {children}
    </header>
  )
}

/** Nível e XP: "Nível 12 · 1.240 XP · faltam 60 XP", como no protótipo. */
export function BarraNivel({ nivel }) {
  const formato = new Intl.NumberFormat('pt-BR')
  return (
    <div className="barra-nivel">
      <div className="barra-nivel-topo">
        <span className="selo-nivel" aria-hidden="true">
          {nivel.nivel}
        </span>
        <span className="barra-nivel-texto">
          <strong>Nível {nivel.nivel}</strong>
          <span className="num">{formato.format(nivel.xp)} XP</span>
        </span>
        <span className="barra-nivel-falta num">faltam {nivel.faltam} XP</span>
      </div>
      <div
        className="progresso"
        role="progressbar"
        aria-label={`Progresso até o nível ${nivel.nivel + 1}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(nivel.fracao * 100)}
      >
        <span style={{ width: `${Math.round(nivel.fracao * 100)}%` }} />
      </div>
    </div>
  )
}

/** Barra de progresso simples, com rótulo acessível. */
export function Progresso({ fracao, rotulo }) {
  const pct = Math.round(Math.min(1, Math.max(0, fracao)) * 100)
  return (
    <div className="progresso" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Estado vazio para quem não entrou: explica o que ganha com a conta. */
export function PedirConta({ texto, aoPedirLogin }) {
  return (
    <div className="pedir-conta">
      <p>{texto}</p>
      <button type="button" className="botao-principal" onClick={aoPedirLogin}>
        Entrar ou criar conta
      </button>
    </div>
  )
}

export function Carregando() {
  return (
    <p className="carregando" role="status">
      Carregando…
    </p>
  )
}

export function Erro({ mensagem, aoTentarDeNovo }) {
  return (
    <div className="aviso aviso-erro" role="alert">
      <div>
        {mensagem}{' '}
        {aoTentarDeNovo && (
          <button type="button" onClick={aoTentarDeNovo}>
            Tentar de novo
          </button>
        )}
      </div>
    </div>
  )
}

const RELATIVO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

/** "há 3 min", "há 2 h", "ontem" — o instante vem no horário do parque, sem fuso. */
export function haQuanto(iso) {
  const ms = Date.parse(`${iso}-03:00`)
  const segundos = Math.round((ms - Date.now()) / 1000)
  const abs = Math.abs(segundos)
  if (abs < 60) return 'agora'
  if (abs < 3600) return RELATIVO.format(Math.round(segundos / 60), 'minute')
  if (abs < 86400) return RELATIVO.format(Math.round(segundos / 3600), 'hour')
  return RELATIVO.format(Math.round(segundos / 86400), 'day')
}

/** Posição atual, uma vez (para registrar visita fora do mapa). */
export function posicaoAtual() {
  return new Promise((resolver, rejeitar) => {
    if (!navigator.geolocation) return rejeitar(new Error('Este aparelho não informa a localização.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
      () => rejeitar(new Error('Não foi possível obter sua localização. Ative o GPS e permita o acesso no navegador.')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    )
  })
}
