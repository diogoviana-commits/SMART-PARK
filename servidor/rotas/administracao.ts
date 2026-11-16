/**
 * O que a administração do parque usa além do cadastro de pontos e eventos:
 * relatórios de uso (UC09), sugestões dos visitantes (RF10) e a foto de cada
 * ponto (RF07).
 */
import { Hono } from 'hono'
import { and, avg, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Ambiente } from '../contexto.js'
import { corpoJson, exigirAdministrador, exigirLogin, idDaRota } from '../contexto.js'
import {
  avaliacoes,
  categorias,
  checkins,
  conclusoes,
  fotos,
  missoes,
  pontos,
  problemas,
  publicacoes,
  sugestoes,
  usuarios,
} from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { hojeNoParque, noParque, paraIso, somarDias } from '../tempo.js'
import { buscarPonto } from './pontos.js'

// ---------------------------------------------------------------- sugestões ---

/** Sugestões por conta a cada 24 horas: o bastante para quem quer ajudar, pouco para quem quer inundar. */
const SUGESTOES_POR_DIA = 5

export const rotasSugestoes = new Hono<Ambiente>()
  .post('/', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const { texto } = z
      .object({ texto: z.string().trim().min(5, 'escreva a sua sugestão').max(1000, 'pode ter no máximo 1000 caracteres') })
      .parse(await corpoJson(c))
    const ontem = noParque(new Date(Date.now() - 24 * 3_600_000))
    const [{ n }] = await banco
      .select({ n: count() })
      .from(sugestoes)
      .where(and(eq(sugestoes.usuarioId, usuario.id), gte(sugestoes.momento, ontem)))
    if (Number(n) >= SUGESTOES_POR_DIA) throw new ErroHttp(429, 'Você já enviou várias sugestões hoje. Obrigado! Tente de novo amanhã.')
    const [criada] = await banco.insert(sugestoes).values({ usuarioId: usuario.id, texto, situacao: 'ABERTO', momento: noParque() }).returning()
    return c.json({ id: criada.id, texto: criada.texto, situacao: criada.situacao, momento: paraIso(criada.momento) }, 201)
  })
  .get('/', async (c) => {
    exigirAdministrador(c)
    const situacao = z.enum(['ABERTO', 'RESOLVIDO', 'DESCARTADO']).parse(c.req.query('situacao') ?? 'ABERTO')
    const linhas = await c
      .get('banco')
      .select({ s: sugestoes, autor: usuarios.nome })
      .from(sugestoes)
      .innerJoin(usuarios, eq(sugestoes.usuarioId, usuarios.id))
      .where(eq(sugestoes.situacao, situacao))
      .orderBy(desc(sugestoes.momento))
      .limit(200)
    return c.json(
      linhas.map(({ s, autor }) => ({ id: s.id, texto: s.texto, situacao: s.situacao, momento: paraIso(s.momento), autor: { id: s.usuarioId, nome: autor } })),
    )
  })
  .patch('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const { situacao } = z.object({ situacao: z.enum(['ABERTO', 'RESOLVIDO', 'DESCARTADO']) }).parse(await corpoJson(c))
    const [atualizada] = await c.get('banco').update(sugestoes).set({ situacao }).where(eq(sugestoes.id, idDaRota(c))).returning()
    if (!atualizada) throw new ErroHttp(404, 'Sugestão não encontrada.')
    return c.json({ id: atualizada.id, situacao: atualizada.situacao })
  })

// --------------------------------------------------------------- relatórios ---

/**
 * Relatório de uso (UC09) dos últimos N dias. Só contagens: nenhum dado de
 * localização de visitante aparece aqui além do ponto visitado (RNF04).
 */
