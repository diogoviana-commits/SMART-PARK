/**
 * Comunidade e engajamento, como no protótipo de alta fidelidade:
 * favoritos, reportar problema, avisos oficiais, feed "No parque hoje",
 * perfil, seguir (amigos) e ranking da semana.
 *
 * Privacidade:
 * - fora da própria conta, ninguém vê e-mail; o nome aparece como "Olga M.";
 * - quem desliga "perfil público" em Ajustes some do ranking, não pode ser
 *   seguido e tem o perfil fechado para outras pessoas;
 * - publicação com 3 denúncias de pessoas diferentes sai do feed na hora, até a
 *   administração revisar.
 */
import { Hono } from 'hono'
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Ambiente, Ctx, UsuarioLogado } from '../contexto.js'
import { corpoJson, exigirAdministrador, exigirLogin, idDaRota } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import {
  avaliacoes,
  avisos,
  checkins,
  comentarios,
  conclusoes,
  curtidas,
  denuncias,
  favoritos,
  pontos,
  problemas,
  publicacoes,
  seguidores,
  usuarios,
} from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { medalhas, nivel, totaisDe, xpDaSemana, xpTotal } from '../gamificacao.js'
import { hojeNoParque, inicioDaSemana, noParque, paraIso, somarDias } from '../tempo.js'
import { buscarPonto } from './pontos.js'

/** Publicação com este número de denúncias de pessoas diferentes sai do feed. */
export const DENUNCIAS_PARA_OCULTAR = 3

