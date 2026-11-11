/**
 * Aplica as migrações de db/migracoes em ordem, uma vez cada.
 *
 * O banco publicado foi criado pelo Flyway, na versão em Java, e já tem V1 a V3.
 * Se a tabela do Flyway existir, as versões que ele marcou como aplicadas entram
 * aqui como já feitas, e só as novas rodam. Num banco vazio, roda tudo desde a V1.
 *
 * Regra para mudanças: nunca edite um arquivo já aplicado. Crie o próximo Vn.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExecutorSql } from './conexao.js'

export interface Migracao {
  versao: number
  nome: string
  sql: string
}

const PADRAO = /^V(\d+)__(.+)\.sql$/

/** Lê os arquivos Vn__nome.sql da pasta, em ordem de versão. */
export function lerMigracoes(pasta: string): Migracao[] {
  return readdirSync(pasta)
    .map((arquivo) => {
      const partes = PADRAO.exec(arquivo)
      if (!partes) return null
      return { versao: Number(partes[1]), nome: partes[2], sql: readFileSync(join(pasta, arquivo), 'utf8') }
    })
    .filter((m): m is Migracao => m !== null)
    .sort((a, b) => a.versao - b.versao)
}

async function tabelaExiste(sql: ExecutorSql, nome: string): Promise<boolean> {
  const linhas = await sql.consultar<{ existe: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${nome}') AS existe`,
  )
  return Boolean(linhas[0]?.existe)
}

/** @returns as versões aplicadas nesta execução */
export async function migrar(sql: ExecutorSql, migracoes: Migracao[]): Promise<number[]> {
  await sql.executar(`
    CREATE TABLE IF NOT EXISTS tb_migracao (
      versao     INT          NOT NULL PRIMARY KEY,
      nome       VARCHAR(200) NOT NULL,
      aplicada   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      origem     VARCHAR(20)  NOT NULL DEFAULT 'smartpark'
    )`)

  const registradas = new Set(
    (await sql.consultar<{ versao: number }>('SELECT versao FROM tb_migracao')).map((l) => Number(l.versao)),
  )

  if (registradas.size === 0 && (await tabelaExiste(sql, 'flyway_schema_history'))) {
    const doFlyway = await sql.consultar<{ version: string; description: string }>(
      `SELECT version, description FROM flyway_schema_history WHERE success AND version IS NOT NULL`,
    )
    for (const linha of doFlyway) {
      const versao = Number(linha.version)
      const nome = linha.description.replace(/'/g, "''")
      await sql.executar(`INSERT INTO tb_migracao (versao, nome, origem) VALUES (${versao}, '${nome}', 'flyway')`)
      registradas.add(versao)
    }
  }

  const aplicadas: number[] = []
  for (const migracao of migracoes) {
    if (registradas.has(migracao.versao)) continue
    const nome = migracao.nome.replace(/'/g, "''")
    // A migração e o seu registro vão juntos: se a migração falhar no meio, nada fica marcado.
    await sql.executar(
      `BEGIN;\n${migracao.sql}\n;INSERT INTO tb_migracao (versao, nome) VALUES (${migracao.versao}, '${nome}');\nCOMMIT;`,
    )
    aplicadas.push(migracao.versao)
  }
  return aplicadas
}
