/**
 * Missões (RF09 da Especificação) com progresso verificado no servidor.
 *
 * Na versão em Java, o aplicativo informava quanto a pessoa tinha andado, e um
 * único pedido com um número alto concluía qualquer missão. Agora o progresso é
 * calculado aqui, a partir de visitas (check-ins):
 *
 * - a visita só é aceita com a posição a até 30 m do ponto, uma vez por ponto por dia;
 * - a distância entre duas visitas seguidas do mesmo dia conta como caminhada,
 *   limitada ao que dá para andar a 7 km/h no tempo que passou entre elas;
 * - a visita ao local de um evento, durante o evento, conta como participação.
 *
 * A posição ainda vem do aparelho e pode ser falsificada; o que muda é que ela
 * não vale mais nada sozinha. Para pontuar, é preciso "estar" em pontos reais, um
 * de cada vez, num ritmo de caminhada.
 */
import { Hono } from 'hono'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { coordenadaValida, distanciaEmMetros } from '../../compartilhado/distancia.js'
import type { Ambiente } from '../contexto.js'
import { corpoJson, exigirLogin } from '../contexto.js'
import type { Banco } from '../db/conexao.js'
import { checkins, conclusoes, eventos, missoes, pontos, type Periodicidade } from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { emMilissegundos, hojeNoParque, inicioDaSemana, noParque, paraIso, semanaIso } from '../tempo.js'

/** Distância máxima entre o visitante e o ponto para a visita valer. */
export const RAIO_DA_VISITA_M = 30
/** Ritmo máximo creditado entre duas visitas: uma caminhada rápida. */
export const VELOCIDADE_MAXIMA_M_POR_S = 7_000 / 3_600
/** A visita conta para o evento a partir de 30 minutos antes do início. */
const ANTECEDENCIA_EVENTO_MS = 30 * 60_000
/** Evento sem horário de término é considerado em andamento por 3 horas. */
const DURACAO_PADRAO_EVENTO_MS = 3 * 3_600_000

type Missao = typeof missoes.$inferSelect

interface Totais {
  pontosVisitados: number
  quilometros: number
  eventos: number
}

function somar(linhas: (typeof checkins.$inferSelect)[]): Totais {
  return {
    pontosVisitados: new Set(linhas.map((l) => l.poiId)).size,
    quilometros: Math.round((linhas.reduce((s, l) => s + l.metros, 0) / 1000) * 100) / 100,
    eventos: new Set(linhas.filter((l) => l.eventoId !== null).map((l) => l.eventoId)).size,
  }
}

const periodoDe = (periodicidade: Periodicidade, dia: string) => (periodicidade === 'DIARIA' ? dia : semanaIso(dia))

function valorPara(missao: Missao, totais: Totais): number {
  if (missao.tipo === 'DISTANCIA') return totais.quilometros
  if (missao.tipo === 'CHECKIN') return totais.pontosVisitados
  return totais.eventos
}

/** Missões com o progresso de quem está logado no dia e na semana atuais. */
async function missoesComProgresso(banco: Banco, usuarioId: number | null, filtro?: Periodicidade) {
  const lista = await banco
    .select()
    .from(missoes)
    .where(filtro ? eq(missoes.periodicidade, filtro) : undefined)
    .orderBy(asc(missoes.periodicidade), asc(missoes.meta))

  const dia = hojeNoParque()
  let doDia: Totais = { pontosVisitados: 0, quilometros: 0, eventos: 0 }
  let daSemana = doDia
  const concluidas = new Map<string, string>()

  if (usuarioId !== null) {
    const daSemanaLinhas = await banco
      .select()
      .from(checkins)
      .where(and(eq(checkins.usuarioId, usuarioId), gte(checkins.dia, inicioDaSemana(dia)), lte(checkins.dia, dia)))
    daSemana = somar(daSemanaLinhas)
    doDia = somar(daSemanaLinhas.filter((l) => l.dia === dia))
    const feitas = await banco
      .select()
      .from(conclusoes)
      .where(and(eq(conclusoes.usuarioId, usuarioId), sql`${conclusoes.periodo} IN (${dia}, ${semanaIso(dia)})`))
    for (const f of feitas) concluidas.set(`${f.missaoId}|${f.periodo}`, f.momento)
  }

  return lista.map((m) => {
    const progresso = valorPara(m, m.periodicidade === 'DIARIA' ? doDia : daSemana)
    const conclusao = concluidas.get(`${m.id}|${periodoDe(m.periodicidade, dia)}`) ?? null
    return {
      id: m.id,
      nome: m.nome,
      descricao: m.descricao,
      tipo: m.tipo,
      periodicidade: m.periodicidade,
      valorMeta: m.meta,
      pontosRecompensa: m.pontos,
      progressoAtual: progresso,
      fracaoConcluida: m.meta <= 0 ? 1 : Math.min(1, progresso / m.meta),
      concluida: conclusao !== null || progresso >= m.meta,
      dataConclusao: paraIso(conclusao),
    }
  })
}

