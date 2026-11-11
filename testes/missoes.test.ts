/**
 * Missões com progresso verificado no servidor (achado #26 da auditoria).
 * Portado de MissaoControllerTest.java, trocando o progresso autodeclarado por visitas.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PONTOS } from '../servidor/db/dados-iniciais.js'
import { hojeNoParque, somarDias } from '../servidor/tempo.js'
import { novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
let ids: Map<string, number>
beforeAll(async () => {
  amb = await prepararAmbiente()
  const lista = await pedir(amb, 'GET', '/api/pois')
  ids = new Map(lista.corpo.map((p: { nome: string; id: number }) => [p.nome, p.id]))
})
afterEach(() => vi.useRealTimers())

/** Visita um ponto estando exatamente nele (ou deslocado em graus de latitude). */
function visitar(sessao: string, nome: string, deslocamentoLat = 0) {
  const p = PONTOS.find((x) => x.nome === nome)!
  return pedir(amb, 'POST', '/api/visitas', {
    sessao,
    corpo: { poiId: ids.get(nome), latitude: p.latitude + deslocamentoLat, longitude: p.longitude },
  })
}

/** Avança o relógio do servidor (só Date; o resto do runtime segue normal). */
function relogio(isoNoParque: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${isoNoParque}-03:00`))
}

const missao = (lista: { nome: string }[], nome: string) => lista.find((m) => m.nome === nome) as any

describe('listagem', () => {
  it('lista as 6 missões; sem login, todas zeradas', async () => {
    const r = await pedir(amb, 'GET', '/api/missoes')
    expect(r.corpo).toHaveLength(6)
    expect(r.corpo.every((m: { progressoAtual: number; concluida: boolean }) => m.progressoAtual === 0 && !m.concluida)).toBe(true)
  })

  it('filtra por periodicidade', async () => {
    const r = await pedir(amb, 'GET', '/api/missoes?periodicidade=SEMANAL')
    expect(r.corpo.map((m: { nome: string }) => m.nome)).toEqual(['Presença Cultural', 'Conhecedor do Parque', 'Andarilho'])
    expect((await pedir(amb, 'GET', '/api/missoes?periodicidade=MENSAL')).status).toBe(400)
  })
})

describe('visitas', () => {
  it('a visita longe do ponto é recusada', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await visitar(sessao, 'Lago Principal', 0.001) // ~111 m ao norte
    expect(r.status).toBe(400)
    expect(r.corpo.mensagem).toMatch(/Você está a 11\d m do ponto/)
  })

  it('a visita a até 30 m do ponto é aceita', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await visitar(sessao, 'Lago Principal', 0.0002) // ~22 m
    expect(r.status).toBe(201)
    expect(r.corpo.visita).toMatchObject({ poiNome: 'Lago Principal', metros: 0 })
  })

  it('o mesmo ponto só conta uma vez por dia', async () => {
    const { sessao } = await novoVisitante(amb)
    expect((await visitar(sessao, 'Lago do Bosque')).status).toBe(201)
    const repetida = await visitar(sessao, 'Lago do Bosque')
    expect(repetida.status).toBe(409)
  })

  it('três pontos diferentes concluem o "Explorador do Dia" e dão pontos', async () => {
    const { sessao } = await novoVisitante(amb)
    await visitar(sessao, 'Banheiro das Quadras')
    await visitar(sessao, 'Bebedouro das Quadras')
    const terceira = await visitar(sessao, 'Bicicletário')
    expect(terceira.corpo.missoesConcluidas).toEqual(['Explorador do Dia'])
    expect(missao(terceira.corpo.missoes, 'Explorador do Dia')).toMatchObject({ progressoAtual: 3, concluida: true, fracaoConcluida: 1 })
    const pontos = await pedir(amb, 'GET', '/api/missoes/pontos', { sessao })
    expect(pontos.corpo.pontos).toBe(80)
  })

  it('o progresso de uma pessoa não aparece para outra', async () => {
    const a = await novoVisitante(amb)
    const b = await novoVisitante(amb)
    await visitar(a.sessao, 'Playground do Bosque')
    const deB = await pedir(amb, 'GET', '/api/missoes', { sessao: b.sessao })
    expect(missao(deB.corpo, 'Explorador do Dia').progressoAtual).toBe(0)
  })
})

describe('caminhada não pode ser forjada', () => {
  it('pular de um ponto a outro na hora não credita distância', async () => {
    relogio(`${hojeNoParque()}T09:00:00`)
    const { sessao } = await novoVisitante(amb)
    await visitar(sessao, 'Entrada da Avenida Fernando Simonsen')
    const longe = await visitar(sessao, 'Banheiro das Quadras') // ~250 m, no mesmo instante
    expect(longe.corpo.visita.metros).toBe(0)
  })

  it('com tempo para andar, credita a distância entre os pontos', async () => {
    const dia = hojeNoParque()
    relogio(`${dia}T09:00:00`)
    const { sessao } = await novoVisitante(amb)
    await visitar(sessao, 'Entrada da Avenida Fernando Simonsen')
    relogio(`${dia}T09:10:00`) // 10 minutos depois: dá para andar até ~1,1 km
    const r = await visitar(sessao, 'Banheiro das Quadras')
    expect(r.corpo.visita.metros).toBeGreaterThan(200)
    expect(r.corpo.visita.metros).toBeLessThan(300)
  })

  it('a distância creditada nunca passa do que dá para andar no tempo', async () => {
    const dia = hojeNoParque()
    relogio(`${dia}T09:00:00`)
    const { sessao } = await novoVisitante(amb)
    await visitar(sessao, 'Entrada da Avenida Fernando Simonsen')
    relogio(`${dia}T09:01:00`) // 1 minuto: no máximo ~117 m a 7 km/h
    const r = await visitar(sessao, 'Banheiro das Quadras')
    expect(r.corpo.visita.metros).toBeLessThanOrEqual(117)
  })
})

describe('eventos', () => {
  it('a visita ao local durante o evento conclui a "Presença Cultural"', async () => {
    // A carga põe a Caminhada Orientada daqui a 2 dias, às 7h30, no portão principal.
    relogio(`${somarDias(hojeNoParque(), 2)}T07:20:00`)
    const { sessao } = await novoVisitante(amb)
    const r = await visitar(sessao, 'Entrada da Avenida Fernando Simonsen')
    expect(r.corpo.visita.evento).toMatchObject({ nome: 'Caminhada Orientada' })
    expect(r.corpo.missoesConcluidas).toContain('Presença Cultural')
  })

  it('a mesma visita fora do horário do evento não conta', async () => {
    relogio(`${somarDias(hojeNoParque(), 2)}T15:00:00`)
    const { sessao } = await novoVisitante(amb)
    const r = await visitar(sessao, 'Entrada da Avenida Fernando Simonsen')
    expect(r.corpo.visita.evento).toBeNull()
  })
})
