/**
 * RF07 (foto do ponto), RF10 (sugestões) e UC09 (relatórios de uso).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { entrarComoAdministrador, novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
let admin: string
beforeAll(async () => {
  amb = await prepararAmbiente()
  admin = await entrarComoAdministrador(amb)
})

/** Menor JPEG que serve de teste: só os bytes de abertura e de fim. */
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]).toString('base64')

describe('foto do ponto (RF07)', () => {
  it('a administração envia a foto, e qualquer pessoa a vê no ponto', async () => {
    const envio = await pedir(amb, 'PUT', '/api/pois/1/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: JPEG } })
    expect(envio.status).toBe(200)
    expect(envio.corpo.fotoUrl).toMatch(/^\/api\/pois\/1\/foto\?v=\d+$/)

    const ponto = await pedir(amb, 'GET', '/api/pois/1')
    expect(ponto.corpo.fotoUrl).toBe(envio.corpo.fotoUrl)

    const foto = await amb.app.request(envio.corpo.fotoUrl)
    expect(foto.status).toBe(200)
    expect(foto.headers.get('content-type')).toBe('image/jpeg')
    expect(foto.headers.get('cache-control')).toContain('immutable')
    expect(Buffer.from(await foto.arrayBuffer()).toString('base64')).toBe(JPEG)
  })

  it('editar os dados do ponto não apaga a foto', async () => {
    await pedir(amb, 'PUT', '/api/pois/2/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: JPEG } })
    const antes = (await pedir(amb, 'GET', '/api/pois/2')).corpo
    const edicao = await pedir(amb, 'PUT', '/api/pois/2', {
      sessao: admin,
      corpo: { nome: antes.nome, categoriaSlug: antes.categoria.slug, latitude: antes.latitude, longitude: antes.longitude, statusOperacional: 'EM_MANUTENCAO' },
    })
    expect(edicao.status).toBe(200)
    expect(edicao.corpo.statusOperacional).toBe('EM_MANUTENCAO')
    expect(edicao.corpo.fotoUrl).toBe(antes.fotoUrl)
  })

  it('recusa quem não é da administração, arquivo que não é imagem e foto grande demais', async () => {
    const v = await novoVisitante(amb)
    expect((await pedir(amb, 'PUT', '/api/pois/3/foto', { sessao: v.sessao, corpo: { tipo: 'image/jpeg', dados: JPEG } })).status).toBe(403)
    expect((await pedir(amb, 'PUT', '/api/pois/3/foto', { corpo: { tipo: 'image/jpeg', dados: JPEG } })).status).toBe(401)

    const html = Buffer.from('<script>alert(1)</script>').toString('base64')
    expect((await pedir(amb, 'PUT', '/api/pois/3/foto', { sessao: admin, corpo: { tipo: 'image/png', dados: html } })).status).toBe(400)
    expect((await pedir(amb, 'PUT', '/api/pois/3/foto', { sessao: admin, corpo: { tipo: 'image/svg+xml', dados: html } })).status).toBe(400)

    const grande = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(401 * 1024)]).toString('base64')
    expect((await pedir(amb, 'PUT', '/api/pois/3/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: grande } })).status).toBe(400)

    expect((await pedir(amb, 'PUT', '/api/pois/999999/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: JPEG } })).status).toBe(404)
    expect((await pedir(amb, 'GET', '/api/pois/3/foto')).status).toBe(404)
  })

  it('remover a foto limpa o ponto, e remover o ponto leva a foto junto', async () => {
    await pedir(amb, 'PUT', '/api/pois/4/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: JPEG } })
    expect((await pedir(amb, 'DELETE', '/api/pois/4/foto', { sessao: admin })).status).toBe(204)
    expect((await pedir(amb, 'GET', '/api/pois/4')).corpo.fotoUrl).toBeNull()
    expect((await pedir(amb, 'GET', '/api/pois/4/foto')).status).toBe(404)

    await pedir(amb, 'PUT', '/api/pois/5/foto', { sessao: admin, corpo: { tipo: 'image/jpeg', dados: JPEG } })
    expect((await pedir(amb, 'DELETE', '/api/pois/5', { sessao: admin })).status).toBe(204)
    expect((await pedir(amb, 'GET', '/api/pois/5/foto')).status).toBe(404)
  })
})

describe('sugestões (RF10)', () => {
  it('o visitante envia, a administração lê e marca como resolvida', async () => {
    const v = await novoVisitante(amb, 'Olga Menezes')
    const envio = await pedir(amb, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: '  Um bebedouro perto da quadra de areia.  ' } })
    expect(envio.status).toBe(201)
    expect(envio.corpo.texto).toBe('Um bebedouro perto da quadra de areia.')

    expect((await pedir(amb, 'GET', '/api/sugestoes', { sessao: v.sessao })).status).toBe(403)
    const abertas = await pedir(amb, 'GET', '/api/sugestoes', { sessao: admin })
    const minha = abertas.corpo.find((s: any) => s.id === envio.corpo.id)
    expect(minha.autor.nome).toBe('Olga Menezes')

    const resolvida = await pedir(amb, 'PATCH', `/api/sugestoes/${envio.corpo.id}`, { sessao: admin, corpo: { situacao: 'RESOLVIDO' } })
    expect(resolvida.corpo.situacao).toBe('RESOLVIDO')
    const depois = await pedir(amb, 'GET', '/api/sugestoes', { sessao: admin })
    expect(depois.corpo.some((s: any) => s.id === envio.corpo.id)).toBe(false)
    const resolvidas = await pedir(amb, 'GET', '/api/sugestoes?situacao=RESOLVIDO', { sessao: admin })
    expect(resolvidas.corpo.some((s: any) => s.id === envio.corpo.id)).toBe(true)
  })

  it('exige conta, texto de verdade e limita os envios por dia', async () => {
    expect((await pedir(amb, 'POST', '/api/sugestoes', { corpo: { texto: 'Mais sombra na entrada.' } })).status).toBe(401)
    const v = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: 'oi' } })).status).toBe(400)
    for (let i = 0; i < 5; i++) {
      expect((await pedir(amb, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: `Sugestão número ${i + 1}` } })).status).toBe(201)
    }
    expect((await pedir(amb, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: 'A sexta do dia.' } })).status).toBe(429)
    expect((await pedir(amb, 'GET', '/api/sugestoes?situacao=QUALQUER', { sessao: admin })).status).toBe(400)
  })
})

