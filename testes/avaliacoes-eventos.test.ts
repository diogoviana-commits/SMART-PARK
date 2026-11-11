/**
 * Avaliações (portado de AvaliacaoControllerTest.java) e agenda de eventos,
 * agora com cadastro pela administração.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { entrarComoAdministrador, novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'
import { hojeNoParque, somarDias } from '../servidor/tempo.js'

let amb: Ambiente
let admin: string
beforeAll(async () => {
  amb = await prepararAmbiente()
  admin = await entrarComoAdministrador(amb)
})

describe('avaliações', () => {
  it('avalia um ponto com estrelas e comentário', async () => {
    const { sessao } = await novoVisitante(amb, 'Olga Menezes')
    const r = await pedir(amb, 'POST', '/api/pois/5/avaliacoes', { sessao, corpo: { nota: 5, comentario: '  Limpo e fácil de achar. ' } })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ poiId: 5, nota: 5, comentario: 'Limpo e fácil de achar.', usuarioNome: 'Olga' })
  })

  it('a avaliação fica sempre no nome de quem está logado', async () => {
    const vitima = await novoVisitante(amb)
    const autor = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/pois/6/avaliacoes', { sessao: autor.sessao, corpo: { nota: 1, usuarioId: vitima.id } })
    expect(r.corpo.usuarioId).toBe(autor.id)
  })

  it('avaliar de novo substitui a nota em vez de duplicar', async () => {
    const { sessao, id } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/pois/7/avaliacoes', { sessao, corpo: { nota: 2 } })).status).toBe(201)
    const segunda = await pedir(amb, 'POST', '/api/pois/7/avaliacoes', { sessao, corpo: { nota: 4 } })
    expect(segunda.status).toBe(200)
    const minhas = (await pedir(amb, 'GET', '/api/pois/7/avaliacoes')).corpo.filter((a: { usuarioId: number }) => a.usuarioId === id)
    expect(minhas).toHaveLength(1)
    expect(minhas[0].nota).toBe(4)
  })

  it('a média de estrelas aparece no card e na lista', async () => {
    const a = await novoVisitante(amb)
    const b = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/pois/8/avaliacoes', { sessao: a.sessao, corpo: { nota: 5 } })
    await pedir(amb, 'POST', '/api/pois/8/avaliacoes', { sessao: b.sessao, corpo: { nota: 4 } })
    const card = await pedir(amb, 'GET', '/api/pois/8')
    expect(card.corpo).toMatchObject({ notaMedia: 4.5, totalAvaliacoes: 2 })
    const lista = await pedir(amb, 'GET', '/api/pois')
    expect(lista.corpo.find((p: { id: number }) => p.id === 8).notaMedia).toBe(4.5)
  })

  it('a lista pública mostra só o primeiro nome', async () => {
    const { sessao } = await novoVisitante(amb, 'Roberto Carlos da Silva')
    await pedir(amb, 'POST', '/api/pois/9/avaliacoes', { sessao, corpo: { nota: 3 } })
    const lista = await pedir(amb, 'GET', '/api/pois/9/avaliacoes')
    expect(lista.corpo.map((a: { usuarioNome: string }) => a.usuarioNome)).toContain('Roberto')
    expect(JSON.stringify(lista.corpo)).not.toContain('da Silva')
  })

  it.each([0, 6, 3.5, '5'])('nota %s é recusada', async (nota) => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/pois/10/avaliacoes', { sessao, corpo: { nota } })).status).toBe(400)
  })

  it('comentário acima de 600 caracteres é recusado', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/pois/10/avaliacoes', { sessao, corpo: { nota: 3, comentario: 'x'.repeat(601) } })
    expect(r.status).toBe(400)
  })

  it('avaliar ponto inexistente responde 404', async () => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/pois/99999/avaliacoes', { sessao, corpo: { nota: 3 } })).status).toBe(404)
  })

  it('ninguém apaga a avaliação de outra pessoa; a administração pode', async () => {
    const dono = await novoVisitante(amb)
    const outro = await novoVisitante(amb)
    const criada = await pedir(amb, 'POST', '/api/pois/11/avaliacoes', { sessao: dono.sessao, corpo: { nota: 2 } })
    const caminho = `/api/pois/11/avaliacoes/${criada.corpo.id}`
    expect((await pedir(amb, 'DELETE', caminho, { sessao: outro.sessao })).status).toBe(403)
    expect((await pedir(amb, 'DELETE', caminho, { sessao: admin })).status).toBe(204)
    expect((await pedir(amb, 'DELETE', caminho, { sessao: admin })).status).toBe(404)
  })

  it('o dono apaga a própria avaliação', async () => {
    const { sessao } = await novoVisitante(amb)
    const criada = await pedir(amb, 'POST', '/api/pois/12/avaliacoes', { sessao, corpo: { nota: 5 } })
    expect((await pedir(amb, 'DELETE', `/api/pois/12/avaliacoes/${criada.corpo.id}`, { sessao })).status).toBe(204)
  })

  it('ponto sem avaliação traz média nula', async () => {
    expect((await pedir(amb, 'GET', '/api/pois/30')).corpo.notaMedia).toBeNull()
  })
})

describe('agenda', () => {
  it('sem parâmetros, traz os 5 eventos dos próximos 30 dias, em ordem de data', async () => {
    const r = await pedir(amb, 'GET', '/api/eventos')
    expect(r.corpo.length).toBeGreaterThanOrEqual(5)
    const datas = r.corpo.map((e: { dataHoraInicio: string }) => e.dataHoraInicio)
    expect(datas).toEqual([...datas].sort())
    expect(r.corpo[0]).toMatchObject({ nome: 'Caminhada Orientada', local: 'Entrada da Avenida Fernando Simonsen' })
    expect(r.corpo[0].dataHoraInicio).toMatch(/^\d{4}-\d{2}-\d{2}T07:30:00$/)
  })

  it('a administração cadastra um evento, que entra na agenda', async () => {
    const dia = somarDias(hojeNoParque(), 3)
    const r = await pedir(amb, 'POST', '/api/eventos', {
      sessao: admin,
      corpo: { nome: 'Feira Orgânica', dataHoraInicio: `${dia}T08:00`, dataHoraFim: `${dia}T13:00`, poiId: 26 },
    })
    expect(r.status).toBe(201)
    const agenda = await pedir(amb, 'GET', '/api/eventos')
    expect(agenda.corpo.map((e: { nome: string }) => e.nome)).toContain('Feira Orgânica')
  })

  it('evento com local só descrito, sem ponto do mapa', async () => {
    const r = await pedir(amb, 'POST', '/api/eventos', {
      sessao: admin,
      corpo: { nome: 'Corrida de rua', dataHoraInicio: '2030-05-01T07:00', localDescritivo: 'Ruas em volta do parque' },
    })
    expect(r.corpo).toMatchObject({ poiId: null, local: 'Ruas em volta do parque', latitude: null })
  })

  it('fim antes do início é recusado', async () => {
    const r = await pedir(amb, 'POST', '/api/eventos', {
      sessao: admin,
      corpo: { nome: 'X', dataHoraInicio: '2030-01-10T10:00', dataHoraFim: '2030-01-10T09:00', poiId: 1 },
    })
    expect(r.status).toBe(400)
  })

  it('evento sem local é recusado', async () => {
    const r = await pedir(amb, 'POST', '/api/eventos', { sessao: admin, corpo: { nome: 'X', dataHoraInicio: '2030-01-10T10:00' } })
    expect(r.status).toBe(400)
  })

  it('edita e remove um evento', async () => {
    const criado = await pedir(amb, 'POST', '/api/eventos', {
      sessao: admin,
      corpo: { nome: 'Sarau', dataHoraInicio: '2030-02-02T19:00', poiId: 30 },
    })
    const editado = await pedir(amb, 'PUT', `/api/eventos/${criado.corpo.id}`, {
      sessao: admin,
      corpo: { nome: 'Sarau ao Ar Livre', dataHoraInicio: '2030-02-02T19:30', poiId: 30 },
    })
    expect(editado.corpo).toMatchObject({ nome: 'Sarau ao Ar Livre', dataHoraInicio: '2030-02-02T19:30:00' })
    expect((await pedir(amb, 'DELETE', `/api/eventos/${criado.corpo.id}`, { sessao: admin })).status).toBe(204)
    expect((await pedir(amb, 'GET', `/api/eventos/${criado.corpo.id}`)).status).toBe(404)
  })

  it('filtra por período e lista todos', async () => {
    const todos = await pedir(amb, 'GET', '/api/eventos?todos=true')
    const periodo = await pedir(amb, 'GET', '/api/eventos?de=2030-01-01&ate=2030-12-31')
    expect(todos.corpo.length).toBeGreaterThan(periodo.corpo.length)
    expect(periodo.corpo.every((e: { dataHoraInicio: string }) => e.dataHoraInicio.startsWith('2030'))).toBe(true)
  })

  it('data em formato errado responde 400', async () => {
    expect((await pedir(amb, 'GET', '/api/eventos?de=10/01/2030')).status).toBe(400)
  })
})
