/**
 * Avaliação dos pontos de 1 a 5 estrelas, com comentário (RF10 da Especificação).
 *
 * - Ler é aberto; avaliar exige login.
 * - Uma avaliação por pessoa por ponto: avaliar de novo substitui a anterior.
 * - O autor é sempre o dono da sessão, nunca um id enviado pela tela.
 * - Cada pessoa só apaga a própria avaliação; administradores, qualquer uma.
 * - Só o primeiro nome do autor aparece, porque a lista é pública.
 */
import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Ambiente } from '../contexto.js'
import { corpoJson, exigirLogin, idDaRota } from '../contexto.js'
import { avaliacoes, usuarios } from '../db/esquema.js'
import { ErroHttp } from '../erros.js'
import { noParque, paraIso } from '../tempo.js'
import { buscarPonto } from './pontos.js'

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || 'Visitante'

const esquemaAvaliacao = z.object({
  nota: z.number().int('deve ser um número inteiro').min(1, 'deve ser de 1 a 5').max(5, 'deve ser de 1 a 5'),
  comentario: z.string().trim().max(600, 'pode ter no máximo 600 caracteres').nullish(),
})

export const rotasAvaliacoes = new Hono<Ambiente>()
  .get('/', async (c) => {
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await buscarPonto(banco, poiId)
    const linhas = await banco
      .select({ a: avaliacoes, nome: usuarios.nome })
      .from(avaliacoes)
      .innerJoin(usuarios, eq(avaliacoes.usuarioId, usuarios.id))
      .where(eq(avaliacoes.poiId, poiId))
      .orderBy(desc(avaliacoes.dataAvaliacao))
    return c.json(
      linhas.map(({ a, nome }) => ({
        id: a.id,
        poiId: a.poiId,
        usuarioId: a.usuarioId,
        usuarioNome: primeiroNome(nome),
        nota: a.nota,
        comentario: a.comentario,
        dataAvaliacao: paraIso(a.dataAvaliacao),
      })),
    )
  })

  .post('/', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    await buscarPonto(banco, poiId)
    const dados = esquemaAvaliacao.parse(await corpoJson(c))
    const valores = { nota: dados.nota, comentario: dados.comentario || null, dataAvaliacao: noParque() }

    const [existente] = await banco
      .select({ id: avaliacoes.id })
      .from(avaliacoes)
      .where(and(eq(avaliacoes.usuarioId, usuario.id), eq(avaliacoes.poiId, poiId)))

    const [salva] = existente
      ? await banco.update(avaliacoes).set(valores).where(eq(avaliacoes.id, existente.id)).returning()
      : await banco.insert(avaliacoes).values({ ...valores, usuarioId: usuario.id, poiId }).returning()

    return c.json(
      {
        id: salva.id,
        poiId,
        usuarioId: usuario.id,
        usuarioNome: primeiroNome(usuario.nome),
        nota: salva.nota,
        comentario: salva.comentario,
        dataAvaliacao: paraIso(salva.dataAvaliacao),
      },
      existente ? 200 : 201,
    )
  })

  .delete('/:id{[0-9]+}', async (c) => {
    const usuario = exigirLogin(c)
    const banco = c.get('banco')
    const poiId = idDaRota(c, 'poiId')
    const id = idDaRota(c)
    const [avaliacao] = await banco
      .select()
      .from(avaliacoes)
      .where(and(eq(avaliacoes.id, id), eq(avaliacoes.poiId, poiId)))
    if (!avaliacao) throw new ErroHttp(404, `Avaliação ${id} não encontrada.`)
    // Sem a checagem de dono, qualquer pessoa logada apagaria a avaliação de outra trocando o id na URL.
    if (avaliacao.usuarioId !== usuario.id && usuario.perfil !== 'ADMINISTRADOR') {
      throw new ErroHttp(403, 'Você só pode remover a sua própria avaliação.')
    }
    await banco.delete(avaliacoes).where(eq(avaliacoes.id, id))
    return c.body(null, 204)
  })
