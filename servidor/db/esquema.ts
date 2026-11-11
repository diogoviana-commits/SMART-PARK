/**
 * Tabelas do banco, espelhando as migrações de db/migracoes.
 *
 * O esquema é criado e alterado só pelas migrações SQL; este arquivo apenas
 * descreve as tabelas para as consultas tipadas. Mudou uma, muda o outro.
 *
 * Datas e horas ficam como texto (mode: 'string'): as colunas são TIMESTAMP sem
 * fuso, gravadas no horário de São Paulo, e convertê-las para Date faria o
 * JavaScript reinterpretar o horário no fuso do servidor.
 */
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  integer,
  pgTable,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

const id = () => bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity()
const ref = (coluna: string) => bigint(coluna, { mode: 'number' })
const instante = (coluna: string) => timestamp(coluna, { precision: 6, mode: 'string' })

export const categorias = pgTable('tb_categoria_poi', {
  id: id(),
  slug: varchar('slug', { length: 40 }).notNull(),
  nome: varchar('nome', { length: 80 }).notNull(),
  icone: varchar('icone', { length: 40 }),
  cor: varchar('cor', { length: 7 }),
})

export const usuarios = pgTable('tb_usuario', {
  id: id(),
  nome: varchar('nome', { length: 120 }).notNull(),
  email: varchar('email', { length: 160 }).notNull(),
  senhaHash: varchar('senha_hash', { length: 100 }).notNull(),
  perfil: varchar('tipo_perfil', { length: 20 }).$type<'VISITANTE' | 'ADMINISTRADOR'>().notNull(),
  dataCadastro: instante('data_cadastro').notNull(),
  ultimoAcesso: instante('ultimo_acesso'),
  versaoToken: integer('versao_token').notNull().default(0),
})

export type StatusOperacional = 'EM_FUNCIONAMENTO' | 'EM_MANUTENCAO' | 'FECHADO'

export const pontos = pgTable('tb_ponto_interesse', {
  id: id(),
  nome: varchar('nome', { length: 120 }).notNull(),
  descricao: varchar('descricao', { length: 600 }),
  categoriaId: ref('id_categoria').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  horarioAbertura: time('horario_abertura', { precision: 6 }),
  horarioFechamento: time('horario_fechamento', { precision: 6 }),
  statusOperacional: varchar('status_operacional', { length: 30 }).$type<StatusOperacional>().notNull(),
  acessivel: boolean('acessivel').notNull(),
  fotoUrl: varchar('foto_url', { length: 400 }),
})

export const eventos = pgTable('tb_evento', {
  id: id(),
  nome: varchar('nome', { length: 150 }).notNull(),
  descricao: varchar('descricao', { length: 800 }),
  inicio: instante('data_hora_inicio').notNull(),
  fim: instante('data_hora_fim'),
  localDescritivo: varchar('local_descritivo', { length: 200 }),
  poiId: ref('id_poi_local'),
  linkMaisInfo: varchar('link_mais_info', { length: 400 }),
})

export const avaliacoes = pgTable('tb_avaliacao', {
  id: id(),
  usuarioId: ref('id_usuario').notNull(),
  poiId: ref('id_poi').notNull(),
  nota: integer('nota').notNull(),
  comentario: varchar('comentario', { length: 600 }),
  dataAvaliacao: instante('data_avaliacao').notNull(),
})

export type TipoMissao = 'DISTANCIA' | 'CHECKIN' | 'EVENTO'
export type Periodicidade = 'DIARIA' | 'SEMANAL'

export const missoes = pgTable('tb_missao', {
  id: id(),
  nome: varchar('nome', { length: 120 }).notNull(),
  descricao: varchar('descricao', { length: 400 }),
  tipo: varchar('tipo_meta', { length: 20 }).$type<TipoMissao>().notNull(),
  periodicidade: varchar('periodicidade', { length: 20 }).$type<Periodicidade>().notNull(),
  meta: doublePrecision('valor_meta').notNull(),
  pontos: integer('pontos_recompensa').notNull(),
})

/** Progresso autodeclarado da versão em Java (V1). Sem uso; mantida pelo histórico. */
export const progressosLegados = pgTable('tb_progresso_missao', {
  id: id(),
  usuarioId: ref('id_usuario').notNull(),
  missaoId: ref('id_missao').notNull(),
})

export const tentativasLogin = pgTable('tb_tentativa_login', {
  email: varchar('email', { length: 160 }).primaryKey(),
  falhas: integer('falhas').notNull(),
  ultimaFalha: instante('ultima_falha').notNull(),
})

export const checkins = pgTable('tb_checkin', {
  id: id(),
  usuarioId: ref('id_usuario').notNull(),
  poiId: ref('id_poi').notNull(),
  dia: date('dia', { mode: 'string' }).notNull(),
  momento: instante('momento').notNull(),
  metros: doublePrecision('metros').notNull(),
  eventoId: ref('id_evento'),
})

export const conclusoes = pgTable('tb_conclusao_missao', {
  id: id(),
  usuarioId: ref('id_usuario').notNull(),
  missaoId: ref('id_missao').notNull(),
  periodo: varchar('periodo', { length: 10 }).notNull(),
  momento: instante('momento').notNull(),
})
