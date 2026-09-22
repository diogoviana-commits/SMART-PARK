# Briefing — Banco de Dados do Smart Park

Para quem vai assumir a parte de banco de dados do projeto.

## 1. O que já existe (leia antes de escrever qualquer SQL)

A API em `mapbackend/` já cria o banco sozinha. As entidades Java (`model/`) são mapeadas pelo
Hibernate, que gera as tabelas na primeira execução:

- **Perfil `dev`** → H2 em memória, recriado a cada execução (`ddl-auto=create-drop`).
- **Perfil `prod`** → MySQL 8, banco `mapdb` (`ddl-auto=update`).

São **7 tabelas**, já rodando e populadas com 16 pontos, 5 eventos, 6 missões e 1 administrador.

**O ponto mais importante deste documento:** como o Hibernate gera o esquema a partir do código
Java, um SQL escrito à mão que divirja das entidades quebra a aplicação. Por isso o trabalho não é
"criar o banco do zero" — é **oficializar, versionar e otimizar** o esquema que já existe.

## 2. O esquema atual

### Tabelas e relacionamentos

```
tb_categoria_poi 1 ──< tb_ponto_interesse 1 ──< tb_avaliacao >── 1 tb_usuario
                                          │
                                          └──< tb_evento (id_poi_local, opcional)

tb_missao 1 ──< tb_progresso_missao >── 1 tb_usuario
```

### Colunas

| Tabela | Colunas |
|---|---|
| `tb_categoria_poi` | `id` bigint PK · `slug` varchar(40) **UK** · `nome` varchar(80) · `icone` varchar(40) · `cor` varchar(7) |
| `tb_ponto_interesse` | `id` PK · `nome` varchar(120) · `descricao` varchar(600) · `id_categoria` **FK** · `latitude` double · `longitude` double · `horario_abertura` time · `horario_fechamento` time · `status_operacional` enum · `acessivel` bit · `foto_url` varchar(400) |
| `tb_evento` | `id` PK · `nome` varchar(150) · `descricao` varchar(800) · `data_hora_inicio` datetime · `data_hora_fim` datetime · `local_descritivo` varchar(200) · `id_poi_local` **FK** (aceita null) · `link_mais_info` varchar(400) |
| `tb_usuario` | `id` PK · `nome` varchar(120) · `email` varchar(160) **UK** · `senha_hash` varchar(100) · `tipo_perfil` enum · `data_cadastro` datetime · `ultimo_acesso` datetime |
| `tb_avaliacao` | `id` PK · `id_usuario` **FK** · `id_poi` **FK** · `nota` int · `comentario` varchar(600) · `data_avaliacao` datetime · **UK (id_usuario, id_poi)** |
| `tb_missao` | `id` PK · `nome` varchar(120) · `descricao` varchar(400) · `tipo_meta` enum · `periodicidade` enum · `valor_meta` double · `pontos_recompensa` int |
| `tb_progresso_missao` | `id` PK · `id_usuario` **FK** · `id_missao` **FK** · `progresso_atual` double · `concluida` bit · `data_conclusao` datetime · **UK (id_usuario, id_missao)** |

### Enums (gravados como texto, não como número)

| Coluna | Valores |
|---|---|
| `tb_ponto_interesse.status_operacional` | `EM_FUNCIONAMENTO`, `EM_MANUTENCAO`, `FECHADO` |
| `tb_usuario.tipo_perfil` | `VISITANTE`, `ADMINISTRADOR` |
| `tb_missao.tipo_meta` | `DISTANCIA`, `CHECKIN`, `EVENTO` |
| `tb_missao.periodicidade` | `DIARIA`, `SEMANAL` |

Para ver o DDL exato a qualquer momento, com o MySQL rodando:

```sql
USE mapdb;
SHOW CREATE TABLE tb_ponto_interesse;
```

## 3. Regras que o código depende — não mude sem avisar

1. **Nomes de tabelas e colunas.** Estão fixados por anotações `@Table` e `@Column` nas entidades.
   Renomear no banco sem renomear no Java quebra a aplicação.
2. **As duas chaves únicas compostas** (`id_usuario, id_poi` em avaliação e `id_usuario, id_missao`
   em progresso). São regra de negócio: uma avaliação por pessoa em cada ponto, uma linha de
   progresso por pessoa em cada missão.
3. **`senha_hash` guarda hash BCrypt**, nunca a senha. São sempre 60 caracteres começando com `$2a$`.
   Se aparecer senha legível nessa coluna, é bug — avise.
4. **Enums como texto.** Se mudar para número, o Java para de ler.
5. **`latitude` e `longitude` são `double`**, não tipo espacial. Foi decisão consciente: o Leaflet
   consome graus decimais e assim o mesmo código roda em H2 e MySQL. Migrar para PostGIS é possível,
   mas é uma decisão do grupo, não um detalhe de implementação.

## 4. Tarefas sugeridas, em ordem de valor

### Tarefa 1 — Script oficial do modelo físico *(mais importante)*

Produzir `docs/modelo-fisico.sql`: o `CREATE DATABASE` + os 7 `CREATE TABLE` com chaves, FKs e
comentários explicando cada tabela. Serve para três coisas: entra no relatório como modelo físico,
permite criar o banco sem depender do Hibernate, e documenta o que existe.

