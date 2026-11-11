/**
 * Senhas: hash com BCrypt e política para senhas novas.
 *
 * A política segue a orientação do NIST (SP 800-63B): comprimento mínimo e
 * bloqueio de senhas conhecidas, em vez de exigir símbolos e maiúsculas, regras
 * que levam a "Senha@123", fácil de adivinhar e difícil de lembrar.
 */
import bcrypt from 'bcryptjs'
import { ErroHttp } from '../erros.js'

/** Custo 12: lento de propósito, o que encarece a quebra por força bruta. */
const CUSTO = 12

export const SENHA_MINIMO = 8
/**
 * O BCrypt só considera os primeiros 72 bytes e ignora o resto em silêncio.
 * Aceitar mais daria a falsa impressão de uma senha mais forte.
 */
export const SENHA_MAXIMO_BYTES = 72

/** As mais usadas em vazamentos públicos: as primeiras que um atacante testa. */
const CONHECIDAS = new Set([
  '12345678', '123456789', '1234567890', '12345678910', '87654321', '11111111',
  '00000000', '123123123', '11223344', '12341234', '123456abc', 'abc12345',
  'abcd1234', 'password', 'password1', 'senha123', 'senha1234', 'senhasenha',
  'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk', 'iloveyou', 'princesa',
  'brasil123', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo', 'santos123',
  'mudar123', 'admin123', 'administrador', 'smartpark', 'smartpark123',
  'chicomendes', 'parque123', 'minhasenha', 'trocar123', 'aaaaaaaa',
])

export const gerarHash = (senha: string) => bcrypt.hash(senha, CUSTO)

/**
 * Confere a senha com o hash. Lê também os hashes "$2a$" gerados pelo Spring
 * Security na versão em Java, então as contas antigas continuam entrando.
 */
export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash)

/** Hash de uma senha qualquer, para gastar o mesmo tempo quando o e-mail não existe. */
let hashFalso: Promise<string> | null = null
export const hashParaComparacaoFalsa = () => (hashFalso ??= gerarHash('senha-que-ninguem-usa-1234'))

/** @throws ErroHttp 400 com a explicação para a pessoa, se a senha não servir */
export function validarSenhaNova(senha: string, email: string, nome: string): void {
  if (senha.length < SENHA_MINIMO) {
    throw new ErroHttp(400, `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`)
  }
  if (Buffer.byteLength(senha, 'utf8') > SENHA_MAXIMO_BYTES) {
    throw new ErroHttp(400, `A senha pode ter no máximo ${SENHA_MAXIMO_BYTES} caracteres.`)
  }
  const normalizada = senha.toLowerCase()
  if (CONHECIDAS.has(normalizada) || new Set(normalizada).size <= 2) {
    throw new ErroHttp(400, 'Essa senha é muito comum e seria adivinhada rápido. Escolha outra.')
  }
  const usuarioDoEmail = (email.split('@')[0] ?? '').toLowerCase()
  const nomeSemEspaco = nome.replace(/\s+/g, '').toLowerCase()
  if (
    (usuarioDoEmail.length >= 4 && normalizada.includes(usuarioDoEmail)) ||
    (nomeSemEspaco.length >= 4 && normalizada.includes(nomeSemEspaco))
  ) {
    throw new ErroHttp(400, 'A senha não pode conter o seu nome ou o seu e-mail.')
  }
}