describe('relatórios de uso (UC09)', () => {
  it('conta o que aconteceu no período', async () => {
    const limpo = await prepararAmbiente()
    const adm = await entrarComoAdministrador(limpo)
    const v = await novoVisitante(limpo)
    const pontos = (await pedir(limpo, 'GET', '/api/pois')).corpo
    const alvo = pontos[0]
    const visita = await pedir(limpo, 'POST', '/api/visitas', { sessao: v.sessao, corpo: { poiId: alvo.id, latitude: alvo.latitude, longitude: alvo.longitude } })
    expect(visita.status).toBe(201)
    await pedir(limpo, 'POST', `/api/pois/${alvo.id}/avaliacoes`, { sessao: v.sessao, corpo: { nota: 4 } })
    await pedir(limpo, 'POST', `/api/pois/${alvo.id}/problemas`, { sessao: v.sessao, corpo: { tipo: 'LIMPEZA' } })
    await pedir(limpo, 'POST', '/api/sugestoes', { sessao: v.sessao, corpo: { texto: 'Mais lixeiras na trilha.' } })

    const r = await pedir(limpo, 'GET', '/api/relatorios?dias=7', { sessao: adm })
    expect(r.status).toBe(200)
    expect(r.corpo.periodo.dias).toBe(7)
    expect(r.corpo.totais).toMatchObject({
      contas: 2,
      contasNovas: 2,
      contasBloqueadas: 0,
      visitas: 1,
      visitantesAtivos: 1,
      avaliacoes: 1,
      notaMedia: 4,
      problemasAbertos: 1,
      sugestoesAbertas: 1,
    })
    expect(r.corpo.porDia).toHaveLength(7)
    expect(r.corpo.porDia.at(-1)).toMatchObject({ visitas: 1, contasNovas: 2 })
    expect(r.corpo.pontosMaisVisitados).toEqual([{ id: alvo.id, nome: alvo.nome, visitas: 1 }])
    expect(r.corpo.pontosMelhorAvaliados[0]).toMatchObject({ id: alvo.id, notaMedia: 4, avaliacoes: 1 })
    expect(r.corpo.visitasPorCategoria).toEqual([{ categoria: alvo.categoria.nome, visitas: 1 }])
    expect(r.corpo.problemasAbertosPorTipo).toEqual([{ tipo: 'LIMPEZA', total: 1 }])
  })

  it('é só da administração e valida o período', async () => {
    const v = await novoVisitante(amb)
    expect((await pedir(amb, 'GET', '/api/relatorios', { sessao: v.sessao })).status).toBe(403)
    expect((await pedir(amb, 'GET', '/api/relatorios')).status).toBe(401)
    expect((await pedir(amb, 'GET', '/api/relatorios?dias=0', { sessao: admin })).status).toBe(400)
    expect((await pedir(amb, 'GET', '/api/relatorios', { sessao: admin })).corpo.porDia).toHaveLength(30)
  })
})
