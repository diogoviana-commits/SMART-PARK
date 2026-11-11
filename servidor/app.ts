/**
 * A API do Smart Park: um app Hono, montado com o banco e a configuração que
 * cada ambiente fornece (Vercel, desenvolvimento local ou testes).
 */
import { Hono } from 'hono'
import type { Configuracao } from './config.js'
import type { Ambiente } from './contexto.js'
import { autenticar, protecaoCsrf } from './contexto.js'
import type { Banco } from './db/conexao.js'
import { corpoDeErro, tratarErro } from './erros.js'
import { rotasAvaliacoes } from './rotas/avaliacoes.js'
import { rotasEventos } from './rotas/eventos.js'
import { rotasMissoes, rotasVisitas } from './rotas/missoes.js'
import { rotasCategorias, rotasPontos } from './rotas/pontos.js'
import { rotasUsuarios } from './rotas/usuarios.js'

export function criarApp(banco: Banco, config: Configuracao) {
  const app = new Hono<Ambiente>().basePath('/api')

  app.use('*', async (c, next) => {
    c.set('banco', banco)
    c.set('config', config)
    // Respostas da API dependem de quem está logado: nenhum cache intermediário guarda.
    c.header('Cache-Control', 'no-store')
    await next()
  })
  app.use('*', protecaoCsrf)
  app.use('*', autenticar)

  app.get('/saude', (c) => c.json({ status: 'ok' }))
  app.route('/categorias', rotasCategorias)
  app.route('/pois', rotasPontos)
  app.route('/pois/:poiId{[0-9]+}/avaliacoes', rotasAvaliacoes)
  app.route('/eventos', rotasEventos)
  app.route('/usuarios', rotasUsuarios)
  app.route('/missoes', rotasMissoes)
  app.route('/visitas', rotasVisitas)

  app.notFound((c) => c.json(corpoDeErro(404, 'Rota não encontrada.'), 404))
  app.onError(tratarErro)
  return app
}
