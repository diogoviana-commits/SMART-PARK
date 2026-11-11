/**
 * Gamificação (RF09): XP, nível e medalhas, calculados a partir do que o
 * visitante fez de verdade no parque. Nada é informado pelo aparelho.
 *
 * Regras, tiradas do protótipo de alta fidelidade ("Nível 12 · 1.240 XP ·
 * faltam 60 XP"):
 * - cada nível pede 100 XP;
 * - visita registrada a um ponto: 10 XP;
 * - avaliação de um ponto: 5 XP (uma por ponto, como a própria avaliação);
 * - missão concluída: a recompensa da missão (50 a 300 XP).
 *
 * As medalhas são as quatro do protótipo, mais duas que completam os pilares
 * do projeto (explorar o parque e participar dos eventos).
 */
import { and, count, countDistinct, eq, gte, sql, sum } from 'drizzle-orm'
import type { Banco } from './db/conexao.js'
import { avaliacoes, checkins, conclusoes, missoes } from './db/esquema.js'
import { hojeNoParque, inicioDaSemana } from './tempo.js'

export const XP_POR_NIVEL = 100
export const XP_POR_VISITA = 10
export const XP_POR_AVALIACAO = 5

export interface Totais {
  /** Quilômetros creditados, no total */
  quilometros: number
  /** Visitas registradas (uma por ponto por dia) */
  visitas: number
  /** Pontos diferentes já visitados */
  pontosDiferentes: number
  avaliacoes: number
  eventos: number
  /** XP das missões concluídas */
  xpDeMissoes: number
}

export interface Medalha {
  id: string
  nome: string
  descricao: string
  meta: number
  progresso: number
  conquistada: boolean
}

const MEDALHAS: { id: string; nome: string; descricao: string; meta: number; valor: (t: Totais) => number }[] = [
  { id: 'primeiros-passos', nome: 'Primeiros Passos', descricao: 'Caminhe 2,5 km no parque', meta: 2.5, valor: (t) => t.quilometros },
  { id: 'turista', nome: 'Turista', descricao: 'Caminhe 5 km no parque', meta: 5, valor: (t) => t.quilometros },
  { id: 'andarilho', nome: 'Andarilho', descricao: 'Caminhe 20 km no parque', meta: 20, valor: (t) => t.quilometros },
  { id: 'voz-do-parque', nome: 'Voz do Parque', descricao: 'Avalie 10 pontos do parque', meta: 10, valor: (t) => t.avaliacoes },
  { id: 'explorador', nome: 'Explorador', descricao: 'Visite 15 pontos diferentes', meta: 15, valor: (t) => t.pontosDiferentes },
  { id: 'presenca-cultural', nome: 'Presença Cultural', descricao: 'Participe de 3 eventos do parque', meta: 3, valor: (t) => t.eventos },
]

export function medalhas(t: Totais): Medalha[] {
  return MEDALHAS.map((m) => {
    const progresso = Math.min(m.meta, m.valor(t))
    return { id: m.id, nome: m.nome, descricao: m.descricao, meta: m.meta, progresso, conquistada: m.valor(t) >= m.meta }
  })
}

export function xpTotal(t: Totais): number {
  return t.xpDeMissoes + t.visitas * XP_POR_VISITA + t.avaliacoes * XP_POR_AVALIACAO
}

export function nivel(xp: number) {
  const atual = Math.floor(xp / XP_POR_NIVEL) + 1
  return { nivel: atual, xp, faltam: atual * XP_POR_NIVEL - xp, fracao: (xp % XP_POR_NIVEL) / XP_POR_NIVEL }
}

/** Totais de um visitante; com `desde`, só o que aconteceu a partir desse dia (para o ranking da semana). */
export async function totaisDe(banco: Banco, usuarioId: number, desde?: string): Promise<Totais> {
  const filtroDia = desde ? gte(checkins.dia, desde) : undefined
  const [visitas] = await banco
    .select({
      visitas: count(),
      pontos: countDistinct(checkins.poiId),
      metros: sum(checkins.metros),
      eventos: countDistinct(checkins.eventoId),
    })
    .from(checkins)
    .where(and(eq(checkins.usuarioId, usuarioId), filtroDia))
  const [notas] = await banco
    .select({ total: count() })
    .from(avaliacoes)
    .where(and(eq(avaliacoes.usuarioId, usuarioId), desde ? gte(avaliacoes.dataAvaliacao, `${desde} 00:00:00`) : undefined))
  const [xp] = await banco
    .select({ total: sql<number>`coalesce(sum(${missoes.pontos}), 0)::int` })
    .from(conclusoes)
    .innerJoin(missoes, eq(conclusoes.missaoId, missoes.id))
    .where(and(eq(conclusoes.usuarioId, usuarioId), desde ? gte(conclusoes.momento, `${desde} 00:00:00`) : undefined))
  return {
    quilometros: Math.round((Number(visitas?.metros ?? 0) / 1000) * 100) / 100,
    visitas: Number(visitas?.visitas ?? 0),
    pontosDiferentes: Number(visitas?.pontos ?? 0),
    avaliacoes: Number(notas?.total ?? 0),
    eventos: Number(visitas?.eventos ?? 0),
    xpDeMissoes: Number(xp?.total ?? 0),
  }
}

/** XP ganho nesta semana (segunda a hoje), usado no ranking. */
export async function xpDaSemana(banco: Banco, usuarioId: number): Promise<number> {
  return xpTotal(await totaisDe(banco, usuarioId, inicioDaSemana(hojeNoParque())))
}