export const rotasRelatorios = new Hono<Ambiente>().get('/', async (c) => {
  exigirAdministrador(c)
  const banco = c.get('banco')
  const dias = z.coerce.number().int().min(1).max(365).parse(c.req.query('dias') ?? 30)
  const hoje = hojeNoParque()
  const desde = somarDias(hoje, -(dias - 1))
  const desdeInstante = `${desde} 00:00:00`
  const diaDoCadastro = sql<string>`to_char(${usuarios.dataCadastro}, 'YYYY-MM-DD')`
  const total = count()

  // Cada consulta é um pedido HTTP ao banco: vão todas juntas.
  const [
    [contas],
    [contasNovas],
    [bloqueadas],
    [visitas],
    [notas],
    [posts],
    [problemasAbertos],
    [sugestoesAbertas],
    visitasPorDia,
    contasPorDia,
    maisVisitados,
    melhorAvaliados,
    porCategoria,
    missoesConcluidas,
    problemasPorTipo,
  ] = await Promise.all([
    banco.select({ n: total }).from(usuarios),
    banco.select({ n: total }).from(usuarios).where(gte(usuarios.dataCadastro, desdeInstante)),
    banco.select({ n: total }).from(usuarios).where(eq(usuarios.bloqueado, true)),
    banco.select({ n: total, pessoas: countDistinct(checkins.usuarioId) }).from(checkins).where(gte(checkins.dia, desde)),
    banco.select({ n: total, media: avg(avaliacoes.nota) }).from(avaliacoes).where(gte(avaliacoes.dataAvaliacao, desdeInstante)),
    banco.select({ n: total }).from(publicacoes).where(gte(publicacoes.momento, desdeInstante)),
    banco.select({ n: total }).from(problemas).where(eq(problemas.situacao, 'ABERTO')),
    banco.select({ n: total }).from(sugestoes).where(eq(sugestoes.situacao, 'ABERTO')),
    banco.select({ dia: checkins.dia, n: total }).from(checkins).where(gte(checkins.dia, desde)).groupBy(checkins.dia),
    banco.select({ dia: diaDoCadastro, n: total }).from(usuarios).where(gte(usuarios.dataCadastro, desdeInstante)).groupBy(diaDoCadastro),
    banco
      .select({ id: pontos.id, nome: pontos.nome, n: total })
      .from(checkins)
      .innerJoin(pontos, eq(checkins.poiId, pontos.id))
      .where(gte(checkins.dia, desde))
      .groupBy(pontos.id, pontos.nome)
      .orderBy(desc(total), pontos.nome)
      .limit(10),
    banco
      .select({ id: pontos.id, nome: pontos.nome, media: avg(avaliacoes.nota), n: total })
      .from(avaliacoes)
      .innerJoin(pontos, eq(avaliacoes.poiId, pontos.id))
      .groupBy(pontos.id, pontos.nome)
      .orderBy(desc(avg(avaliacoes.nota)), desc(total))
      .limit(5),
    banco
      .select({ nome: categorias.nome, n: total })
      .from(checkins)
      .innerJoin(pontos, eq(checkins.poiId, pontos.id))
      .innerJoin(categorias, eq(pontos.categoriaId, categorias.id))
      .where(gte(checkins.dia, desde))
      .groupBy(categorias.nome)
      .orderBy(desc(total)),
    banco
      .select({ nome: missoes.nome, n: total })
      .from(conclusoes)
      .innerJoin(missoes, eq(conclusoes.missaoId, missoes.id))
      .where(gte(conclusoes.momento, desdeInstante))
      .groupBy(missoes.nome)
      .orderBy(desc(total)),
    banco.select({ tipo: problemas.tipo, n: total }).from(problemas).where(eq(problemas.situacao, 'ABERTO')).groupBy(problemas.tipo).orderBy(desc(total)),
  ])

  const visitasDoDia = new Map(visitasPorDia.map((l) => [l.dia, Number(l.n)]))
  const contasDoDia = new Map(contasPorDia.map((l) => [l.dia, Number(l.n)]))
  const porDia = Array.from({ length: dias }, (_, i) => {
    const dia = somarDias(desde, i)
    return { dia, visitas: visitasDoDia.get(dia) ?? 0, contasNovas: contasDoDia.get(dia) ?? 0 }
  })

  return c.json({
    periodo: { dias, de: desde, ate: hoje },
    totais: {
      contas: Number(contas.n),
      contasNovas: Number(contasNovas.n),
      contasBloqueadas: Number(bloqueadas.n),
      visitas: Number(visitas.n),
      visitantesAtivos: Number(visitas.pessoas),
      avaliacoes: Number(notas.n),
      notaMedia: notas.media === null ? null : Math.round(Number(notas.media) * 10) / 10,
      publicacoes: Number(posts.n),
      problemasAbertos: Number(problemasAbertos.n),
      sugestoesAbertas: Number(sugestoesAbertas.n),
    },
    porDia,
    pontosMaisVisitados: maisVisitados.map((l) => ({ id: l.id, nome: l.nome, visitas: Number(l.n) })),
    pontosMelhorAvaliados: melhorAvaliados.map((l) => ({ id: l.id, nome: l.nome, notaMedia: Math.round(Number(l.media) * 10) / 10, avaliacoes: Number(l.n) })),
    visitasPorCategoria: porCategoria.map((l) => ({ categoria: l.nome, visitas: Number(l.n) })),
    missoesConcluidas: missoesConcluidas.map((l) => ({ missao: l.nome, vezes: Number(l.n) })),
    problemasAbertosPorTipo: problemasPorTipo.map((l) => ({ tipo: l.tipo, total: Number(l.n) })),
  })
})

