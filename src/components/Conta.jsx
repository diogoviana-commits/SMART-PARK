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
 * Botão de conta no cabeçalho: as iniciais da pessoa, abrindo um menu com o
 * e-mail e a saída.
 *
 * O e-mail fica no menu, e não no cabeçalho, porque em celular não cabe — e
 * porque é o dado que a pessoa precisa conferir ("entrei com qual conta?"),
 * não o que precisa ver o tempo todo.
 */
export default function Conta({ sessao, aoSair }) {
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
          <p className="conta-menu-nota">Sair encerra a sessão em todos os aparelhos.</p>
        </div>
      )}
    </div>
  )
}
