/**
 * Pontos de interesse, busca, filtros, card e manutenção pela administração.
 * Portado de PontoInteresseControllerTest.java.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { entrarComoAdministrador, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
let admin: string
beforeAll(async () => {
  amb = await prepararAmbiente()
  admin = await entrarComoAdministrador(amb)
})

const nomes = (lista: { nome: string }[]) => lista.map((p) => p.nome)

describe('consulta', () => {
  it('lista os 33 pontos da carga inicial, em ordem de nome', async () => {
    const r = await pedir(amb, 'GET', '/api/pois')
    expect(r.corpo).toHaveLength(33)
    const ordenados = [...nomes(r.corpo)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    expect(nomes(r.corpo)[0]).toBe(ordenados[0])
  })

  it('as categorias saem com acento (eram "Alimentacao", "Servicos e apoio")', async () => {
    const r = await pedir(amb, 'GET', '/api/categorias')
    expect(r.corpo).toHaveLength(7)
    expect(nomes(r.corpo)).toEqual(
      expect.arrayContaining(['Alimentação', 'Serviços e apoio', 'Entrada e saída', 'Lazer e descanso']),
    )
  })

  it('busca por texto no nome, sem diferenciar maiúsculas', async () => {
    const r = await pedir(amb, 'GET', '/api/pois?busca=BANHEIRO')
    // Os dois banheiros, mais a entrada cuja descrição cita "dos banheiros"
    expect(nomes(r.corpo)).toEqual(['Banheiro das Quadras', 'Banheiro do Bosque', 'Entrada das Quadras'])
  })

  it('busca também na descrição e com acento', async () => {
    const r = await pedir(amb, 'GET', '/api/pois?busca=água potável')
    expect(r.corpo).toHaveLength(4) // os quatro bebedouros
  })

  it('busca sem resultado devolve lista vazia', async () => {
    expect((await pedir(amb, 'GET', '/api/pois?busca=montanha-russa')).corpo).toEqual([])
  })

  it('"%" na busca é texto, não curinga', async () => {
    expect((await pedir(amb, 'GET', '/api/pois?busca=%25')).corpo).toEqual([])
  })

  it('filtra por categoria', async () => {
    const r = await pedir(amb, 'GET', '/api/pois?categoria=esporte')
    expect(r.corpo).toHaveLength(9)
    expect(r.corpo.every((p: { categoria: { slug: string } }) => p.categoria.slug === 'esporte')).toBe(true)
  })

  it('filtra por acessibilidade e combina com a categoria', async () => {
    const acessiveis = await pedir(amb, 'GET', '/api/pois?acessivel=true')
    expect(acessiveis.corpo.every((p: { acessivel: boolean }) => p.acessivel)).toBe(true)
    const banheiros = await pedir(amb, 'GET', '/api/pois?acessivel=true&categoria=banheiro')
    expect(nomes(banheiros.corpo)).toEqual(['Banheiro das Quadras'])
  })

  it('card do ponto traz situação, horário e categoria', async () => {
    const lista = await pedir(amb, 'GET', '/api/pois?busca=Quadra Poliesportiva 7')
    const r = await pedir(amb, 'GET', `/api/pois/${lista.corpo[0].id}`)
    expect(r.corpo).toMatchObject({
      nome: 'Quadra Poliesportiva 7',
      statusOperacional: 'EM_MANUTENCAO',
      horarioAbertura: '06:00:00',
      horarioFechamento: '22:00:00',
      notaMedia: null,
      totalAvaliacoes: 0,
      categoria: { slug: 'esporte', nome: 'Esporte' },
    })
  })

  it('ponto inexistente responde 404', async () => {
    const r = await pedir(amb, 'GET', '/api/pois/99999')
    expect(r.status).toBe(404)
    expect(r.corpo.mensagem).toBe('Ponto de interesse 99999 não encontrado.')
  })

  it('pontos próximos vêm do mais perto para o mais longe, dentro do raio', async () => {
    // Em cima do Banheiro das Quadras
    const r = await pedir(amb, 'GET', '/api/pois/proximos?lat=-23.63208&lon=-46.57097&raio=60')
    expect(r.corpo[0].nome).toBe('Banheiro das Quadras')
    expect(r.corpo.length).toBeGreaterThan(1)
    expect(r.corpo.length).toBeLessThan(33)
  })

  it('coordenada inválida nos próximos responde 400', async () => {
    expect((await pedir(amb, 'GET', '/api/pois/proximos?lat=200&lon=0')).status).toBe(400)
    expect((await pedir(amb, 'GET', '/api/pois/proximos?lat=abc&lon=0')).status).toBe(400)
  })
})

describe('manutenção pela administração', () => {
  const novo = {
    nome: 'Bebedouro do Lago',
    descricao: 'Torneira nova junto ao lago.',
    categoriaSlug: 'bebedouro',
    latitude: -23.6331,
    longitude: -46.5722,
    horarioAbertura: '06:00',
    horarioFechamento: '22:00',
    acessivel: true,
  }

  it('cria, edita e remove um ponto', async () => {
    const criado = await pedir(amb, 'POST', '/api/pois', { sessao: admin, corpo: novo })
    expect(criado.status).toBe(201)
    expect(criado.corpo).toMatchObject({ nome: 'Bebedouro do Lago', statusOperacional: 'EM_FUNCIONAMENTO', horarioAbertura: '06:00:00' })

    const editado = await pedir(amb, 'PUT', `/api/pois/${criado.corpo.id}`, {
      sessao: admin,
      corpo: { ...novo, statusOperacional: 'EM_MANUTENCAO' },
    })
    expect(editado.corpo.statusOperacional).toBe('EM_MANUTENCAO')

    expect((await pedir(amb, 'DELETE', `/api/pois/${criado.corpo.id}`, { sessao: admin })).status).toBe(204)
    expect((await pedir(amb, 'GET', `/api/pois/${criado.corpo.id}`)).status).toBe(404)
  })

  it('categoria inexistente é recusada', async () => {
    const r = await pedir(amb, 'POST', '/api/pois', { sessao: admin, corpo: { ...novo, categoriaSlug: 'piscina' } })
    expect(r.status).toBe(400)
  })

  it('coordenada fora do globo é recusada', async () => {
    const r = await pedir(amb, 'POST', '/api/pois', { sessao: admin, corpo: { ...novo, latitude: 123 } })
    expect(r.status).toBe(400)
  })

  it('horário em formato errado é recusado', async () => {
    const r = await pedir(amb, 'POST', '/api/pois', { sessao: admin, corpo: { ...novo, horarioAbertura: '25:00' } })
    expect(r.status).toBe(400)
  })

  it('remover um ponto com evento mantém o evento, com o nome do local em texto', async () => {
    const ponto = await pedir(amb, 'POST', '/api/pois', { sessao: admin, corpo: novo })
    const evento = await pedir(amb, 'POST', '/api/eventos', {
      sessao: admin,
      corpo: { nome: 'Aula de ioga', dataHoraInicio: '2030-01-10T08:00', poiId: ponto.corpo.id },
    })
    await pedir(amb, 'DELETE', `/api/pois/${ponto.corpo.id}`, { sessao: admin })
    const depois = await pedir(amb, 'GET', `/api/eventos/${evento.corpo.id}`)
    expect(depois.corpo).toMatchObject({ poiId: null, local: 'Bebedouro do Lago' })
  })
})
