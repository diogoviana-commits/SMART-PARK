/**
 * Aplica as migrações e a carga inicial no banco de DATABASE_URL (o Neon de produção).
 *
 *   DATABASE_URL="postgresql://..." npm run migrar
 *
 * Use a conexão sem pooling do Neon (o endereço sem "-pooler"). Faça um backup
 * antes: o fluxo "Backup do banco" do GitHub pode ser disparado na mão.
 *
 * Com SMARTPARK_ADMIN_SENHA definida, cria a conta admin@smartpark.uscs se ela
 * ainda não existir.
 */
import { carregarDadosIniciais, EMAIL_ADMINISTRADOR } from '../servidor/db/carga.js'
import { conectarNeon } from '../servidor/db/conexao.js'
import { lerMigracoes, migrar } from '../servidor/db/migracoes.js'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Defina DATABASE_URL com o endereço do banco.')
  process.exit(1)
}

const conexao = conectarNeon(url)
try {
  const aplicadas = await migrar(conexao.sql, lerMigracoes('db/migracoes'))
  console.log(aplicadas.length ? `Migrações aplicadas: V${aplicadas.join(', V')}` : 'Banco já estava atualizado.')
  const carga = await carregarDadosIniciais(conexao.banco, process.env.SMARTPARK_ADMIN_SENHA)
  console.log(carga.carregou ? 'Carga inicial do parque concluída.' : 'O banco já tinha os pontos do parque.')
  if (carga.administrador === 'criado') console.log(`Conta de administração criada: ${EMAIL_ADMINISTRADOR}`)
} finally {
  await conexao.fechar()
}