Ponto de partida: `SHOW CREATE TABLE` de cada tabela. O trabalho é **limpar e comentar** — os nomes
automáticos de constraint (`UKrqgxnpqi1e...`) devem virar nomes legíveis (`uk_categoria_slug`).

**Como saber se ficou certo** — este é o teste definitivo:

1. Apague o banco: `DROP DATABASE mapdb;`
2. Rode o script dele.
3. Suba a API com validação estrita:
   ```bash
   mvnw spring-boot:run -Dspring-boot.run.profiles=prod ^
     -Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate
   ```

Com `validate`, o Hibernate compara o banco com as entidades e **se recusa a subir** apontando a
diferença exata. Se a aplicação iniciar, o script está fiel ao código.

### Tarefa 2 — Índices, com justificativa

Hoje só existem os índices automáticos (PK, UK e FK). Vale analisar e propor índices para as
consultas que a aplicação realmente faz:

| Consulta da aplicação | Índice candidato |
|---|---|
| Busca de ponto por nome/descrição (`PontoInteresseRepository.buscar`) | `tb_ponto_interesse(nome)` |
| Filtro por acessibilidade | `tb_ponto_interesse(acessivel)` |
| Agenda por período (`EventoRepository.buscarNoPeriodo`) | `tb_evento(data_hora_inicio)` |
| Avaliações de um ponto | já coberto pela FK |

Peça que ele meça com `EXPLAIN` antes e depois, e escreva uma frase por índice dizendo por que
compensa. Índice sem justificativa é peso morto: acelera leitura, atrasa escrita.

### Tarefa 3 — Versionamento com Flyway *(o pulo do gato)*

Hoje o esquema muda sozinho com `ddl-auto=update`, que é cômodo mas perigoso: ele nunca apaga nem
altera coluna, e ninguém sabe o que mudou entre duas versões. Trocar por **Flyway** significa:

- `src/main/resources/db/migration/V1__esquema_inicial.sql`, `V2__indices.sql`, e assim por diante;
- `ddl-auto=validate` no lugar de `update`;
- histórico de todas as mudanças de banco versionado no Git, junto com o código.

É a tarefa mais "profissional" da lista e rende bastante no relatório. Uma dependência no `pom.xml`
e os scripts.

### Tarefa 4 — Dados reais do parque

A carga inicial (`config/CargaInicial.java`) usa **coordenadas aproximadas**: o centro do parque é
real (vem do OpenStreetMap), mas a posição de cada banheiro, quadra e lanchonete é um deslocamento
estimado em volta desse centro. O trabalho é ir ao parque, anotar as coordenadas reais pelo GPS do
celular e entregar um `INSERT` com os dados corretos, incluindo horários de funcionamento.

Isso é o que mais melhora o produto de verdade.

### Tarefa 5 — Consultas para o painel do administrador (UC09)

O relatório prevê "Ver Relatórios" para o administrador, e ainda não existe nada disso. São
consultas SQL que depois viram endpoints:

- pontos mais bem avaliados e mais avaliados;
- quantidade de eventos por mês;
- usuários ativos (com acesso nos últimos 30 dias);
- missões mais concluídas.

Ele pode entregar como `VIEW` ou como as queries prontas, e o backend expõe.

### Tarefa 6 — Segurança e operação do banco

- Criar um usuário MySQL da aplicação (ex.: `smartpark_app`) com permissão só no banco `mapdb`, em
  vez de usar `root` sem senha como hoje.
- Definir a rotina de backup (`mysqldump`) e testar a restauração — backup não testado não é backup.

## 5. Como ele roda o projeto

```bash
# 1. MySQL precisa estar no ar
# 2. criar o banco
mysql -u root -e "CREATE DATABASE mapdb CHARACTER SET utf8mb4;"

# 3. subir a API contra o MySQL
cd mapbackend
set SMARTPARK_JWT_SECRET=um-segredo-qualquer-com-mais-de-32-caracteres
mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

Para inspecionar sem MySQL, o perfil `dev` sobe com H2 e o console fica em
<http://localhost:8080/h2-console> (JDBC `jdbc:h2:mem:mapdb`, usuário `sa`, sem senha).

## 6. O que ele NÃO deve fazer

- Escrever `CREATE TABLE` com nomes diferentes dos atuais e mandar o pessoal do backend "adaptar".
- Apagar ou renomear coluna sem avisar quem mexe no Java.
- Colocar regra de negócio em *trigger* ou *procedure*. A regra fica na camada `service/`, como
  manda a arquitetura em camadas que o projeto segue — regra escondida no banco é a primeira coisa
  que some quando alguém troca o SGBD, e não aparece em nenhum teste.
- Guardar senha em texto puro, em qualquer hipótese.

## 7. Entregáveis

1. `docs/modelo-fisico.sql` comentado, validado com `ddl-auto=validate`.
2. Lista de índices com `EXPLAIN` antes/depois.
3. (Opcional, mas recomendado) migrations Flyway.
4. `INSERT` com os dados reais dos pontos do parque.
5. Diagrama ER atualizado com as 7 tabelas, para substituir a Figura 21 do relatório — a atual
   ainda mostra `LOCALIZACAO_GEO` e `PERFIL` como tabela, que não é o que foi implementado.
