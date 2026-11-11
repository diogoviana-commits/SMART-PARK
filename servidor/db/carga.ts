/**
 * Carga inicial: num banco sem pontos, cadastra categorias, os 33 pontos, a
 * agenda de exemplo e as missões. Num banco que já tem pontos, não faz nada.
 */
import { eq, sql } from 'drizzle-orm'
import type { Banco } from './conexao.js'
import { categorias, eventos, missoes, pontos, usuarios } from './esquema.js'
import { CATEGORIAS, EVENTOS, MISSOES, PONTOS } from './dados-iniciais.js'
import { hojeNoParque, noParque, somarDias } from '../tempo.js'
import { gerarHash } from '../seguranca/senha.js'

export interface ResultadoCarga {
  carregou: boolean
  administrador: 'criado' | 'nao-criado' | 'ja-existia'
}

/**
 * @param senhaAdministrador cria a conta admin@smartpark.uscs com esta senha; sem
 *        ela, nenhum administrador é criado (o repositório é público, e uma senha
 *        padrão versionada entregaria a administração a qualquer pessoa)
 */
export async function carregarDadosIniciais(banco: Banco, senhaAdministrador?: string): Promise<ResultadoCarga> {
  const [{ total }] = await banco.select({ total: sql<number>`count(*)::int` }).from(pontos)
  const administrador = await criarAdministrador(banco, senhaAdministrador)
  if (total > 0) return { carregou: false, administrador }

  const porSlug = new Map<string, number>()
  for (const c of CATEGORIAS) {
    const [linha] = await banco
      .insert(categorias)
      .values({ slug: c.slug, nome: c.nome, icone: c.slug, cor: c.cor })
      .returning({ id: categorias.id })
    porSlug.set(c.slug, linha.id)
  }

  const porNome = new Map<string, number>()
  for (const p of PONTOS) {
    const [linha] = await banco
      .insert(pontos)
      .values({
        nome: p.nome,
        descricao: p.descricao,
        categoriaId: porSlug.get(p.categoria)!,
        latitude: p.latitude,
        longitude: p.longitude,
        horarioAbertura: p.abertura,
        horarioFechamento: p.fechamento,
        statusOperacional: p.status ?? 'EM_FUNCIONAMENTO',
        acessivel: p.acessivel,
      })
      .returning({ id: pontos.id })
    porNome.set(p.nome, linha.id)
  }

  const hoje = hojeNoParque()
  for (const e of EVENTOS) {
    const dia = somarDias(hoje, e.emDias)
    await banco.insert(eventos).values({
      nome: e.nome,
      descricao: e.descricao,
      inicio: `${dia} ${e.inicio}:00`,
      fim: `${dia} ${e.fim}:00`,
      poiId: porNome.get(e.local)!,
    })
  }

  for (const m of MISSOES) {
    await banco.insert(missoes).values({
      nome: m.nome,
      descricao: m.descricao,
      tipo: m.tipo,
      periodicidade: m.periodicidade,
      meta: m.meta,
      pontos: m.pontos,
    })
  }

  return { carregou: true, administrador }
}

export const EMAIL_ADMINISTRADOR = 'admin@smartpark.uscs'

async function criarAdministrador(banco: Banco, senha?: string): Promise<ResultadoCarga['administrador']> {
  const existente = await banco.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, EMAIL_ADMINISTRADOR))
  if (existente.length > 0) return 'ja-existia'
  if (!senha) return 'nao-criado'
  await banco.insert(usuarios).values({
    nome: 'Administração do Parque',
    email: EMAIL_ADMINISTRADOR,
    senhaHash: await gerarHash(senha),
    perfil: 'ADMINISTRADOR',
    dataCadastro: noParque(),
  })
  return 'criado'
}
