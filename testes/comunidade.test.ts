/**
 * Comunidade: favoritos, problemas, avisos, feed, perfil, seguir e ranking.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { PONTOS } from '../servidor/db/dados-iniciais.js'
import { medalhas, nivel } from '../servidor/gamificacao.js'
import { nomePublico } from '../servidor/rotas/comunidade.js'
import { entrarComoAdministrador, novoVisitante, pedir, prepararAmbiente, type Ambiente } from './apoio.js'

let amb: Ambiente
let admin: string
let ids: Map<string, number>
beforeAll(async () => {
  amb = await prepararAmbiente()
  admin = await entrarComoAdministrador(amb)
  const lista = await pedir(amb, 'GET', '/api/pois')
  ids = new Map(lista.corpo.map((p: { nome: string; id: number }) => [p.nome, p.id]))
})

const visitar = (sessao: string, nome: string) => {
  const p = PONTOS.find((x) => x.nome === nome)!
  return pedir(amb, 'POST', '/api/visitas', { sessao, corpo: { poiId: ids.get(nome), latitude: p.latitude, longitude: p.longitude } })
}

describe('regras de gamificação', () => {
  it('100 XP por nível, como no protótipo (1.240 XP = nível 12, faltam 60)', () => {
    expect(nivel(1240)).toMatchObject({ nivel: 13, faltam: 60 })
    expect(nivel(0)).toMatchObject({ nivel: 1, faltam: 100 })
  })

  it('medalhas por distância e avaliações', () => {
    const lista = medalhas({ quilometros: 6, visitas: 0, pontosDiferentes: 0, avaliacoes: 10, eventos: 0, xpDeMissoes: 0 })
    const ganhas = lista.filter((m) => m.conquistada).map((m) => m.nome)
    expect(ganhas).toEqual(['Primeiros Passos', 'Turista', 'Voz do Parque'])
  })

  it('nome público mostra só o primeiro nome e a inicial', () => {
    expect(nomePublico('Olga Maria Menezes')).toBe('Olga M.')
    expect(nomePublico('Olga')).toBe('Olga')
  })
})

describe('favoritos e problemas', () => {
  it('favorita e desfavorita um ponto', async () => {
    const { sessao } = await novoVisitante(amb)
    await pedir(amb, 'POST', '/api/pois/3/favorito', { sessao })
    await pedir(amb, 'POST', '/api/pois/3/favorito', { sessao }) // repetir não duplica
    expect((await pedir(amb, 'GET', '/api/favoritos', { sessao })).corpo.map((f: { id: number }) => f.id)).toEqual([3])
    await pedir(amb, 'DELETE', '/api/pois/3/favorito', { sessao })
    expect((await pedir(amb, 'GET', '/api/favoritos', { sessao })).corpo).toEqual([])
  })

  it('visitante reporta um problema e a administração resolve', async () => {
    const { sessao } = await novoVisitante(amb)
    const r = await pedir(amb, 'POST', '/api/pois/6/problemas', { sessao, corpo: { tipo: 'LIMPEZA', descricao: 'Sem papel.' } })
    expect(r.status).toBe(201)
    expect((await pedir(amb, 'GET', '/api/problemas', { sessao })).status).toBe(403)
    const abertos = await pedir(amb, 'GET', '/api/problemas', { sessao: admin })
    expect(abertos.corpo.some((p: { id: number }) => p.id === r.corpo.id)).toBe(true)
    const resolvido = await pedir(amb, 'PATCH', `/api/problemas/${r.corpo.id}`, { sessao: admin, corpo: { situacao: 'RESOLVIDO' } })
    expect(resolvido.corpo.situacao).toBe('RESOLVIDO')
  })

  it('tipo de problema inválido é recusado', async () => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/pois/6/problemas', { sessao, corpo: { tipo: 'XYZ' } })).status).toBe(400)
  })
})

describe('feed', () => {
  it('aviso oficial aparece no topo do feed para todos, e só a administração publica', async () => {
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/avisos', { sessao, corpo: { titulo: 'X', texto: 'Y' } })).status).toBe(403)
    const criado = await pedir(amb, 'POST', '/api/avisos', {
      sessao: admin,
      corpo: { titulo: 'Trecho sul em manutenção', texto: 'Use o desvio pela alameda central.', poiId: 30 },
    })
    expect(criado.status).toBe(201)
    const feed = await pedir(amb, 'GET', '/api/feed')
    expect(feed.corpo.avisos[0]).toMatchObject({ titulo: 'Trecho sul em manutenção', poiId: 30 })
  })

  it('aviso que já terminou não aparece', async () => {
    await pedir(amb, 'POST', '/api/avisos', { sessao: admin, corpo: { titulo: 'Antigo', texto: 'x', inicio: '2020-01-01T08:00', fim: '2020-01-02T08:00' } })
    const feed = await pedir(amb, 'GET', '/api/feed')
    expect(feed.corpo.avisos.map((a: { titulo: string }) => a.titulo)).not.toContain('Antigo')
  })

  it('publica, curte, comenta e apaga', async () => {
    const autora = await novoVisitante(amb, 'Olga Menezes')
    const outro = await novoVisitante(amb)
    const p = await pedir(amb, 'POST', '/api/publicacoes', {
      sessao: autora.sessao,
      corpo: { texto: 'Achei o deck pelo mapa em dois minutos.', poiId: 30 },
    })
    expect(p.status).toBe(201)
    expect(p.corpo).toMatchObject({ autor: { nome: 'Olga M.' }, poiNome: 'Lago Principal', curtidas: 0 })

    const curtida = await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/curtida`, { sessao: outro.sessao })
    expect(curtida.corpo).toMatchObject({ curtiu: true, curtidas: 1 })
    await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/comentarios`, { sessao: outro.sessao, corpo: { texto: 'Boa dica!' } })
    const feed = await pedir(amb, 'GET', '/api/feed', { sessao: outro.sessao })
    expect(feed.corpo.publicacoes.find((x: { id: number }) => x.id === p.corpo.id)).toMatchObject({ curtidas: 1, comentarios: 1, curtiu: true, minha: false })

    expect((await pedir(amb, 'DELETE', `/api/publicacoes/${p.corpo.id}`, { sessao: outro.sessao })).status).toBe(403)
    expect((await pedir(amb, 'DELETE', `/api/publicacoes/${p.corpo.id}`, { sessao: autora.sessao })).status).toBe(204)
  })

  it('três denúncias de pessoas diferentes tiram a publicação do feed', async () => {
    const autor = await novoVisitante(amb)
    const p = await pedir(amb, 'POST', '/api/publicacoes', { sessao: autor.sessao, corpo: { texto: 'conteúdo impróprio' } })
    for (let i = 0; i < 3; i++) {
      const { sessao } = await novoVisitante(amb)
      await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/denuncia`, { sessao })
    }
    const feed = await pedir(amb, 'GET', '/api/feed')
    expect(feed.corpo.publicacoes.some((x: { id: number }) => x.id === p.corpo.id)).toBe(false)
    const revisar = await pedir(amb, 'GET', '/api/publicacoes/denunciadas', { sessao: admin })
    expect(revisar.corpo.find((x: { id: number }) => x.id === p.corpo.id)).toMatchObject({ oculta: true, denuncias: 3 })
  })

  it('a mesma pessoa denunciar várias vezes conta uma vez', async () => {
    const autor = await novoVisitante(amb)
    const p = await pedir(amb, 'POST', '/api/publicacoes', { sessao: autor.sessao, corpo: { texto: 'texto' } })
    const { sessao } = await novoVisitante(amb)
    for (let i = 0; i < 3; i++) await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/denuncia`, { sessao })
    const r = await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/denuncia`, { sessao })
    expect(r.corpo.oculta).toBe(false)
  })

  it('publicar exige login e texto', async () => {
    expect((await pedir(amb, 'POST', '/api/publicacoes', { corpo: { texto: 'oi' } })).status).toBe(401)
    const { sessao } = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', '/api/publicacoes', { sessao, corpo: { texto: '   ' } })).status).toBe(400)
  })
})

describe('perfil, amigos e ranking', () => {
  it('o perfil traz nível, estatísticas, medalhas e pontos visitados', async () => {
    const { sessao } = await novoVisitante(amb, 'Eliana Souza')
    await visitar(sessao, 'Banheiro das Quadras')
    await visitar(sessao, 'Bicicletário')
    await pedir(amb, 'POST', `/api/pois/${ids.get('Bicicletário')}/avaliacoes`, { sessao, corpo: { nota: 5 } })
    const r = await pedir(amb, 'GET', '/api/perfil', { sessao })
    expect(r.corpo).toMatchObject({ nome: 'Eliana Souza', estatisticas: { visitas: 2, avaliacoes: 1 } })
    expect(r.corpo.nivel.xp).toBe(25) // 2 visitas × 10 + 1 avaliação × 5
    expect(r.corpo.medalhas).toHaveLength(6)
    expect(r.corpo.pontosVisitados.find((p: { nome: string }) => p.nome === 'Bicicletário').minhaNota).toBe(5)
  })

  it('o perfil de outra pessoa não mostra e-mail nem nome completo', async () => {
    const alvo = await novoVisitante(amb, 'Marcos Oliveira')
    const r = await pedir(amb, 'GET', `/api/perfis/${alvo.id}`)
    expect(r.corpo.nome).toBe('Marcos O.')
    expect(JSON.stringify(r.corpo)).not.toContain(alvo.email)
  })

  it('seguir, deixar de seguir e ranking entre amigos', async () => {
    const eu = await novoVisitante(amb, 'Ana Lima')
    const amiga = await novoVisitante(amb, 'Bia Costa')
    await visitar(amiga.sessao, 'Lago Principal')
    expect((await pedir(amb, 'POST', `/api/perfis/${amiga.id}/seguir`, { sessao: eu.sessao })).corpo.euSigo).toBe(true)
    const ranking = await pedir(amb, 'GET', '/api/ranking?escopo=amigos', { sessao: eu.sessao })
    expect(ranking.corpo.posicoes.map((p: { nome: string }) => p.nome)).toEqual(['Bia C.', 'Ana L.'])
    expect(ranking.corpo.posicoes[1].voce).toBe(true)
    await pedir(amb, 'DELETE', `/api/perfis/${amiga.id}/seguir`, { sessao: eu.sessao })
    expect((await pedir(amb, 'GET', '/api/perfil/seguindo', { sessao: eu.sessao })).corpo).toEqual([])
  })

  it('não dá para seguir a si mesmo', async () => {
    const eu = await novoVisitante(amb)
    expect((await pedir(amb, 'POST', `/api/perfis/${eu.id}/seguir`, { sessao: eu.sessao })).status).toBe(400)
  })

  it('quem fecha o perfil some do ranking e não pode ser seguido', async () => {
    const reservado = await novoVisitante(amb, 'Carlos Reservado')
    await visitar(reservado.sessao, 'Lago do Bosque')
    await pedir(amb, 'PATCH', '/api/perfil', { sessao: reservado.sessao, corpo: { perfilPublico: false } })
    const outro = await novoVisitante(amb)
    const ranking = await pedir(amb, 'GET', '/api/ranking', { sessao: outro.sessao })
    expect(ranking.corpo.posicoes.some((p: { usuarioId: number }) => p.usuarioId === reservado.id)).toBe(false)
    expect((await pedir(amb, 'POST', `/api/perfis/${reservado.id}/seguir`, { sessao: outro.sessao })).status).toBe(404)
    expect((await pedir(amb, 'GET', `/api/perfis/${reservado.id}`, { sessao: outro.sessao })).status).toBe(404)
  })

  it('ranking geral ordena por XP da semana', async () => {
    const r = await pedir(amb, 'GET', '/api/ranking')
    const xps = r.corpo.posicoes.map((p: { xpSemana: number }) => p.xpSemana)
    expect(xps).toEqual([...xps].sort((a: number, b: number) => b - a))
  })

  it('apagar a conta leva junto publicações, curtidas e seguidores', async () => {
    const pessoa = await novoVisitante(amb)
    const amigo = await novoVisitante(amb)
    await pedir(amb, 'POST', `/api/perfis/${pessoa.id}/seguir`, { sessao: amigo.sessao })
    const p = await pedir(amb, 'POST', '/api/publicacoes', { sessao: pessoa.sessao, corpo: { texto: 'até logo' } })
    await pedir(amb, 'POST', `/api/publicacoes/${p.corpo.id}/curtida`, { sessao: amigo.sessao })
    expect((await pedir(amb, 'DELETE', `/api/usuarios/${pessoa.id}`, { sessao: pessoa.sessao })).status).toBe(204)
    expect((await pedir(amb, 'GET', '/api/perfil/seguindo', { sessao: amigo.sessao })).corpo).toEqual([])
  })
})
