/**
 * Migração do banco publicado pela versão em Java: o Neon já tem V1–V3 aplicadas
 * pelo Flyway e os textos sem acento. A V4 em diante precisa rodar por cima disso
 * sem perder nenhum dado.
 */
import { describe, expect, it } from 'vitest'
import { conectarPglite } from '../servidor/db/conexao.js'
import { lerMigracoes, migrar } from '../servidor/db/migracoes.js'

describe('banco criado pelo Flyway', () => {
  it('reconhece V1–V3 como aplicadas, roda só as novas e acentua os textos antigos', async () => {
    const { sql, fechar } = await conectarPglite()
    const todas = lerMigracoes('db/migracoes')

    // Estado do Neon antes da troca: V1–V3 aplicadas pelo Flyway, carga do Java sem acento
    for (const m of todas.filter((x) => x.versao <= 3)) await sql.executar(m.sql)
    await sql.executar(`
      CREATE TABLE flyway_schema_history (installed_rank INT, version VARCHAR(50), description VARCHAR(200), success BOOLEAN);
      INSERT INTO flyway_schema_history VALUES (1,'1','esquema inicial',true),(2,'2','indices de consulta',true),(3,'3','versao do token',true);
      INSERT INTO tb_categoria_poi (slug, nome, icone, cor) VALUES ('alimentacao','Alimentacao','alimentacao','#b4542f'), ('lazer','Lazer e descanso','lazer','#7a5b8f');
      INSERT INTO tb_ponto_interesse (nome, descricao, id_categoria, latitude, longitude, status_operacional, acessivel)
        VALUES ('Praca da Agua', 'Area infantil com jatos de agua no piso. Iluminada.', 2, -23.632497, -46.572303, 'EM_FUNCIONAMENTO', false),
               ('Lago Editado', 'Texto que a administracao escreveu', 2, -23.6, -46.5, 'EM_FUNCIONAMENTO', false);
      INSERT INTO tb_usuario (nome, email, senha_hash, tipo_perfil, data_cadastro) VALUES ('Conta Antiga','antiga@exemplo.com','$2a$10$x','VISITANTE', now());
    `)

    const aplicadas = await migrar(sql, todas)
    expect(aplicadas).toEqual(todas.filter((m) => m.versao > 3).map((m) => m.versao))

    const [categoria] = await sql.consultar<{ nome: string }>(`SELECT nome FROM tb_categoria_poi WHERE slug = 'alimentacao'`)
    expect(categoria.nome).toBe('Alimentação')
    const pontos = await sql.consultar<{ nome: string; descricao: string }>(`SELECT nome, descricao FROM tb_ponto_interesse ORDER BY id`)
    expect(pontos[0]).toEqual({ nome: 'Praça da Água', descricao: 'Área infantil com jatos de água no piso. Iluminada.' })
    // O que a administração editou não é tocado
    expect(pontos[1].descricao).toBe('Texto que a administracao escreveu')
    // As contas existentes continuam lá
    const [{ total }] = await sql.consultar<{ total: number }>(`SELECT count(*)::int AS total FROM tb_usuario`)
    expect(total).toBe(1)

    // Rodar de novo não faz nada
    expect(await migrar(sql, todas)).toEqual([])
    await fechar()
  })

  it('num banco vazio, roda tudo desde a V1', async () => {
    const { sql, fechar } = await conectarPglite()
    const todas = lerMigracoes('db/migracoes')
    expect(await migrar(sql, todas)).toEqual(todas.map((m) => m.versao))
    await fechar()
  })
})
