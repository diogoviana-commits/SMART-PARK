import { useEffect, useRef, useState } from 'react'
import { ApiIndisponivel, cadastrar, entrar } from '../api.js'
import { Logotipo } from '../icones.jsx'

/**
 * Entrar ou criar conta (RF01, RF02), por cima do mapa.
 *
 * Aparece quando a pessoa pede algo que exige conta (avaliar, missões) ou toca
 * em "Entrar". Fechar (botão, Esc) volta para o mapa no mesmo ponto: a conta é
 * opcional para consultar o parque.
 */
export default function TelaEntrada({ aviso, aoAutenticar, aoFechar }) {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const primeiroCampo = useRef(null)

  const criando = modo === 'cadastrar'

  useEffect(() => {
    primeiroCampo.current?.focus()
  }, [modo])

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const trocarModo = (novo) => {
    setModo(novo)
    setErro(null)
    setSenha('')
    setMostrarSenha(false)
  }

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const sessao = criando
        ? await cadastrar(nome.trim(), email.trim(), senha)
        : await entrar(email.trim(), senha)
      setSenha('')
      aoAutenticar(sessao)
    } catch (e) {
      setErro(
        e instanceof ApiIndisponivel
          ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
          : e.message,
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="entrada entrada-dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-entrada">
      <button type="button" className="entrada-fechar" onClick={aoFechar}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Voltar ao mapa
      </button>
      <section className="entrada-marca">
        <Logotipo tamanho={46} />
        <h1>Smart Park</h1>
        <p>Espaço Verde Chico Mendes</p>
        <ul className="entrada-destaques">
          <li>Rotas a pé pelas trilhas do parque</li>
          <li>Banheiros, quadras e lanchonetes no mapa</li>
          <li>Agenda de eventos e avaliações dos visitantes</li>
        </ul>
      </section>

      <section className="entrada-cartao">
        <form className="entrada-form" onSubmit={enviar}>
          <h2 id="titulo-entrada">{criando ? 'Criar conta' : 'Entrar'}</h2>
          <p className="caixa-explica">
            {criando
              ? 'Crie sua conta gratuita para avaliar os pontos e fazer as missões.'
              : 'Entre para avaliar os pontos e acompanhar as suas missões.'}
          </p>

          {aviso && !erro && (
            <p className="entrada-aviso" role="status">
              {aviso}
            </p>
          )}

          <div className="abas" role="tablist" aria-label="Escolha entre entrar e criar conta">
            <button type="button" role="tab" aria-selected={!criando} onClick={() => trocarModo('entrar')}>
              Já tenho conta
            </button>
            <button type="button" role="tab" aria-selected={criando} onClick={() => trocarModo('cadastrar')}>
              Criar conta
            </button>
          </div>

          {criando && (
            <label className="campo">
              <span>Nome</span>
              <input
                ref={primeiroCampo}
                type="text"
                required
                maxLength={120}
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
          )}

          <label className="campo">
            <span>E-mail</span>
            <input
              ref={criando ? undefined : primeiroCampo}
              type="email"
              required
              maxLength={160}
              autoComplete={criando ? 'email' : 'username'}
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
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
                maxLength={criando ? 72 : 128}
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
            {criando && (
              <small>
                Pelo menos 8 caracteres. Uma frase curta é mais segura e fácil de lembrar do que
                trocar letras por símbolos.
              </small>
            )}
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
      </section>
    </div>
  )
}
