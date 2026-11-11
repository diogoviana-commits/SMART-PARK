/**
 * Agenda de eventos (RF08) e a manutenção dela pela administração (RF12).
 *
 * A versão em Java só listava eventos: não havia como cadastrar um novo. Agora a
 * administração cadastra, edita e remove pela API.
 */
import { Hono } from 'hono'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import type { Ambiente, Ctx } from '../contexto.js'
import { corpoJson, exigirAdministrador, idDaRota } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import { checkins, eventos, pontos } from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { hojeNoParque, paraIso, somarDias } from '../tempo.js'

type Evento = typeof eventos.$inferSelect
type Ponto = typeof pontos.$inferSelect

export function respostaEvento(e: Evento, p: Ponto | null) {
  return {
    id: e.id,
    nome: e.nome,
    descricao: e.descricao,
    dataHoraInicio: paraIso(e.inicio),
    dataHoraFim: paraIso(e.fim),
    local: p ? p.nome : e.localDescritivo,
    poiId: p ? p.id : null,
    latitude: p ? p.latitude : null,
    longitude: p ? p.longitude : null,
    linkMaisInfo: e.linkMaisInfo,
  }
}

const consultaBase = (banco: Banco) =>
  banco.select({ e: eventos, p: pontos }).from(eventos).leftJoin(pontos, eq(eventos.poiId, pontos.id))

async function buscarEvento(banco: Banco, id: number) {
  const [linha] = await consultaBase(banco).where(eq(eventos.id, id))
  if (!linha) throw new ErroHttp(404, `Evento ${id} não encontrado.`)
  return linha
}

/** Data e hora local do parque: '2026-11-20T19:00' ou '2026-11-20T19:00:00'. */
const DATA_HORA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'deve estar no formato AAAA-MM-DDTHH:MM')
  .transform((v) => `${v.replace('T', ' ')}${v.length === 16 ? ':00' : ''}`)

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'deve estar no formato AAAA-MM-DD')

const esquemaEvento = z
  .object({
    nome: z.string().trim().min(1, 'é obrigatório').max(150, 'pode ter no máximo 150 caracteres'),
    descricao: z.string().trim().max(800, 'pode ter no máximo 800 caracteres').nullish(),
    dataHoraInicio: DATA_HORA,
    dataHoraFim: DATA_HORA.nullish(),
    poiId: z.number().int().positive().nullish(),
    localDescritivo: z.string().trim().max(200, 'pode ter no máximo 200 caracteres').nullish(),
    linkMaisInfo: z.url('deve ser um endereço válido').max(400).nullish(),
  })
  .refine((e) => !e.dataHoraFim || e.dataHoraFim >= e.dataHoraInicio, {
    message: 'O fim do evento não pode ser antes do início.',
  })
  .refine((e) => e.poiId || e.localDescritivo, { message: 'Informe o ponto do parque ou descreva o local.' })

async function valoresDoEvento(c: Ctx) {
  const dados = esquemaEvento.parse(await corpoJson(c))
  if (dados.poiId) {
    const [ponto] = await c.get('banco').select({ id: pontos.id }).from(pontos).where(eq(pontos.id, dados.poiId))
    if (!ponto) throw new ErroHttp(400, `Ponto de interesse ${dados.poiId} não existe.`)
  }
  return {
    nome: dados.nome,
    descricao: dados.descricao ?? null,
    inicio: dados.dataHoraInicio,
    fim: dados.dataHoraFim ?? null,
    poiId: dados.poiId ?? null,
    localDescritivo: dados.localDescritivo ?? null,
    linkMaisInfo: dados.linkMaisInfo ?? null,
  }
}

export const rotasEventos = new Hono<Ambiente>()
  /** Sem datas, devolve de hoje até 30 dias à frente: a "lista do mês" do MVP. */
  .get('/', async (c) => {
    const banco = c.get('banco')
    const { de, ate, todos } = c.req.query()
    if (todos === 'true') {
      const linhas = await consultaBase(banco).orderBy(asc(eventos.inicio))
      return c.json(linhas.map((l) => respostaEvento(l.e, l.p)))
    }
    const inicio = de ? DATA.parse(de) : hojeNoParque()
    const fim = ate ? DATA.parse(ate) : somarDias(inicio, 30)
    if (fim < inicio) throw new ErroHttp(400, 'A data final não pode ser antes da inicial.')
    const linhas = await consultaBase(banco)
      .where(and(gte(eventos.inicio, `${inicio} 00:00:00`), lte(eventos.inicio, `${fim} 23:59:59.999999`)))
      .orderBy(asc(eventos.inicio))
    return c.json(linhas.map((l) => respostaEvento(l.e, l.p)))
  })

  .get('/:id{[0-9]+}', async (c) => {
    const { e, p } = await buscarEvento(c.get('banco'), idDaRota(c))
    return c.json(respostaEvento(e, p))
  })

  .post('/', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const [criado] = await banco.insert(eventos).values(await valoresDoEvento(c)).returning()
    const { e, p } = await buscarEvento(banco, criado.id)
    c.header('Location', `/api/eventos/${e.id}`)
    return c.json(respostaEvento(e, p), 201)
  })

  .put('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarEvento(banco, id)
    await banco.update(eventos).set(await valoresDoEvento(c)).where(eq(eventos.id, id))
    const { e, p } = await buscarEvento(banco, id)
    return c.json(respostaEvento(e, p))
  })

  .delete('/:id{[0-9]+}', async (c) => {
    exigirAdministrador(c)
    const banco = c.get('banco')
    const id = idDaRota(c)
    await buscarEvento(banco, id)
    // As visitas registradas durante o evento continuam valendo como visita ao ponto.
    await banco.update(checkins).set({ eventoId: null }).where(eq(checkins.eventoId, id))
    await banco.delete(eventos).where(eq(eventos.id, id))
    return c.body(null, 204)
  })
