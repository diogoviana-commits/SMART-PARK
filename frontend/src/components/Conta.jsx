import { useEffect, useRef, useState } from 'react'

function iniciais(nome) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

const primeiroNome = (nome) => (nome ?? '').trim().split(/\s+/)[0] ?? ''

/**
 * Botão de conta no cabeçalho: "Entrar" quando não há sessão, e as iniciais da
 * pessoa quando há, abrindo um menu com o e-mail e a saída.
 *
 * O e-mail fica no menu, e não no cabeçalho, porque em celular não cabe — e
 * porque é o dado que a pessoa precisa conferir ("entrei com qual conta?"),
 * não o que precisa ver o tempo todo.
 */
export default function Conta({ sessao, aoPedirLogin, aoSair }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const aoClicar = (evento) => {
      if (!caixa.current?.contains(evento.target)) setAberto(false)
    }
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicar)
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicar)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  if (!sessao) {
    return (
      <button type="button" className="botao-conta" onClick={aoPedirLogin}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4 0-8 2-8 4.7V21h16v-2.3C20 16 16 14 12 14Z" />
        </svg>
        Entrar
      </button>
    )
  }

  const nome = sessao.usuario.nome
  const administrador = sessao.usuario.perfil === 'ADMINISTRADOR'

  return (
    <div className="conta" ref={caixa}>
      <button
        type="button"
        className="botao-conta botao-conta-logado"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="avatar" aria-hidden="true">
          {iniciais(nome)}
        </span>
        <span className="conta-nome">{primeiroNome(nome)}</span>
      </button>

      {aberto && (
        <div className="conta-menu">
          <p className="conta-menu-nome">
            {nome}
            {administrador && <span className="etiqueta">administração</span>}
          </p>
          <p className="conta-menu-email">{sessao.usuario.email}</p>
          <button
            type="button"
            onClick={() => {
              setAberto(false)
              aoSair()
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
