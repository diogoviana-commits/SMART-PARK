/**
 * Conexão com o banco.
 *
 * - Produção (Vercel): PostgreSQL no Neon, pelo driver HTTP. Cada consulta é um
 *   pedido HTTP, sem conexão aberta para manter: é o que combina com funções
 *   serverless, que nascem e morrem a cada chamada.
 * - Testes e desenvolvimento: PGlite, um PostgreSQL de verdade compilado para
 *   WebAssembly, rodando dentro do próprio Node. Não precisa instalar banco.
 */
import { neon, Pool } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as esquema from './esquema.js'

export type Banco = PgDatabase<PgQueryResultHKT, typeof esquema>

/** Executa SQL bruto: usado pelas migrações e pela carga inicial. */
export interface ExecutorSql {
  executar(sql: string): Promise<void>
  consultar<T = Record<string, unknown>>(sql: string): Promise<T[]>
}

export interface Conexao {
  banco: Banco
  sql: ExecutorSql
  fechar(): Promise<void>
}

/** PostgreSQL no Neon, pelo endereço de DATABASE_URL. */
export function conectarNeon(url: string): Conexao {
  const banco = drizzleNeon(neon(url), { schema: esquema }) as unknown as Banco

  // As migrações têm vários comandos por arquivo, o que o HTTP não aceita numa
  // chamada só. O Pool (WebSocket) só é aberto se alguém pedir SQL bruto.
  let pool: Pool | null = null
  const obterPool = () => (pool ??= new Pool({ connectionString: url }))

  return {
    banco,
    sql: {
      async executar(texto) {
        await obterPool().query(texto)
      },
      async consultar(texto) {
        const resultado = await obterPool().query(texto)
        return resultado.rows as never
      },
    },
    async fechar() {
      await pool?.end()
    },
  }
}

/** PGlite na memória (pasta = undefined) ou gravado numa pasta local. */
export async function conectarPglite(pasta?: string): Promise<Conexao> {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const pg = new PGlite(pasta)
  const banco = drizzle(pg, { schema: esquema }) as unknown as Banco
  return {
    banco,
    sql: {
      async executar(texto) {
        await pg.exec(texto)
      },
      async consultar(texto) {
        const resultado = await pg.query(texto)
        return resultado.rows as never
      },
    },
    async fechar() {
      await pg.close()
    },
  }
}
