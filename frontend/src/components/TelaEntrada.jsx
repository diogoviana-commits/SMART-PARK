import { useEffect, useRef, useState } from 'react'
import { ApiIndisponivel, cadastrar, entrar } from '../api.js'
import { Logotipo } from '../icones.jsx'

/**
 * Tela de entrada (RF01, RF02): o mapa só abre depois de entrar ou criar conta.
 *
 * Enquanto a pessoa digita, o servidor vai acordando em segundo plano — no plano
 * gratuito ele hiberna e leva perto de um minuto para responder. A faixa de
 * situação conta o que está acontecendo, para a espera não parecer travamento.
 */
export default function TelaEntrada({
  conectando,
  foraDoAr,
  tentativaConexao,
  aviso,
  aoTentarDeNovo,
  aoAutenticar,
}) {
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
          ? 'O servidor ainda não respondeu. Aguarde alguns segundos e tente de novo.'
          : e.message,
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="entrada">
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
          <h2>{criando ? 'Criar conta' : 'Entrar'}</h2>
          <p className="caixa-explica">
            {criando
              ? 'Crie sua conta gratuita para acessar o mapa do parque.'
              : 'Entre com sua conta para acessar o mapa do parque.'}
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

          <SituacaoServidor
            conectando={conectando}
            foraDoAr={foraDoAr}
            tentativa={tentativaConexao}
            aoTentarDeNovo={aoTentarDeNovo}
          />
        </form>
      </section>
    </div>
  )
}

function SituacaoServidor({ conectando, foraDoAr, tentativa, aoTentarDeNovo }) {
  if (foraDoAr) {
    return (
      <div className="entrada-situacao entrada-situacao-erro" role="alert">
        O servidor não respondeu.{' '}
        <button type="button" className="link" onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!conectando) {
    return (
      <div className="entrada-situacao entrada-situacao-ok">
        <span className="ponto-status" aria-hidden="true" /> Servidor conectado
      </div>
    )
  }
  return (
    <div className="entrada-situacao" role="status" aria-live="polite">
      <span className="ponto-status ponto-status-pulsando" aria-hidden="true" />
      {tentativa > 1
        ? 'O servidor estava em repouso e está ligando. Isso leva até um minuto — pode ir preenchendo.'
        : 'Conectando ao servidor…'}
    </div>
  )
}
