/**
 * Entrada da API na Vercel: uma função só atende todas as rotas /api/*
 * (o vercel.json encaminha /api/qualquer/coisa para cá).
 *
 * Diferente da Render no plano gratuito, a função não "dorme" por 15 minutos: o
 * primeiro pedido depois de um tempo parado só paga a criação da instância, que
 * numa função Node pequena leva frações de segundo.
 */
import { handle } from 'hono/vercel'
import { criarApp } from '../servidor/app.js'
import { lerConfiguracao } from '../servidor/config.js'
import { conectarNeon } from '../servidor/db/conexao.js'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida: configure a conexão do Neon nas variáveis da Vercel.')

const app = criarApp(conectarNeon(url).banco, lerConfiguracao())
const atender = handle(app)

export const GET = atender
export const POST = atender
export const PUT = atender
export const DELETE = atender
export const OPTIONS = atender
