/**
 * API para desenvolvimento, em http://localhost:8787.
 *
 * Sem DATABASE_URL, usa um PostgreSQL embutido (PGlite) gravado em .dados-locais/,
 * já migrado e com a carga inicial: não é preciso instalar banco nenhum. O Vite
 * (npm run dev) encaminha /api para cá.
 *
 * Conta de administração local: admin@smartpark.uscs, com a senha de
 * SMARTPARK_ADMIN_SENHA ou, se ela não estiver definida, "parque-local-2026".
 */
import { serve } from '@hono/node-server'
import { criarApp } from '../servidor/app.js'
import { lerConfiguracao } from '../servidor/config.js'
import { carregarDadosIniciais } from '../servidor/db/carga.js'
import { conectarNeon, conectarPglite } from '../servidor/db/conexao.js'
import { lerMigracoes, migrar } from '../servidor/db/migracoes.js'

const PORTA = Number(process.env.PORTA_API ?? 8787)

const conexao = process.env.DATABASE_URL
  ? conectarNeon(process.env.DATABASE_URL)
  : await conectarPglite(process.env.PASTA_BANCO_LOCAL ?? '.dados-locais')

if (!process.env.DATABASE_URL) {
  const aplicadas = await migrar(conexao.sql, lerMigracoes('db/migracoes'))
  if (aplicadas.length) console.log(`Migrações aplicadas: V${aplicadas.join(', V')}`)
  const carga = await carregarDadosIniciais(conexao.banco, process.env.SMARTPARK_ADMIN_SENHA ?? 'parque-local-2026')
  if (carga.carregou) console.log('Carga inicial do parque concluída.')
}

// Em http://localhost o cookie Secure funciona no Chrome, mas não em todo navegador.
const config = lerConfiguracao({ ...process.env, SMARTPARK_COOKIE_SEGURO: process.env.SMARTPARK_COOKIE_SEGURO ?? 'false' })
serve({ fetch: criarApp(conexao.banco, config).fetch, port: PORTA })
console.log(`API do Smart Park em http://localhost:${PORTA}/api`)
