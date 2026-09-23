import { useEffect, useRef, useState } from 'react'
import { cadastrar, entrar } from '../api.js'

/**
 * Entrar e criar conta (RF01, RF02), em um único diálogo com duas abas.
 *
 * É um <dialog> nativo, e não uma div posicionada: assim o navegador entrega
 * prontos o foco preso dentro da caixa, o fechamento com Esc e o fundo inerte —
 * três coisas que versões caseiras costumam errar.
 */
export default function Acesso({ aberto, aoFechar, aoAutenticar }) {
  const dialogo = useRef(null)
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const caixa = dialogo.current
    if (!caixa) return
    if (aberto && !caixa.open) caixa.showModal()
    if (!aberto && caixa.open) caixa.close()
  }, [aberto])

  // Ao abrir, começa limpo: senha de uma tentativa anterior não fica na tela.
  useEffect(() => {
    if (aberto) {
      setSenha('')
      setMostrarSenha(false)
      setErro(null)
    }
  }, [aberto])

  const trocarModo = (novo) => {
    setModo(novo)
    setErro(null)
    setSenha('')
  }

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const sessao =
        modo === 'entrar'
          ? await entrar(email.trim(), senha)
          : await cadastrar(nome.trim(), email.trim(), senha)
      setSenha('')
      aoAutenticar(sessao)
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const criando = modo === 'cadastrar'

  return (
    <dialog
      ref={dialogo}
      className="caixa"
      onClose={aoFechar}
      // Clique no fundo fecha. O <dialog> conta o backdrop como o próprio
      // elemento, então comparar o alvo separa "fora" de "dentro".
      onClick={(evento) => {
        if (evento.target === dialogo.current) aoFechar()
      }}
      aria-labelledby="titulo-acesso"
    >
      <form className="caixa-corpo" onSubmit={enviar}>
        <div className="caixa-topo">
          <h2 id="titulo-acesso">{criando ? 'Criar conta' : 'Entrar'}</h2>
          <button type="button" className="caixa-fechar" onClick={aoFechar} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <p className="caixa-explica">
          A conta serve para avaliar os pontos do parque. Ver o mapa, buscar e traçar rota não
          exige entrar.
        </p>

        <div className="abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!criando}
            onClick={() => trocarModo('entrar')}
          >
            Já tenho conta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={criando}
            onClick={() => trocarModo('cadastrar')}
          >
            Criar conta
          </button>
        </div>

        {criando && (
          <label className="campo">
            <span>Nome</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
        )}

        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Senha</span>
          <div className="campo-senha">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              minLength={criando ? 8 : undefined}
              autoComplete={criando ? 'new-password' : 'current-password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-pressed={mostrarSenha}
              // Deixar ver o que se digitou reduz erro de digitação em teclado
              // de celular, onde a senha some caractere a caractere.
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {criando && <small>Pelo menos 8 caracteres.</small>}
        </label>

        {erro && (
          <p className="caixa-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? 'Enviando…' : criando ? 'Criar conta e entrar' : 'Entrar'}
        </button>
      </form>
    </dialog>
  )
}
