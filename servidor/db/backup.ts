/**
 * Backup e restauração do banco, sem depender de pg_dump.
 *
 * O backup guarda as linhas de todas as tabelas tb_* como JSON, montado pelo
 * próprio PostgreSQL (to_jsonb), que também as lê de volta na restauração
 * (jsonb_populate_recordset): os tipos de cada coluna são conferidos pelo banco,
 * não por este código. A estrutura não vai no arquivo, porque ela já está
 * versionada em db/migracoes.
 *
 * Para restaurar, o banco de destino precisa estar migrado até a mesma versão do
 * backup. O conteúdo das tabelas do destino é substituído pelo do arquivo.
 */

/** Uma conexão só (as duas operações dependem de rodar na mesma conexão). */
export interface Consultor {
  query(sql: string, parametros?: unknown[]): Promise<{ rows: any[] }>
}

export interface Backup {
  formato: 1
  criado: string
  /** Maior versão de migração aplicada no banco de origem */
  versao: number
  /** Em ordem de dependência: uma tabela vem depois das que ela referencia */
  tabelas: { nome: string; linhas: Record<string, unknown>[] }[]
}

const TABELA_DE_MIGRACOES = 'tb_migracao'
const nomeSeguro = (nome: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(nome)) throw new Error(`Nome de tabela inesperado: ${nome}`)
  return `"${nome}"`
}

async function tabelasEmOrdem(db: Consultor): Promise<string[]> {
  const nomes = (
    await db.query(
      `SELECT table_name AS nome FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name LIKE 'tb\\_%'
        ORDER BY table_name`,
    )
  ).rows.map((l) => String(l.nome))

  const dependencias = (
    await db.query(
      `SELECT filho.relname AS filho, pai.relname AS pai
         FROM pg_constraint k
         JOIN pg_class filho ON filho.oid = k.conrelid
         JOIN pg_class pai ON pai.oid = k.confrelid
        WHERE k.contype = 'f' AND filho.relname <> pai.relname`,
    )
  ).rows as { filho: string; pai: string }[]

  const ordem: string[] = []
  const pendentes = new Set(nomes)
  while (pendentes.size > 0) {
    const livres = [...pendentes].filter(
      (t) => !dependencias.some((d) => d.filho === t && pendentes.has(d.pai)),
    )
    if (livres.length === 0) throw new Error('As tabelas se referenciam em círculo; não há ordem para restaurar.')
    for (const t of livres) {
      ordem.push(t)
      pendentes.delete(t)
    }
  }
  return ordem
}

async function versaoDoBanco(db: Consultor): Promise<number> {
  const [linha] = (await db.query(`SELECT coalesce(max(versao), 0)::int AS versao FROM ${TABELA_DE_MIGRACOES}`)).rows
  return Number(linha.versao)
}

export async function gerarBackup(db: Consultor): Promise<Backup> {
  // Uma transação só de leitura: todas as tabelas saem do mesmo instante.
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    const tabelas: Backup['tabelas'] = []
    for (const nome of await tabelasEmOrdem(db)) {
      const [linha] = (
        await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text AS linhas FROM ${nomeSeguro(nome)} t`)
      ).rows
      tabelas.push({ nome, linhas: JSON.parse(linha.linhas) })
    }
    return { formato: 1, criado: new Date().toISOString(), versao: await versaoDoBanco(db), tabelas }
  } finally {
    await db.query('COMMIT')
  }
}

/** @returns quantas linhas foram restauradas em cada tabela */
export async function restaurarBackup(db: Consultor, backup: Backup): Promise<Record<string, number>> {
  if (backup.formato !== 1) throw new Error('Formato de backup desconhecido.')
  const versao = await versaoDoBanco(db)
  if (versao !== backup.versao) {
    throw new Error(
      `O backup é da versão V${backup.versao} do banco e o destino está na V${versao}. ` +
        'Migre o destino até a mesma versão antes de restaurar.',
    )
  }

  const noDestino = new Set(await tabelasEmOrdem(db))
  const restauraveis = backup.tabelas.filter((t) => t.nome !== TABELA_DE_MIGRACOES)
  for (const t of restauraveis) {
    if (!noDestino.has(t.nome)) throw new Error(`A tabela ${t.nome} do backup não existe no destino.`)
  }

  const restauradas: Record<string, number> = {}
  await db.query('BEGIN')
  try {
    const limpar = [...noDestino].filter((t) => t !== TABELA_DE_MIGRACOES).map(nomeSeguro)
    if (limpar.length) await db.query(`TRUNCATE ${limpar.join(', ')} RESTART IDENTITY CASCADE`)

    for (const t of restauraveis) {
      const tabela = nomeSeguro(t.nome)
      if (t.linhas.length) {
        await db.query(`INSERT INTO ${tabela} SELECT * FROM jsonb_populate_recordset(NULL::${tabela}, $1::jsonb)`, [
          JSON.stringify(t.linhas),
        ])
      }
      restauradas[t.nome] = t.linhas.length
    }

    // Os ids vieram do arquivo: cada sequência continua do maior id restaurado.
    const identidades = (
      await db.query(
        `SELECT table_name AS tabela, column_name AS coluna FROM information_schema.columns
          WHERE table_schema = 'public' AND is_identity = 'YES' AND table_name LIKE 'tb\\_%'`,
      )
    ).rows as { tabela: string; coluna: string }[]
    for (const { tabela, coluna } of identidades) {
      if (tabela === TABELA_DE_MIGRACOES) continue
      await db.query(
        `SELECT setval(pg_get_serial_sequence('${nomeSeguro(tabela)}', '${coluna}'),
                       coalesce((SELECT max(${nomeSeguro(coluna)}) FROM ${nomeSeguro(tabela)}), 0) + 1, false)`,
      )
    }
    await db.query('COMMIT')
  } catch (erro) {
    await db.query('ROLLBACK')
    throw erro
  }
  return restauradas
}
