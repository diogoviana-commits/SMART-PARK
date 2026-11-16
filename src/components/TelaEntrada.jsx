import { useEffect, useRef, useState } from 'react'
import { ApiIndisponivel, ENTRAR_COM_GOOGLE, cadastrar, entrar, esqueciSenha, recursos, redefinirSenha } from '../api.js'
import { Logotipo } from '../icones.jsx'

const semConexao = (e) =>
  e instanceof ApiIndisponivel ? 'Sem conexão com o servidor. Confira a internet e tente de novo.' : e.message

/** Campo de senha com o botão de mostrar: reduz erro de digitação no teclado do celular. */
function CampoSenha({ rotulo = 'Senha', valor, aoMudar, nova, referencia }) {
  const [mostrar, setMostrar] = useState(false)
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <div className="campo-senha">
        <input
          ref={referencia}
          type={mostrar ? 'text' : 'password'}
          required
          minLength={nova ? 8 : undefined}
          maxLength={nova ? 72 : 128}
          autoComplete={nova ? 'new-password' : 'current-password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
        <button type="button" onClick={() => setMostrar((v) => !v)} aria-pressed={mostrar}>
          {mostrar ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {nova && (
        <small>
          Pelo menos 8 caracteres. Uma frase curta é mais segura e fácil de lembrar do que trocar
          letras por símbolos.
        </small>
      )}
    </label>
  )
}

/** Moldura das telas de conta: fecha com o botão ou com Esc e volta ao mapa. */
function Dialogo({ titulo, aoFechar, children }) {
  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <div className="entrada entrada-dialogo" role="dialog" aria-modal="true" aria-labelledby={titulo}>
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
      <section className="entrada-cartao">{children}</section>
    </div>
  )
}

/**
 * Entrar, criar conta ou recuperar a senha (RF01, RF02), por cima do mapa.
 *
 * Aparece quando a pessoa pede algo que exige conta (avaliar, missões) ou toca
 * em "Entrar". Fechar (botão, Esc) volta para o mapa no mesmo ponto: a conta é
 * opcional para consultar o parque.
 *
 * "Continuar com Google" e "Esqueci minha senha" só aparecem quando o site tem
 * esses serviços configurados: nada de botão que não funciona.
 */
export default function TelaEntrada({ aviso, aoAutenticar, aoFechar }) {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState(false)
  const [disponivel, setDisponivel] = useState({ email: false, google: false })
  const primeiroCampo = useRef(null)

  const criando = modo === 'cadastrar'
  const recuperando = modo === 'esqueci'

  useEffect(() => {
    recursos().then(setDisponivel)
  }, [])

  useEffect(() => {
    primeiroCampo.current?.focus()
  }, [modo])

  const trocarModo = (novo) => {
    setModo(novo)
    setErro(null)
    setSenha('')
    setLinkEnviado(false)
  }

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      if (recuperando) {
        await esqueciSenha(email.trim())
        setLinkEnviado(true)
      } else {
        const sessao = criando ? await cadastrar(nome.trim(), email.trim(), senha) : await entrar(email.trim(), senha)
        setSenha('')
        aoAutenticar(sessao)
      }
    } catch (e) {
      setErro(semConexao(e))
    } finally {
      setEnviando(false)
    }
  }

  const campoEmail = (
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
  )

  if (recuperando) {
    return (
      <Dialogo titulo="titulo-entrada" aoFechar={aoFechar}>
        <form className="entrada-form" onSubmit={enviar}>
          <h2 id="titulo-entrada">Recuperar a senha</h2>
          {linkEnviado ? (
            <>
              <p className="entrada-aviso" role="status">
                Se houver uma conta com <strong>{email.trim()}</strong>, enviamos um link para criar
                uma senha nova. Ele vale por 1 hora. Confira também a caixa de spam.
              </p>
              <button type="button" className="botao-principal" onClick={() => trocarModo('entrar')}>
                Voltar para entrar
              </button>
            </>
          ) : (
            <>
              <p className="caixa-explica">
                Informe o e-mail da sua conta. Enviaremos um link para você criar uma senha nova.
              </p>
              {campoEmail}
              {erro && (
                <p className="caixa-erro" role="alert">
                  {erro}
                </p>
              )}
              <button type="submit" className="botao-principal" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link'}
              </button>
              <button type="button" className="link-entrada" onClick={() => trocarModo('entrar')}>
                Lembrei a senha: voltar
              </button>
            </>
          )}
        </form>
      </Dialogo>
    )
  }

  return (
    <Dialogo titulo="titulo-entrada" aoFechar={aoFechar}>
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

        {disponivel.google && (
          <>
            <a className="botao-google" href={ENTRAR_COM_GOOGLE}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.800 6.600-9.500 6.600-16.200z" />
                <path fill="#34A853" d="M24 46c5.900 0 10.900-2 14.500-5.300l-7.100-5.500c-2 1.300-4.500 2.100-7.400 2.100-5.700 0-10.500-3.800-12.300-9H4.400v5.700C8 41.100 15.400 46 24 46z" />
                <path fill="#FBBC05" d="M11.700 28.300c-.4-1.300-.7-2.800-.7-4.300s.3-2.900.7-4.300V14H4.400C2.900 17 2 20.400 2 24s.9 7 2.400 10l7.300-5.700z" />
                <path fill="#EA4335" d="M24 10.700c3.200 0 6.100 1.100 8.400 3.300l6.300-6.300C34.900 4.100 29.900 2 24 2 15.400 2 8 6.900 4.400 14l7.300 5.700c1.800-5.200 6.600-9 12.300-9z" />
              </svg>
              Continuar com Google
            </a>
            <p className="divisor-ou" aria-hidden="true">
              <span>ou</span>
            </p>
          </>
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

        {campoEmail}
        <CampoSenha valor={senha} aoMudar={setSenha} nova={criando} />

        {erro && (
          <p className="caixa-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? 'Enviando…' : criando ? 'Criar conta e entrar' : 'Entrar'}
        </button>

        {!criando && disponivel.email && (
          <button type="button" className="link-entrada" onClick={() => trocarModo('esqueci')}>
            Esqueci minha senha
          </button>
        )}
      </form>
    </Dialogo>
  )
}

/** Chegada pelo link do e-mail de recuperação: cria a senha nova (RF02). */
export function RedefinirSenha({ codigo, aoFechar, aoConcluir }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const campo = useRef(null)

  useEffect(() => campo.current?.focus(), [])

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await redefinirSenha(codigo, senha)
      aoConcluir()
    } catch (e) {
      setErro(semConexao(e))
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="titulo-redefinir" aoFechar={aoFechar}>
      <form className="entrada-form" onSubmit={enviar}>
        <h2 id="titulo-redefinir">Criar nova senha</h2>
        <p className="caixa-explica">
          Escolha a senha nova da sua conta. Ao salvar, as sessões abertas em outros aparelhos são
          encerradas.
        </p>
        <CampoSenha rotulo="Nova senha" valor={senha} aoMudar={setSenha} nova referencia={campo} />
        {erro && (
          <p className="caixa-erro" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar a nova senha'}
        </button>
      </form>
    </Dialogo>
  )
}
