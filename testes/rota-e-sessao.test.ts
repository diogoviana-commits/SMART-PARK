/**
 * Rota pelos caminhos do parque (portado de RotaServiceTest.java), token JWT e
 * configuração (portado de JwtServiceTest.java), e semana ISO das missões.
 */
import { readFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { distanciaEmMetros } from '../compartilhado/distancia.js'
import { calcularRota, GrafoDeTrilhas, type DadosDaRede } from '../compartilhado/grafo.js'
import { lerConfiguracao, SEGREDO_DEV } from '../servidor/config.js'
import { emitirToken, lerToken } from '../servidor/seguranca/sessao.js'
import { semanaIso } from '../servidor/tempo.js'

const grafo = new GrafoDeTrilhas(JSON.parse(readFileSync('public/dados/trilhas.json', 'utf8')) as DadosDaRede)
const ENTRADA = { latitude: -23.631338, longitude: -46.573411 }
const BANHEIRO_QUADRAS = { latitude: -23.63208, longitude: -46.57097 }
const LAGO = { latitude: -23.63318, longitude: -46.572287 }

describe('rota a pé', () => {
  it('carrega a rede de caminhos do OpenStreetMap', () => {
    expect(grafo.quantidadeDeNos).toBe(4203)
  })

  it('distância entre o mesmo ponto é zero', () => {
    expect(distanciaEmMetros(-23.63, -46.57, -23.63, -46.57)).toBe(0)
  })

  it('distância confere com valor conhecido (1 grau de latitude ≈ 111,2 km)', () => {
    expect(distanciaEmMetros(0, 0, 1, 0)).toBeCloseTo(111_195, -1)
  })

  it('segue os caminhos em vez da linha reta', () => {
    const rota = calcularRota(grafo, ENTRADA, BANHEIRO_QUADRAS)
    const reta = distanciaEmMetros(ENTRADA.latitude, ENTRADA.longitude, BANHEIRO_QUADRAS.latitude, BANHEIRO_QUADRAS.longitude)
    expect(rota.distanciaMetros).toBeGreaterThan(reta)
    expect(rota.pontos.length).toBeGreaterThan(2)
    expect(rota.foraDosCaminhos).toBe(false)
  })

  it('começa no visitante e termina no ponto', () => {
    const rota = calcularRota(grafo, ENTRADA, LAGO)
    expect(rota.pontos[0]).toEqual(ENTRADA)
    expect(rota.pontos.at(-1)).toEqual(LAGO)
  })

  it('o tempo estimado corresponde a uma caminhada de 5 km/h', () => {
    const rota = calcularRota(grafo, ENTRADA, LAGO)
    expect(rota.duracaoMinutos).toBe(Math.max(1, Math.ceil(rota.distanciaMetros / (5000 / 60))))
  })

  it('evitar escadas nunca encurta a rota', () => {
    const normal = calcularRota(grafo, ENTRADA, LAGO)
    const semEscadas = calcularRota(grafo, ENTRADA, LAGO, true)
    expect(semEscadas.distanciaMetros).toBeGreaterThanOrEqual(normal.distanciaMetros - 0.1)
  })

  it('visitante longe do parque recebe o aviso de fora dos caminhos', () => {
    const praçaDaSe = { latitude: -23.5503, longitude: -46.6339 }
    expect(calcularRota(grafo, praçaDaSe, LAGO).foraDosCaminhos).toBe(true)
  })

  it('a duração nunca é zero, mesmo para destino muito próximo', () => {
    expect(calcularRota(grafo, LAGO, LAGO).duracaoMinutos).toBe(1)
  })
})

describe('token de sessão', () => {
  const config = lerConfiguracao({ NODE_ENV: 'test' })
  const dados = { email: 'ana@exemplo.com', uid: 7, perfil: 'VISITANTE', versao: 2 }

  it('token gerado é lido de volta com os mesmos dados', async () => {
    const { token } = await emitirToken(config, dados)
    expect(await lerToken(config, token)).toEqual(dados)
  })

  it('token assinado com outro segredo é recusado', async () => {
    const outro = lerConfiguracao({ NODE_ENV: 'test', SMARTPARK_JWT_SECRET: 'outro-segredo-qualquer-com-mais-de-32-caracteres' })
    const { token } = await emitirToken(outro, dados)
    expect(await lerToken(config, token)).toBeNull()
  })

  it('token adulterado é recusado', async () => {
    const { token } = await emitirToken(config, dados)
    const [cabecalho, , assinatura] = token.split('.')
    const corpoFalso = Buffer.from(JSON.stringify({ sub: dados.email, uid: 7, perfil: 'ADMINISTRADOR', ver: 2 })).toString('base64url')
    expect(await lerToken(config, `${cabecalho}.${corpoFalso}.${assinatura}`)).toBeNull()
  })

  it('texto que não é token é recusado', async () => {
    expect(await lerToken(config, 'nao-sou-um-token')).toBeNull()
  })

  it('token vencido é recusado', async () => {
    const vencido = await new SignJWT({ uid: 7, perfil: 'VISITANTE', ver: 2 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(dados.email)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(config.segredoJwt))
    expect(await lerToken(config, vencido)).toBeNull()
  })

  it('segredo curto não é aceito', () => {
    expect(() => lerConfiguracao({ SMARTPARK_JWT_SECRET: 'curto' })).toThrow(/32 caracteres/)
  })

  it('ambiente publicado se recusa a subir com o segredo de desenvolvimento', () => {
    expect(() => lerConfiguracao({ VERCEL_ENV: 'production' })).toThrow(/SMARTPARK_JWT_SECRET/)
    expect(() => lerConfiguracao({ VERCEL_ENV: 'preview', SMARTPARK_JWT_SECRET: SEGREDO_DEV })).toThrow()
  })

  it('desenvolvimento aceita o segredo padrão', () => {
    expect(lerConfiguracao({}).segredoJwt).toBe(SEGREDO_DEV)
  })
})

describe('semana das missões semanais', () => {
  it.each([
    ['2026-11-11', '2026-W46'],
    ['2026-11-16', '2026-W47'], // segunda-feira começa semana nova
    ['2026-11-15', '2026-W46'], // domingo ainda é da semana anterior
    ['2027-01-01', '2026-W53'], // virada de ano
    ['2026-01-01', '2026-W01'],
  ])('%s é da semana %s', (dia, semana) => {
    expect(semanaIso(dia)).toBe(semana)
  })
})