async function pontuacao(banco: Banco, usuarioId: number): Promise<number> {
  const [linha] = await banco
    .select({ total: sql<number>`coalesce(sum(${missoes.pontos}), 0)::int` })
    .from(conclusoes)
    .innerJoin(missoes, eq(conclusoes.missaoId, missoes.id))
    .where(eq(conclusoes.usuarioId, usuarioId))
  return Number(linha?.total ?? 0)
}

const esquemaVisita = z.object({
  poiId: z.number().int().positive(),
  latitude: z.number(),
  longitude: z.number(),
})

export const rotasMissoes = new Hono<Ambiente>()
  /** Aberto: sem login, as missões aparecem zeradas, para quem ainda não tem conta conhecer. */
  .get('/', async (c) => {
    const periodicidade = c.req.query('periodicidade')?.toUpperCase()
    if (periodicidade && periodicidade !== 'DIARIA' && periodicidade !== 'SEMANAL') {
      throw new ErroHttp(400, 'Periodicidade deve ser DIARIA ou SEMANAL.')
    }
    const usuario = c.get('usuario')
    return c.json(await missoesComProgresso(c.get('banco'), usuario?.id ?? null, periodicidade as Periodicidade | undefined))
  })

  .get('/pontos', async (c) => {
    const usuario = exigirLogin(c)
    return c.json({ usuarioId: usuario.id, pontos: await pontuacao(c.get('banco'), usuario.id) })
  })

export const rotasVisitas = new Hono<Ambiente>().post('/', async (c) => {
  const usuario = exigirLogin(c)
  const banco = c.get('banco')
  const dados = esquemaVisita.parse(await corpoJson(c))
  if (!coordenadaValida(dados.latitude, dados.longitude)) throw new ErroHttp(400, 'Coordenadas inválidas.')

  const [ponto] = await banco.select().from(pontos).where(eq(pontos.id, dados.poiId))
  if (!ponto) throw new ErroHttp(404, `Ponto de interesse ${dados.poiId} não encontrado.`)

  const afastamento = distanciaEmMetros(dados.latitude, dados.longitude, ponto.latitude, ponto.longitude)
  if (afastamento > RAIO_DA_VISITA_M) {
    throw new ErroHttp(
      400,
      `Você está a ${Math.round(afastamento)} m do ponto. Chegue a até ${RAIO_DA_VISITA_M} m para registrar a visita.`,
    )
  }

  const agora = new Date()
  const momento = noParque(agora)
  const dia = hojeNoParque(agora)

  const [repetida] = await banco
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.usuarioId, usuario.id), eq(checkins.poiId, ponto.id), eq(checkins.dia, dia)))
  if (repetida) throw new ErroHttp(409, 'Você já registrou a visita a este ponto hoje.')

  // Caminhada creditada: a distância desde a visita anterior do dia, até o que
  // dá para andar no tempo que passou.
  let metros = 0
  const [anterior] = await banco
    .select({ v: checkins, p: pontos })
    .from(checkins)
    .innerJoin(pontos, eq(checkins.poiId, pontos.id))
    .where(and(eq(checkins.usuarioId, usuario.id), eq(checkins.dia, dia)))
    .orderBy(desc(checkins.momento))
    .limit(1)
  if (anterior) {
    const reta = distanciaEmMetros(anterior.p.latitude, anterior.p.longitude, ponto.latitude, ponto.longitude)
    const segundos = Math.max(0, (agora.getTime() - emMilissegundos(anterior.v.momento)) / 1000)
    metros = Math.round(Math.min(reta, segundos * VELOCIDADE_MAXIMA_M_POR_S) * 10) / 10
  }

  // Participação em evento: visita ao local do evento enquanto ele acontece.
  const doLocal = await banco.select().from(eventos).where(eq(eventos.poiId, ponto.id))
  const evento = doLocal.find((e) => {
    const inicio = emMilissegundos(e.inicio)
    const fim = e.fim ? emMilissegundos(e.fim) : inicio + DURACAO_PADRAO_EVENTO_MS
    return agora.getTime() >= inicio - ANTECEDENCIA_EVENTO_MS && agora.getTime() <= fim
  })

  const [visita] = await banco
    .insert(checkins)
    .values({ usuarioId: usuario.id, poiId: ponto.id, dia, momento, metros, eventoId: evento?.id ?? null })
    .onConflictDoNothing()
    .returning()
  if (!visita) throw new ErroHttp(409, 'Você já registrou a visita a este ponto hoje.')

  // Registra as missões que esta visita concluiu.
  const situacao = await missoesComProgresso(banco, usuario.id)
  const novas: string[] = []
  for (const m of situacao) {
    if (m.progressoAtual < m.valorMeta) continue
    const [registrada] = await banco
      .insert(conclusoes)
      .values({ usuarioId: usuario.id, missaoId: m.id, periodo: periodoDe(m.periodicidade, dia), momento })
      .onConflictDoNothing()
      .returning()
    if (registrada) novas.push(m.nome)
  }

  return c.json(
    {
      visita: {
        id: visita.id,
        poiId: ponto.id,
        poiNome: ponto.nome,
        momento: paraIso(visita.momento),
        metros: visita.metros,
        evento: evento ? { id: evento.id, nome: evento.nome } : null,
      },
      missoesConcluidas: novas,
      missoes: await missoesComProgresso(banco, usuario.id),
    },
    201,
  )
})
