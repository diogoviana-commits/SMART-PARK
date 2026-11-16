/**
 * Backup e restauração: o que sai de um banco precisa voltar igual em outro.
 */
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { describe, expect, it } from 'vitest'
import { gerarBackup, restaurarBackup } from '../servidor/db/backup.js'
import { carregarDadosIniciais } from '../servidor/db/carga.js'
import type { Banco } from '../servidor/db/conexao.js'
import * as esquema from '../servidor/db/esquema.js'
import { lerMigracoes, migrar } from '../servidor/db/migracoes.js'

async function bancoMigrado(ate?: number) {
  const pg = new PGlite()
  const sql = {
    executar: async (texto: string) => void (await pg.exec(texto)),
    consultar: async (texto: string) => (await pg.query(texto)).rows as never,
  }
  await migrar(sql, lerMigracoes('db/migracoes').filter((m) => !ate || m.versao <= ate))
  return { pg, banco: drizzle(pg, { schema: esquema }) as unknown as Banco }
}

describe('backup do banco', () => {
  it('restaura em outro banco exatamente o que foi guardado', async () => {
    const origem = await bancoMigrado()
    await carregarDadosIniciais(origem.banco, 'administracao-do-parque-2026')
    await origem.pg.exec(`
      INSERT INTO tb_usuario (nome, email, senha_hash, tipo_perfil, data_cadastro)
        VALUES ('Olga Menezes', 'olga@exemplo.com', '$2a$12$x', 'VISITANTE', '2026-11-10 09:30:00');
      INSERT INTO tb_avaliacao (id_usuario, id_poi, nota, comentario, data_avaliacao)
        SELECT u.id, 1, 5, 'Limpo e "bem" cuidado — ótimo', '2026-11-10 10:00:00' FROM tb_usuario u WHERE u.email = 'olga@exemplo.com';
    `)

    // Passa por texto, como no arquivo gravado em disco
    const backup = JSON.parse(JSON.stringify(await gerarBackup(origem.pg)))

    const destino = await bancoMigrado()
    await carregarDadosIniciais(destino.banco, 'outra-senha-qualquer-2026')
    const restauradas = await restaurarBackup(destino.pg, backup)
    expect(restauradas.tb_usuario).toBe(2)
    expect(restauradas.tb_migracao).toBeUndefined()

    const depois = await gerarBackup(destino.pg)
    const semMigracoes = (b: typeof depois) => b.tabelas.filter((t) => t.nome !== 'tb_migracao')
    expect(semMigracoes(depois)).toEqual(semMigracoes(backup))

    // A sequência continua depois do maior id restaurado
    const novo = await destino.pg.query<{ id: number }>(
      `INSERT INTO tb_usuario (nome, email, senha_hash, tipo_perfil, data_cadastro)
       VALUES ('Nova', 'nova@exemplo.com', 'x', 'VISITANTE', now()) RETURNING id`,
    )
    const maior = Math.max(...backup.tabelas.find((t: any) => t.nome === 'tb_usuario').linhas.map((l: any) => l.id))
    expect(Number(novo.rows[0].id)).toBe(maior + 1)
  })

  it('recusa restaurar num banco em outra versão, sem apagar nada', async () => {
    const origem = await bancoMigrado()
    await carregarDadosIniciais(origem.banco)
    const backup = await gerarBackup(origem.pg)

    const antigo = await bancoMigrado(6)
    await antigo.pg.exec(`INSERT INTO tb_usuario (nome, email, senha_hash, tipo_perfil, data_cadastro) VALUES ('Fica', 'fica@exemplo.com', 'x', 'VISITANTE', now())`)
    await expect(restaurarBackup(antigo.pg, backup)).rejects.toThrow(/V7.*V6/)
    const { rows } = await antigo.pg.query(`SELECT count(*)::int AS n FROM tb_usuario`)
    expect((rows[0] as { n: number }).n).toBe(1)
  })
})