// --------------------------------------------------------------------- foto ---

/** A tela já reduz a foto antes de enviar; isto é o teto do que o servidor guarda. */
export const FOTO_MAXIMO_BYTES = 400 * 1024

const ASSINATURAS: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
}

const esquemaFoto = z.object({
  tipo: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  dados: z.string().min(1, 'é obrigatório').regex(/^[A-Za-z0-9+/]+={0,2}$/, 'deve estar em base64'),
})

/** Montado em /api/pois/:poiId/foto. */
export const rotasFoto = new Hono<Ambiente>()
  .get('/', async (c) => {
    const [foto] = await c.get('banco').select().from(fotos).where(eq(fotos.poiId, idDaRota(c, 'poiId')))
    if (!foto) throw new ErroHttp(404, 'Este ponto não tem foto.')
    // O endereço da foto muda a cada envio (?v=...), então a resposta pode ficar guardada.
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    c.header('Content-Type', foto.tipo)
    c.header('X-Content-Type-Options', 'nosniff')
    return c.body(Buffer.from(foto.dadosBase64, 'base64'))
  })
  .put('/', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await buscarPonto(banco, poiId)
    const { tipo, dados } = esquemaFoto.parse(await corpoJson(c))
    const bytes = Buffer.from(dados, 'base64')
    if (bytes.length > FOTO_MAXIMO_BYTES) throw new ErroHttp(400, `A foto pode ter no máximo ${FOTO_MAXIMO_BYTES / 1024} KB.`)
    // O tipo declarado precisa bater com o conteúdo: nada de HTML com nome de imagem.
    if (!ASSINATURAS[tipo](bytes)) throw new ErroHttp(400, 'O arquivo não é uma imagem do tipo informado.')

    const atualizado = noParque()
    await banco
      .insert(fotos)
      .values({ poiId, tipo, dadosBase64: dados, atualizado })
      .onConflictDoUpdate({ target: fotos.poiId, set: { tipo, dadosBase64: dados, atualizado } })
    const fotoUrl = `/api/pois/${poiId}/foto?v=${Date.now()}`
    await banco.update(pontos).set({ fotoUrl }).where(eq(pontos.id, poiId))
    return c.json({ poiId, fotoUrl })
  })
  .delete('/', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await banco.delete(fotos).where(eq(fotos.poiId, poiId))
    await banco.update(pontos).set({ fotoUrl: null }).where(eq(pontos.id, poiId))
    return c.body(null, 204)
  })