/** "Olga Menezes" → "Olga M." */
export function nomePublico(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`
}

const DATA_HORA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'deve estar no formato AAAA-MM-DDTHH:MM')
  .transform((v) => `${v.replace('T', ' ')}${v.length === 16 ? ':00' : ''}`)

async function buscarUsuario(banco: Banco, id: number) {
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, id))
  if (!u) throw new ErroHttp(404, 'Pessoa não encontrada.')
  return u
}

async function nivelDe(banco: Banco, usuarioId: number) {
  return nivel(xpTotal(await totaisDe(banco, usuarioId))).nivel
}

// ---------------------------------------------------------------- favoritos ---

export const rotasFavoritos = new Hono<Ambiente>()
  .get('/', async (c) => {
    const usuario = exigirLogin(c)
    const linhas = await c
      .get('banco')
      .select({ id: pontos.id, nome: pontos.nome, latitude: pontos.latitude, longitude: pontos.longitude })
      .from(favoritos)
      .innerJoin(pontos, eq(favoritos.poiId, pontos.id))
      .where(eq(favoritos.usuarioId, usuario.id))
      .orderBy(desc(favoritos.momento))
    return c.json(linhas)
  })

/** Montado em /api/pois/:poiId: favorito e problema de um ponto. */
export const rotasDoPonto = new Hono<Ambiente>()
  .post('/favorito', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await buscarPonto(banco, poiId)
    await banco.insert(favoritos).values({ usuarioId: usuario.id, poiId, momento: noParque() }).onConflictDoNothing()
    return c.json({ poiId, favorito: true })
  })
  .delete('/favorito', async (c) => {
    const usuario = exigirLogin(c)
    const poiId = idDaRota(c, 'poiId')
    await c.get('banco').delete(favoritos).where(and(eq(favoritos.usuarioId, usuario.id), eq(favoritos.poiId, poiId)))
    return c.json({ poiId, favorito: false })
  })
  .post('/problemas', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await buscarPonto(banco, poiId)
    const dados = z
      .object({
        tipo: z.enum(['LIMPEZA', 'QUEBRADO', 'FECHADO', 'SEGURANCA', 'ACESSIBILIDADE', 'INFORMACAO', 'OUTRO']),
        descricao: z.string().trim().max(600, 'pode ter no máximo 600 caracteres').nullish(),
      })
      .parse(await corpoJson(c))
    const [criado] = await banco
      .insert(problemas)
      .values({ usuarioId: usuario.id, poiId, tipo: dados.tipo, descricao: dados.descricao || null, situacao: 'ABERTO', momento: noParque() })
      .returning()
    return c.json({ id: criado.id, poiId, tipo: criado.tipo, situacao: criado.situacao, momento: paraIso(criado.momento) }, 201)
  })

// -------------------------------------------------- problemas (administração) ---

export const rotasProblemas = new Hono<Ambiente>()
  .get('/', async (c) => {
    exigirAdministrador(c)
    const situacao = z.enum(['ABERTO', 'RESOLVIDO', 'DESCARTADO']).parse(c.req.query('situacao') ?? 'ABERTO')
    const linhas = await c
      .get('banco')
      .select({ p: problemas, poi: pontos.nome })
      .from(problemas)
      .innerJoin(pontos, eq(problemas.poiId, pontos.id))
      .where(eq(problemas.situacao, situacao))
      .orderBy(desc(problemas.momento))
    return c.json(
      linhas.map(({ p, poi }) => ({
        id: p.id,
        poiId: p.poiId,
        poiNome: poi,
        tipo: p.tipo,
        descricao: p.descricao,
        situacao: p.situacao,
        momento: paraIso(p.momento),
        resolvido: paraIso(p.resolvido),
      })),
    )
  })
  .patch('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const { situacao } = z.object({ situacao: z.enum(['ABERTO', 'RESOLVIDO', 'DESCARTADO']) }).parse(await corpoJson(c))
    const [atualizado] = await c
      .get('banco')
      .update(problemas)
      .set({ situacao, resolvido: situacao === 'ABERTO' ? null : noParque() })
      .where(eq(problemas.id, idDaRota(c)))
      .returning()
    if (!atualizado) throw new ErroHttp(404, 'Problema não encontrado.')
    return c.json({ id: atualizado.id, situacao: atualizado.situacao })
  })

// ------------------------------------------------------------------- avisos ---

const esquemaAviso = z.object({
  titulo: z.string().trim().min(1, 'é obrigatório').max(120, 'pode ter no máximo 120 caracteres'),
  texto: z.string().trim().min(1, 'é obrigatório').max(600, 'pode ter no máximo 600 caracteres'),
  poiId: z.number().int().positive().nullish(),
  inicio: DATA_HORA.optional(),
  fim: DATA_HORA.nullish(),
})

type Aviso = typeof avisos.$inferSelect
const respostaAviso = (a: Aviso, poiNome: string | null) => ({
  id: a.id,
  titulo: a.titulo,
  texto: a.texto,
  poiId: a.poiId,
  poiNome,
  inicio: paraIso(a.inicio),
  fim: paraIso(a.fim),
})

/** Avisos em vigor agora: já começaram e não terminaram. */
async function avisosAtivos(banco: Banco) {
  const agora = noParque()
  const linhas = await banco
    .select({ a: avisos, poi: pontos.nome })
    .from(avisos)
    .leftJoin(pontos, eq(avisos.poiId, pontos.id))
    .where(and(lte(avisos.inicio, agora), or(isNull(avisos.fim), gte(avisos.fim, agora))))
    .orderBy(desc(avisos.inicio))
  return linhas.map(({ a, poi }) => respostaAviso(a, poi))
}

export const rotasAvisos = new Hono<Ambiente>()
  .get('/', async (c) => {
    const banco = c.get('banco')
    if (c.req.query('todos') === 'true') {
      exigirAdministrador(c)
      const linhas = await banco.select({ a: avisos, poi: pontos.nome }).from(avisos).leftJoin(pontos, eq(avisos.poiId, pontos.id)).orderBy(desc(avisos.inicio))
      return c.json(linhas.map(({ a, poi }) => respostaAviso(a, poi)))
    }
    return c.json(await avisosAtivos(banco))
  })
  .post('/', async (c) => {
    const admin = exigirAdministrador(c)
    const dados = esquemaAviso.parse(await corpoJson(c))
    const banco = c.get('banco')
    if (dados.poiId) await buscarPonto(banco, dados.poiId)
    const [criado] = await banco
      .insert(avisos)
      .values({ titulo: dados.titulo, texto: dados.texto, poiId: dados.poiId ?? null, inicio: dados.inicio ?? noParque(), fim: dados.fim ?? null, autorId: admin.id })
      .returning()
    return c.json(respostaAviso(criado, null), 201)
  })
  .put('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const dados = esquemaAviso.parse(await corpoJson(c))
    const [atualizado] = await c
      .get('banco')
      .update(avisos)
      .set({ titulo: dados.titulo, texto: dados.texto, poiId: dados.poiId ?? null, ...(dados.inicio ? { inicio: dados.inicio } : {}), fim: dados.fim ?? null })
      .where(eq(avisos.id, idDaRota(c)))
      .returning()
    if (!atualizado) throw new ErroHttp(404, 'Aviso não encontrado.')
    return c.json(respostaAviso(atualizado, null))
  })
  .delete('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    await c.get('banco').delete(avisos).where(eq(avisos.id, idDaRota(c)))
    return c.body(null, 204)
  })

// --------------------------------------------------------------------- feed ---

async function publicacoesDoFeed(banco: Banco, logado: UsuarioLogado | null, opcoes: { autores?: number[]; limite?: number; incluirOcultas?: boolean }) {
  if (opcoes.autores && opcoes.autores.length === 0) return []
  const linhas = await banco
    .select({ p: publicacoes, autor: usuarios.nome, poi: pontos.nome })
    .from(publicacoes)
    .innerJoin(usuarios, eq(publicacoes.usuarioId, usuarios.id))
    .leftJoin(pontos, eq(publicacoes.poiId, pontos.id))
    .where(and(opcoes.incluirOcultas ? undefined : eq(publicacoes.oculta, false), opcoes.autores ? inArray(publicacoes.usuarioId, opcoes.autores) : undefined))
    .orderBy(desc(publicacoes.momento))
    .limit(opcoes.limite ?? 50)
  const ids = linhas.map((l) => l.p.id)
  if (ids.length === 0) return []

  const contagem = async (tabela: typeof curtidas | typeof comentarios) => {
    const r = await banco.select({ id: tabela.publicacaoId, n: count() }).from(tabela).where(inArray(tabela.publicacaoId, ids)).groupBy(tabela.publicacaoId)
    return new Map(r.map((x) => [x.id, Number(x.n)]))
  }
  const nCurtidas = await contagem(curtidas)
  const nComentarios = await contagem(comentarios)
  const minhas = logado
    ? new Set((await banco.select({ id: curtidas.publicacaoId }).from(curtidas).where(and(eq(curtidas.usuarioId, logado.id), inArray(curtidas.publicacaoId, ids)))).map((x) => x.id))
    : new Set<number>()

  const niveis = new Map<number, number>()
  for (const autorId of new Set(linhas.map((l) => l.p.usuarioId))) niveis.set(autorId, await nivelDe(banco, autorId))

  return linhas.map(({ p, autor, poi }) => ({
    id: p.id,
    texto: p.texto,
    momento: paraIso(p.momento),
    autor: { id: p.usuarioId, nome: nomePublico(autor), nivel: niveis.get(p.usuarioId) ?? 1 },
    poiId: p.poiId,
    poiNome: poi,
    curtidas: nCurtidas.get(p.id) ?? 0,
    comentarios: nComentarios.get(p.id) ?? 0,
    curtiu: minhas.has(p.id),
    minha: logado?.id === p.usuarioId,
    oculta: p.oculta,
  }))
}

async function idsQueSigo(banco: Banco, usuarioId: number): Promise<number[]> {
  return (await banco.select({ id: seguidores.seguidoId }).from(seguidores).where(eq(seguidores.seguidorId, usuarioId))).map((x) => x.id)
}

async function buscarPublicacao(banco: Banco, id: number) {
  const [p] = await banco.select().from(publicacoes).where(eq(publicacoes.id, id))
  if (!p || p.oculta) throw new ErroHttp(404, 'Publicação não encontrada.')
  return p
}

export const rotasFeed = new Hono<Ambiente>().get('/', async (c) => {
  const banco = c.get('banco')
  const usuario = c.get('usuario')
  const aba = c.req.query('aba') ?? 'para-voce'
  let autores: number[] | undefined
  if (aba === 'seguindo') {
    const logado = exigirLogin(c)
    autores = [logado.id, ...(await idsQueSigo(banco, logado.id))]
  }
  return c.json({ avisos: await avisosAtivos(banco), publicacoes: await publicacoesDoFeed(banco, usuario, { autores }) })
})

export const rotasPublicacoes = new Hono<Ambiente>()
  .post('/', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const dados = z
      .object({
        texto: z.string().trim().min(1, 'escreva alguma coisa').max(500, 'pode ter no máximo 500 caracteres'),
        poiId: z.number().int().positive().nullish(),
      })
      .parse(await corpoJson(c))
    if (dados.poiId) await buscarPonto(banco, dados.poiId)
    const [criada] = await banco.insert(publicacoes).values({ usuarioId: usuario.id, texto: dados.texto, poiId: dados.poiId ?? null, momento: noParque() }).returning()
    const [resposta] = (await publicacoesDoFeed(banco, usuario, { autores: [usuario.id], limite: 1 })).filter((p) => p.id === criada.id)
    return c.json(resposta, 201)
  })

  /** Administração: publicações denunciadas ou ocultas, para revisar. */
  .get('/denunciadas', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const linhas = await banco
      .select({ id: denuncias.publicacaoId, n: count() })
      .from(denuncias)
      .groupBy(denuncias.publicacaoId)
    const lista = await publicacoesDoFeed(banco, c.get('usuario'), { incluirOcultas: true, limite: 500 })
    const porId = new Map(linhas.map((l) => [l.id, Number(l.n)]))
    return c.json(lista.filter((p) => porId.has(p.id)).map((p) => ({ ...p, denuncias: porId.get(p.id) })))
  })

  /** Administração: ocultar ou devolver ao feed. */
  .patch('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const { oculta } = z.object({ oculta: z.boolean() }).parse(await corpoJson(c))
    const [p] = await c.get('banco').update(publicacoes).set({ oculta }).where(eq(publicacoes.id, idDaRota(c))).returning()
    if (!p) throw new ErroHttp(404, 'Publicação não encontrada.')
    return c.json({ id: p.id, oculta: p.oculta })
  })

  .delete('/:id{[0-9]+}', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    const [p] = await banco.select().from(publicacoes).where(eq(publicacoes.id, id))
    if (!p) throw new ErroHttp(404, 'Publicação não encontrada.')
    if (p.usuarioId !== usuario.id && usuario.perfil !== 'ADMINISTRADOR') throw new ErroHttp(403, 'Você só pode apagar as suas publicações.')
    await banco.delete(curtidas).where(eq(curtidas.publicacaoId, id))
    await banco.delete(comentarios).where(eq(comentarios.publicacaoId, id))
    await banco.delete(denuncias).where(eq(denuncias.publicacaoId, id))
    await banco.delete(publicacoes).where(eq(publicacoes.id, id))
    return c.body(null, 204)
  })

  .post('/:id{[0-9]+}/curtida', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarPublicacao(banco, id)
    await banco.insert(curtidas).values({ publicacaoId: id, usuarioId: usuario.id }).onConflictDoNothing()
    const [{ n }] = await banco.select({ n: count() }).from(curtidas).where(eq(curtidas.publicacaoId, id))
    return c.json({ id, curtiu: true, curtidas: Number(n) })
  })
  .delete('/:id{[0-9]+}/curtida', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await banco.delete(curtidas).where(and(eq(curtidas.publicacaoId, id), eq(curtidas.usuarioId, usuario.id)))
    const [{ n }] = await banco.select({ n: count() }).from(curtidas).where(eq(curtidas.publicacaoId, id))
    return c.json({ id, curtiu: false, curtidas: Number(n) })
  })

  .get('/:id{[0-9]+}/comentarios', async (c) => {
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarPublicacao(banco, id)
    const linhas = await banco
      .select({ k: comentarios, autor: usuarios.nome })
      .from(comentarios)
      .innerJoin(usuarios, eq(comentarios.usuarioId, usuarios.id))
      .where(eq(comentarios.publicacaoId, id))
      .orderBy(asc(comentarios.momento))
    const logado = c.get('usuario')
    return c.json(
      linhas.map(({ k, autor }) => ({ id: k.id, texto: k.texto, momento: paraIso(k.momento), autor: { id: k.usuarioId, nome: nomePublico(autor) }, meu: logado?.id === k.usuarioId })),
    )
  })
  .post('/:id{[0-9]+}/comentarios', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarPublicacao(banco, id)
    const { texto } = z.object({ texto: z.string().trim().min(1, 'escreva alguma coisa').max(300, 'pode ter no máximo 300 caracteres') }).parse(await corpoJson(c))
    const [k] = await banco.insert(comentarios).values({ publicacaoId: id, usuarioId: usuario.id, texto, momento: noParque() }).returning()
    return c.json({ id: k.id, texto: k.texto, momento: paraIso(k.momento), autor: { id: usuario.id, nome: nomePublico(usuario.nome) }, meu: true }, 201)
  })

  /** Denunciar: cada pessoa conta uma vez; com 3 denúncias, a publicação sai do feed. */
  .post('/:id{[0-9]+}/denuncia', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    const p = await buscarPublicacao(banco, id)
    if (p.usuarioId === usuario.id) throw new ErroHttp(400, 'Você não pode denunciar a sua própria publicação.')
    await banco.insert(denuncias).values({ publicacaoId: id, usuarioId: usuario.id, momento: noParque() }).onConflictDoNothing()
    const [{ n }] = await banco.select({ n: count() }).from(denuncias).where(eq(denuncias.publicacaoId, id))
    const oculta = Number(n) >= DENUNCIAS_PARA_OCULTAR
    if (oculta) await banco.update(publicacoes).set({ oculta: true }).where(eq(publicacoes.id, id))
    return c.json({ id, recebida: true, oculta })
  })

// ------------------------------------------------------------------- perfil ---

async function pontosVisitados(banco: Banco, usuarioId: number) {
  const desde = somarDias(hojeNoParque(), -6)
  const linhas = await banco
    .select({ poiId: checkins.poiId, nome: pontos.nome, categoria: pontos.categoriaId, momento: sql<string>`max(${checkins.momento})` })
    .from(checkins)
    .innerJoin(pontos, eq(checkins.poiId, pontos.id))
    .where(and(eq(checkins.usuarioId, usuarioId), gte(checkins.dia, desde)))
    .groupBy(checkins.poiId, pontos.nome, pontos.categoriaId)
    .orderBy(desc(sql`max(${checkins.momento})`))
  const notas = new Map(
    (await banco.select({ poiId: avaliacoes.poiId, nota: avaliacoes.nota }).from(avaliacoes).where(eq(avaliacoes.usuarioId, usuarioId))).map((a) => [a.poiId, a.nota]),
  )
  return linhas.map((l) => ({ poiId: l.poiId, nome: l.nome, ultimaVisita: paraIso(l.momento), minhaNota: notas.get(l.poiId) ?? null }))
}

async function resumoPerfil(banco: Banco, alvo: typeof usuarios.$inferSelect, completo: boolean, logado: UsuarioLogado | null) {
  const totais = await totaisDe(banco, alvo.id)
  const daSemana = await totaisDe(banco, alvo.id, inicioDaSemana(hojeNoParque()))
  const lista = medalhas(totais)
  const [{ seguindo }] = await banco.select({ seguindo: count() }).from(seguidores).where(eq(seguidores.seguidorId, alvo.id))
  const [{ seguidoresTotal }] = await banco.select({ seguidoresTotal: count() }).from(seguidores).where(eq(seguidores.seguidoId, alvo.id))
  const euSigo = logado
    ? (await banco.select().from(seguidores).where(and(eq(seguidores.seguidorId, logado.id), eq(seguidores.seguidoId, alvo.id)))).length > 0
    : false
  return {
    id: alvo.id,
    nome: completo ? alvo.nome : nomePublico(alvo.nome),
    ...(completo ? { email: alvo.email, perfilPublico: alvo.perfilPublico, perfil: alvo.perfil } : {}),
    desde: paraIso(alvo.dataCadastro),
    nivel: nivel(xpTotal(totais)),
    estatisticas: {
      quilometrosNaSemana: daSemana.quilometros,
      quilometros: totais.quilometros,
      visitas: totais.visitas,
      pontosDiferentes: totais.pontosDiferentes,
      avaliacoes: totais.avaliacoes,
      eventos: totais.eventos,
      medalhas: lista.filter((m) => m.conquistada).length,
    },
    medalhas: lista,
    pontosVisitados: await pontosVisitados(banco, alvo.id),
    seguindo: Number(seguindo),
    seguidores: Number(seguidoresTotal),
    euSigo,
  }
}

export const rotasPerfil = new Hono<Ambiente>()
  .get('/', async (c) => {
    const usuario = exigirLogin(c)
    return c.json(await resumoPerfil(c.get('banco'), usuario, true, usuario))
  })
  .patch('/', async (c) => {
    const usuario = exigirLogin(c)
    const dados = z
      .object({
        nome: z.string().trim().min(1, 'é obrigatório').max(120, 'pode ter no máximo 120 caracteres').optional(),
        perfilPublico: z.boolean().optional(),
      })
      .parse(await corpoJson(c))
    const [atualizado] = await c.get('banco').update(usuarios).set(dados).where(eq(usuarios.id, usuario.id)).returning()
    return c.json(await resumoPerfil(c.get('banco'), atualizado, true, atualizado))
  })
  .get('/seguindo', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const linhas = await banco
      .select({ id: usuarios.id, nome: usuarios.nome })
      .from(seguidores)
      .innerJoin(usuarios, eq(seguidores.seguidoId, usuarios.id))
      .where(eq(seguidores.seguidorId, usuario.id))
      .orderBy(asc(usuarios.nome))
    const resultado = []
    for (const l of linhas) resultado.push({ id: l.id, nome: nomePublico(l.nome), nivel: await nivelDe(banco, l.id) })
    return c.json(resultado)
  })

export const rotasPerfis = new Hono<Ambiente>()
  .get('/:id{[0-9]+}', async (c) => {
    const banco = c.get('banco')
    const logado = c.get('usuario')
    const alvo = await buscarUsuario(banco, idDaRota(c))
    const proprio = logado?.id === alvo.id
    if (!alvo.perfilPublico && !proprio && logado?.perfil !== 'ADMINISTRADOR') throw new ErroHttp(404, 'Este perfil é privado.')
    const resumo = await resumoPerfil(banco, alvo, proprio, logado)
    return c.json(proprio ? resumo : { ...resumo, pontosVisitados: [] })
  })
  .post('/:id{[0-9]+}/seguir', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const alvo = await buscarUsuario(banco, idDaRota(c))
    if (alvo.id === usuario.id) throw new ErroHttp(400, 'Você não pode seguir a si mesmo.')
    if (!alvo.perfilPublico) throw new ErroHttp(404, 'Este perfil é privado.')
    await banco.insert(seguidores).values({ seguidorId: usuario.id, seguidoId: alvo.id, momento: noParque() }).onConflictDoNothing()
    return c.json({ id: alvo.id, euSigo: true })
  })
  .delete('/:id{[0-9]+}/seguir', async (c) => {
    const usuario = exigirLogin(c)
    const id = idDaRota(c)
    await c.get('banco').delete(seguidores).where(and(eq(seguidores.seguidorId, usuario.id), eq(seguidores.seguidoId, id)))
    return c.json({ id, euSigo: false })
  })

// ------------------------------------------------------------------ ranking ---

/**
 * Ranking da semana (segunda a hoje) por XP ganho. "geral": todos os perfis
 * públicos com alguma atividade na semana; "amigos": você e quem você segue.
 */
export const rotasRanking = new Hono<Ambiente>().get('/', async (c) => {
  const banco = c.get('banco')
  const logado = c.get('usuario')
  const escopo = c.req.query('escopo') ?? 'geral'
  const desde = inicioDaSemana(hojeNoParque())

  let candidatos: number[]
  if (escopo === 'amigos') {
    const eu = exigirLogin(c)
    candidatos = [eu.id, ...(await idsQueSigo(banco, eu.id))]
  } else {
    const ativos = new Set<number>()
    for (const l of await banco.selectDistinct({ id: checkins.usuarioId }).from(checkins).where(gte(checkins.dia, desde))) ativos.add(l.id)
    for (const l of await banco.selectDistinct({ id: avaliacoes.usuarioId }).from(avaliacoes).where(gte(avaliacoes.dataAvaliacao, `${desde} 00:00:00`))) ativos.add(l.id)
    for (const l of await banco.selectDistinct({ id: conclusoes.usuarioId }).from(conclusoes).where(gte(conclusoes.momento, `${desde} 00:00:00`))) ativos.add(l.id)
    if (logado) ativos.add(logado.id)
    candidatos = [...ativos]
  }
  if (candidatos.length === 0) return c.json({ semanaDesde: desde, posicoes: [] })

  const pessoas = await banco.select().from(usuarios).where(inArray(usuarios.id, candidatos))
  const linhas = []
  for (const p of pessoas) {
    if (!p.perfilPublico && p.id !== logado?.id) continue
    const xp = await xpDaSemana(banco, p.id)
    linhas.push({ usuarioId: p.id, nome: nomePublico(p.nome), xpSemana: xp, nivel: await nivelDe(banco, p.id), voce: p.id === logado?.id })
  }
  linhas.sort((a, b) => b.xpSemana - a.xpSemana || a.nome.localeCompare(b.nome))
  return c.json({ semanaDesde: desde, posicoes: linhas.slice(0, 50).map((l, i) => ({ posicao: i + 1, ...l })) })
})
