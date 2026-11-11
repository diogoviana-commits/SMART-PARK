/**
 * Pontos de interesse e categorias (RF03, RF06, RF07) e a manutenção deles pela
 * administração (RF12). Consultar é aberto a qualquer pessoa: o mapa funciona sem
 * conta.
 */
import { Hono } from 'hono'
import { and, asc, avg, count, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { coordenadaValida, distanciaEmMetros } from '../../compartilhado/distancia.js'
import type { Ambiente, Ctx } from '../contexto.js'
import { corpoJson, exigirAdministrador, idDaRota } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import { avaliacoes, categorias, checkins, eventos, pontos } from '../db/esquema.js'
import { ErroHttp } from '../erros.js'

type Ponto = typeof pontos.$inferSelect
type Categoria = typeof categorias.$inferSelect

export const respostaCategoria = (c: Categoria) => ({ id: c.id, slug: c.slug, nome: c.nome, icone: c.icone, cor: c.cor })

/** "06:00:00.000000" → "06:00:00" */
const hora = (valor: string | null) => (valor ? valor.slice(0, 8) : null)

export function respostaPonto(p: Ponto, c: Categoria, resumo?: { media: number; total: number }) {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    categoria: respostaCategoria(c),
    latitude: p.latitude,
    longitude: p.longitude,
    horarioAbertura: hora(p.horarioAbertura),
    horarioFechamento: hora(p.horarioFechamento),
    statusOperacional: p.statusOperacional,
    acessivel: p.acessivel,
    fotoUrl: p.fotoUrl,
    notaMedia: resumo ? resumo.media : null,
    totalAvaliacoes: resumo ? resumo.total : 0,
  }
}

/** Média e total de avaliações de cada ponto, numa consulta só. */
async function resumoDasAvaliacoes(banco: Banco, ids: number[]) {
  const mapa = new Map<number, { media: number; total: number }>()
  if (ids.length === 0) return mapa
  const linhas = await banco
    .select({ poiId: avaliacoes.poiId, media: avg(avaliacoes.nota), total: count() })
    .from(avaliacoes)
    .where(inArray(avaliacoes.poiId, ids))
    .groupBy(avaliacoes.poiId)
  for (const l of linhas) {
    mapa.set(l.poiId, { media: Math.round(Number(l.media) * 10) / 10, total: Number(l.total) })
  }
  return mapa
}

async function listarPontos(banco: Banco, filtro?: SQL) {
  const linhas = await banco
    .select({ p: pontos, c: categorias })
    .from(pontos)
    .innerJoin(categorias, eq(pontos.categoriaId, categorias.id))
    .where(filtro)
    .orderBy(asc(pontos.nome))
  const resumo = await resumoDasAvaliacoes(banco, linhas.map((l) => l.p.id))
  return linhas.map((l) => respostaPonto(l.p, l.c, resumo.get(l.p.id)))
}

export async function buscarPonto(banco: Banco, id: number) {
  const [linha] = await banco
    .select({ p: pontos, c: categorias })
    .from(pontos)
    .innerJoin(categorias, eq(pontos.categoriaId, categorias.id))
    .where(eq(pontos.id, id))
  if (!linha) throw new ErroHttp(404, `Ponto de interesse ${id} não encontrado.`)
  return linha
}

/** Escapa % e _ para a busca tratar o texto digitado como texto, não como padrão. */
const literal = (texto: string) => texto.replace(/[\\%_]/g, (m) => `\\${m}`)

const HORA = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'deve estar no formato HH:MM')
  .transform((h) => (h.length === 5 ? `${h}:00` : h))

const esquemaPonto = z.object({
  nome: z.string().trim().min(1, 'é obrigatório').max(120, 'pode ter no máximo 120 caracteres'),
  descricao: z.string().trim().max(600, 'pode ter no máximo 600 caracteres').nullish(),
  categoriaSlug: z.string().trim().min(1, 'é obrigatório'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  horarioAbertura: HORA.nullish(),
  horarioFechamento: HORA.nullish(),
  statusOperacional: z.enum(['EM_FUNCIONAMENTO', 'EM_MANUTENCAO', 'FECHADO']).optional(),
  acessivel: z.boolean().optional(),
  fotoUrl: z.url('deve ser um endereço válido').max(400).nullish(),
})

async function valoresDoPonto(c: Ctx) {
  const dados = esquemaPonto.parse(await corpoJson(c))
  const [categoria] = await c.get('banco').select().from(categorias).where(eq(categorias.slug, dados.categoriaSlug.toLowerCase()))
  if (!categoria) throw new ErroHttp(400, `Categoria "${dados.categoriaSlug}" não existe.`)
  return {
    nome: dados.nome,
    descricao: dados.descricao ?? null,
    categoriaId: categoria.id,
    latitude: dados.latitude,
    longitude: dados.longitude,
    horarioAbertura: dados.horarioAbertura ?? null,
    horarioFechamento: dados.horarioFechamento ?? null,
    statusOperacional: dados.statusOperacional ?? 'EM_FUNCIONAMENTO',
    acessivel: dados.acessivel ?? false,
    fotoUrl: dados.fotoUrl ?? null,
  }
}

export const rotasCategorias = new Hono<Ambiente>().get('/', async (c) => {
  const linhas = await c.get('banco').select().from(categorias).orderBy(asc(categorias.nome))
  return c.json(linhas.map(respostaCategoria))
})

export const rotasPontos = new Hono<Ambiente>()
  .get('/', async (c) => {
    const { busca, categoria, acessivel } = c.req.query()
    const filtros: SQL[] = []
    if (busca?.trim()) {
      const padrao = `%${literal(busca.trim().slice(0, 100))}%`
      filtros.push(or(ilike(pontos.nome, padrao), ilike(pontos.descricao, padrao))!)
    }
    if (categoria?.trim()) filtros.push(eq(categorias.slug, categoria.trim().toLowerCase()))
    if (acessivel === 'true' || acessivel === 'false') filtros.push(eq(pontos.acessivel, acessivel === 'true'))
    return c.json(await listarPontos(c.get('banco'), filtros.length ? and(...filtros) : undefined))
  })

  .get('/proximos', async (c) => {
    const lat = Number(c.req.query('lat'))
    const lon = Number(c.req.query('lon'))
    const raio = Number(c.req.query('raio') ?? 500)
    if (!coordenadaValida(lat, lon)) throw new ErroHttp(400, 'Coordenadas inválidas.')
    if (!Number.isFinite(raio) || raio <= 0 || raio > 5_000) throw new ErroHttp(400, 'O raio deve ficar entre 1 e 5000 metros.')
    const todos = await listarPontos(c.get('banco'))
    const proximos = todos
      .map((p) => ({ p, d: distanciaEmMetros(lat, lon, p.latitude, p.longitude) }))
      .filter((x) => x.d <= raio)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.p)
    return c.json(proximos)
  })

  .get('/:id{[0-9]+}', async (c) => {
    const banco = c.get('banco')
    const { p, c: cat } = await buscarPonto(banco, idDaRota(c))
    const resumo = await resumoDasAvaliacoes(banco, [p.id])
    return c.json(respostaPonto(p, cat, resumo.get(p.id)))
  })

  .post('/', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const [criado] = await banco.insert(pontos).values(await valoresDoPonto(c)).returning()
    const { p, c: cat } = await buscarPonto(banco, criado.id)
    c.header('Location', `/api/pois/${p.id}`)
    return c.json(respostaPonto(p, cat), 201)
  })

  .put('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarPonto(banco, id)
    await banco.update(pontos).set(await valoresDoPonto(c)).where(eq(pontos.id, id))
    const { p, c: cat } = await buscarPonto(banco, id)
    const resumo = await resumoDasAvaliacoes(banco, [id])
    return c.json(respostaPonto(p, cat, resumo.get(id)))
  })

  .delete('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    const { p } = await buscarPonto(banco, id)
    // Avaliações e visitas do ponto saem com ele. Eventos ficam: perdem o vínculo
    // com o ponto, mas guardam o nome do local como texto.
    await banco.delete(avaliacoes).where(eq(avaliacoes.poiId, id))
    await banco.delete(checkins).where(eq(checkins.poiId, id))
    await banco
      .update(eventos)
      .set({ poiId: null, localDescritivo: p.nome })
      .where(and(eq(eventos.poiId, id), isNull(eventos.localDescritivo)))
    await banco.update(eventos).set({ poiId: null }).where(eq(eventos.poiId, id))
    await banco.delete(pontos).where(eq(pontos.id, id))
    return c.body(null, 204)
  })
