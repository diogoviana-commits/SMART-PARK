# Smart Park — Backend (API REST)

API do mapa interativo do **Parque Espaço Verde Chico Mendes**, em São Caetano do Sul.
Java 17 + Spring Boot 3.3, com H2 em desenvolvimento e MySQL 8 ou PostgreSQL 16 em produção.

Publicada em <https://smartpark-api-kncs.onrender.com>.

## Como rodar

```bash
# desenvolvimento: H2 em memória, não precisa instalar banco nenhum
mvnw spring-boot:run

# produção em MySQL (crie antes o banco com  CREATE DATABASE mapdb;)
mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

A API sobe em <http://localhost:8080>. Na primeira execução o banco é populado com 7 categorias,
33 pontos de interesse, 5 eventos, 6 missões e um usuário administrador.

### Os quatro perfis

| Perfil | Banco | Para quê |
|---|---|---|
| `dev` (padrão) | H2 em memória | Desenvolver sem instalar banco. Console do H2 ligado. |
| `prod` | MySQL 8 | Produção como descrita no relatório do PE. |
| `postgres` | PostgreSQL 16 | A mesma produção onde só há PostgreSQL de graça. |
| `demo` | H2 em memória | Publicar a API sem contratar banco. **Nada persiste.** |

`prod` e `postgres` descrevem o mesmo modelo: as migrações ficam em
`db/migration/mysql/` e `db/migration/postgresql/`, em dialetos diferentes, com os mesmos nomes de
tabela, coluna e constraint. Mudou uma, muda a outra — senão os bancos divergem.

Os três perfis que rodam expostos (`prod`, `postgres`, `demo`) exigem `SMARTPARK_JWT_SECRET` para
subir e só criam o administrador inicial se `SMARTPARK_ADMIN_SENHA` estiver definida. Quem decide
o que conta como "exposto" é `config/Ambientes.java`, em um lugar só.

> **Prazo do banco publicado.** A API no ar usa um PostgreSQL do plano gratuito da Render, que é
> **apagado 30 dias depois de criado — em 23/10/2026**. Não dá para renovar. Quando vencer, a API
> deixa de subir e, como o mapa exige login, **ninguém consegue entrar no site**. Para trocar de banco não é preciso mexer em código: aponte `SPRING_DATASOURCE_URL`,
> `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` para um PostgreSQL novo e vazio, que
> o Flyway cria o esquema e a carga inicial repovoa o parque. Serviços com plano gratuito sem
> prazo: Neon e Supabase.

| Recurso | Endereço |
|---|---|
| Documentação navegável da API | <http://localhost:8080/swagger-ui/index.html> |
| Especificação OpenAPI (JSON) | <http://localhost:8080/v3/api-docs> |
| Console do banco H2 (perfil dev) | <http://localhost:8080/h2-console> — JDBC `jdbc:h2:mem:mapdb`, usuário `sa`, sem senha |

Para rodar os testes: `mvnw test` (71 testes, incluindo 19 de controle de acesso).

> **Usuário de demonstração:** `admin@smartpark.uscs` / `smartpark2026`, **apenas em `dev`**.
> A senha é conhecida de propósito, para a apresentação em aula — e é justamente por estar neste
> repositório que os perfis publicados se recusam a criar essa conta: lá a senha tem que vir de
> `SMARTPARK_ADMIN_SENHA`.

## Arquitetura em camadas

O projeto segue a separação de responsabilidades estudada na disciplina de Arquitetura de
Software: cada camada só conversa com a de baixo, e nenhuma regra de negócio ou SQL vive na
camada de apresentação.

```
  Navegador / App  (frontend React — projeto separado)
         |  HTTP + JSON
  ┌──────▼──────────────────────────────────────────────┐
  │ controller/   recebe a requisição, valida o formato │  ← camada de apresentação
  │               e traduz para/da camada de negócio    │
  ├─────────────────────────────────────────────────────┤
  │ service/      regras de negócio: cálculo de rota,   │  ← camada de negócio
  │               hash de senha, conclusão de missão    │
  ├─────────────────────────────────────────────────────┤
  │ repository/   acesso a dados via Spring Data JPA    │  ← camada de dados
  ├─────────────────────────────────────────────────────┤
  │ model/        entidades mapeadas para as tabelas    │
  └─────────────────────────────────────────────────────┘
                          |
       H2 (dev, demo) / MySQL (prod) / PostgreSQL (postgres)
```

Complementos:

- `dto/` — objetos de entrada e saída da API. Existem para que a entidade não seja exposta
  diretamente: é o que garante, por exemplo, que o hash da senha nunca saia em uma resposta.
- `config/` — documentação OpenAPI e carga inicial de dados.
- `security/` — JWT, filtro de autenticação e regras de acesso.

**Exemplo de uma requisição**, `GET /api/pois/3/rota?lat=-23.63&lon=-46.57`:

1. `PontoInteresseController` recebe, converte os parâmetros e chama o serviço.
2. `PontoInteresseService` busca o ponto; se não existir, lança `RecursoNaoEncontradoException`.
3. `PontoInteresseRepository` consulta o banco.
4. `RotaService` acha o menor caminho pelas trilhas e calçadas do parque (Dijkstra sobre o grafo
   do OpenStreetMap, ver "Rotas pelos caminhos") e estima o tempo a pé.
5. `TratadorDeErros` transforma qualquer exceção em uma resposta HTTP com corpo previsível.

## Requisitos atendidos

Rastreabilidade entre os requisitos do relatório e o código que os implementa:

| Requisito | Situação | Onde está |
|---|---|---|
| RF01 – Cadastro de usuário | Atendido (sem e-mail de confirmação) | `UsuarioController.cadastrar` |
| RF02 – Autenticação | Atendido: login com JWT (falta recuperação de senha) | `AutenticacaoService`, `JwtService` |
| RF03 – Mapa interativo | Atendido (dados; o mapa em si é do frontend) | `PontoInteresseController.listar` |
| RF04 – Localização em tempo real | Atendido pelo frontend (GPS do navegador) | — |
| RF05 – Cálculo de rotas | Atendido: menor caminho pelas trilhas do OSM, com opção sem escadas | `RotaService`, `GrafoDeTrilhas` |
| RF06 – Busca e filtros | Atendido | `PontoInteresseRepository.buscar` |
| RF07 – Card do ponto | Atendido | `PoiResponse` |
| RF08 – Agenda de eventos | Atendido | `EventoController` |
| RF09 – Estoque dos quiosques | **Não implementado** | — |
| RF10 – Gamificação (missões) | Atendido | `MissaoController`, `MissaoService` |
| RF11 – Avaliação e feedback | Atendido | `AvaliacaoController` |
| RF12 – Acessibilidade | Parcial: o dado `acessivel` existe; a interface é do frontend | `PontoInteresse.acessivel` |

**RNF03 (segurança de acesso)** está atendido: o mapa inteiro exige login, senhas com BCrypt e
política contra senhas fracas, sessão JWT em cookie `HttpOnly`, proteção contra CSRF, saída que
invalida o token no servidor, dois perfis e cada endpoint com sua regra de acesso. Ver a seção
"Segurança" abaixo.

## Principais endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Diz se a API está no ar (público) |
| GET | `/api/categorias` | Categorias para os filtros do mapa |
| GET | `/api/pois` | Lista pontos; aceita `busca`, `categoria`, `acessivel` |
| GET | `/api/pois/{id}` | Card do ponto, com média de estrelas |
| GET | `/api/pois/proximos` | Pontos próximos a `lat`/`lon` dentro de um `raio` |
| GET | `/api/pois/{id}/rota` | Rota a pé pelas trilhas; `evitarEscadas=true` desvia das escadas |
| POST/PUT/DELETE | `/api/pois` | Manutenção dos pontos (administração) |
| GET/POST | `/api/pois/{id}/avaliacoes` | Avaliações de 1 a 5 estrelas |
| GET | `/api/eventos` | Agenda; sem parâmetros traz os próximos 30 dias |
| POST | `/api/usuarios` | Cadastro |
| POST | `/api/usuarios/login` | Autenticação: abre a sessão em cookie HttpOnly |
| POST | `/api/usuarios/sair` | Encerra a sessão em todos os aparelhos |
| GET | `/api/missoes` | Missões, com o progresso de quem está autenticado |
| POST | `/api/missoes/{id}/progresso` | Registra avanço na missão |

Todos os erros seguem o mesmo formato:

```json
{ "momento": "2026-09-22T19:45:27", "status": 404, "erro": "Not Found",
  "mensagem": "Ponto de interesse 999 nao encontrado." }
```

## Segurança

A regra geral: **tudo exige login**, menos o necessário para conseguir entrar (`/api/saude`,
cadastro, login e sair). O site também só mostra o mapa depois do login, mas a proteção de verdade
é esta, no servidor: esconder a tela sem bloquear a API não protegeria nada.

### Como autenticar

O navegador recebe a sessão num cookie `HttpOnly` e o envia sozinho. Pela linha de comando:

```bash
# 1. entrar: o token vem no cookie (o cabecalho X-Requested-With e exigido, ver CSRF abaixo)
curl -c sessao.txt -X POST http://localhost:8080/api/usuarios/login \
  -H "Content-Type: application/json" -H "X-Requested-With: SmartPark" \
  -d '{"email":"admin@smartpark.uscs","senha":"smartpark2026"}'

# 2. usar o cookie nas chamadas seguintes
curl -b sessao.txt http://localhost:8080/api/pois
```

O valor do cookie também é aceito no cabeçalho `Authorization: Bearer <token>`, para clientes que
não são navegador. O Swagger UI só existe no perfil `dev`; nos perfis publicados ele fica
desligado, para não entregar o mapa da API a quem a ataca.

### Quem pode o quê

| Ação | Quem pode |
|---|---|
| Criar conta, entrar, sair e consultar `/api/saude` | Qualquer pessoa |
| Ver mapa, pontos, rotas, eventos, avaliações e missões | Visitante autenticado |
| Avaliar um ponto, registrar progresso em missão, ver a própria conta | Visitante autenticado |
| Cadastrar, editar e remover pontos de interesse | Administrador |
| Listar contas e criar outros administradores | Administrador |

Decisões que valem registrar:

- **Quem se cadastra é sempre `VISITANTE`.** O perfil não vem do corpo da requisição; se viesse,
  qualquer pessoa se tornaria administradora no próprio cadastro. Administradores só são criados
  em `POST /api/usuarios/administradores`, por quem já é administrador.
- **O autor de uma avaliação ou de um progresso é sempre o dono do token**, não um `usuarioId`
  enviado pelo cliente — senão daria para agir em nome de outra pessoa.
- **Cada pessoa só lê e apaga a própria conta e as próprias avaliações**; administradores podem
  qualquer uma. Sem isso, bastaria trocar o id na URL.
- **Mensagem única para e-mail inexistente e senha errada.** Dizer qual dos dois falhou revelaria
  quais e-mails estão cadastrados.
- **Login trava após 5 senhas erradas** por 15 minutos (`smartpark.login.*`).
- **Senhas com BCrypt custo 12** — propositalmente lento, o que encarece a quebra por força bruta.
- **Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Strict` e prefixo `__Host-`.** No
  localStorage, qualquer script da página leria o token: uma falha de XSS entregaria a conta. O
  cookie o JavaScript não lê. O token não aparece no corpo da resposta do login.
- **Proteção contra CSRF em duas camadas.** O `SameSite=Strict` impede o navegador de mandar o
  cookie em requisições vindas de outro site; além disso, toda requisição que altera algo precisa
  do cabeçalho `X-Requested-With: SmartPark`, que um formulário de outro site não consegue enviar
  (`ProtecaoCsrf`).
- **Sair vale no servidor.** Cada token leva a versão da conta (`versao_token`); sair incrementa a
  versão e todo token anterior para de funcionar na hora, em todos os aparelhos — inclusive uma
  cópia roubada.
- **Política de senha (NIST SP 800-63B):** mínimo de 8 caracteres, máximo de 72 bytes (o limite do
  BCrypt, que ignoraria o resto em silêncio), bloqueio das senhas mais comuns e de senhas que
  contenham o nome ou o e-mail.
- **Limites de tamanho** em todos os campos de texto, iguais às colunas do banco: nada estoura como
  erro 500.
- **Cabeçalhos de segurança:** Content-Security-Policy (só scripts do próprio site), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (só o site pede localização) e
  bloqueio de iframe. Os mesmos valem no site da Vercel (`frontend/vercel.json`).
- **Mesma origem.** O site chama `/api` no próprio domínio e a Vercel encaminha para a Render. O
  CORS fica restrito e sem credenciais: outro domínio não consegue usar a sessão de ninguém.

### Segredo do token

O JWT é assinado com HMAC-SHA256. Em produção, defina a variável de ambiente:

```bash
set SMARTPARK_JWT_SECRET=algum-segredo-longo-de-no-minimo-32-caracteres
```

Se o perfil `prod` subir sem ela, a aplicação **se recusa a iniciar** — com o segredo de
desenvolvimento, que está neste repositório, qualquer pessoa forjaria um token de administrador.

## Modelo de dados

Sete tabelas, equivalentes ao modelo físico da Figura 22 do relatório:

`tb_categoria_poi` · `tb_ponto_interesse` · `tb_evento` · `tb_usuario` · `tb_avaliacao` ·
`tb_missao` · `tb_progresso_missao`

Duas decisões que diferem do documento, e o porquê:

- **Latitude e longitude como números**, em vez do tipo espacial `POINT` com PostGIS. O Leaflet
  consome lat/lon diretamente, e assim o mesmo código roda igual em H2, MySQL e PostgreSQL, sem
  depender de extensão espacial. Se um dia houver consulta geográfica pesada (área, interseção),
  vale migrar para PostGIS.
- **Perfil como enum** dentro de `tb_usuario`, em vez de tabela própria. É o que o modelo físico
  do relatório mostra (campo `tipo_perfil`), e são apenas dois valores fixos.

## De onde vêm os 33 pontos

Todas as coordenadas são as do OpenStreetMap para a relação 6746910 (`Espaço Verde Chico Mendes`),
consultadas pela Overpass API e conferidas contra o polígono do parque: os dois banheiros (um com
cabine adaptada), os quatro bebedouros, as sete quadras, os quatro playgrounds, os três quiosques
cobertos, as duas academias ao ar livre, os portões com seus horários (`Mo-Su 06:00-22:00`), o
bicicletário de 30 vagas, o posto da Guarda Civil e os dois estabelecimentos da calçada. Não são
estimativas nossas: são objetos que colaboradores do OSM levantaram em campo.

Ficaram de fora os 74 bancos, as 12 lixeiras e as árvores — mobiliário, não destino de navegação —
e tudo que caiu fora do polígono (a Prefeitura, o complexo de piscinas vizinho, a sede da GCM).

Ainda **não** vêm de levantamento: a agenda de eventos e o `status_operacional` de cada ponto.
Não existe fonte pública desses dois; são conteúdo de exemplo, e quem administra o parque atualiza
o status pela API.

## Pendências

1. **Conferência em campo** — as coordenadas são de levantamento do OSM, não nossas. Uma visita
   confirmaria o que mudou desde o último mapeamento e preencheria o que ninguém mapeou ainda
   (horário das lanchonetes, acessibilidade dos bebedouros).
2. **RF09 (estoque dos quiosques)** — não implementado.
3. **Recuperação de senha e confirmação de e-mail** (parte do RF02). Sem envio de e-mail, o
   cadastro ainda responde "e-mail já cadastrado", o que permite descobrir se um e-mail tem conta.
4. **Refresh token** — hoje, ao expirar (2 h), é preciso fazer login de novo.
5. **Limite de tentativas por IP.** O bloqueio atual é por conta (5 senhas erradas travam aquele
   e-mail). Quem testa uma senha em muitos e-mails diferentes não é barrado; isso pede um limite
   por IP, que só é confiável atrás de um proxy que informe o IP real.

## Rotas pelos caminhos

A rota segue as trilhas, calçadas, escadas e ruas mapeadas no OpenStreetMap em volta do parque, e
não a linha reta. O grafo fica em `src/main/resources/trilhas/chico-mendes.json` (cerca de 4.200
pontos e 4.700 trechos) e o `GrafoDeTrilhas` calcula o menor caminho com Dijkstra, preferindo as
trilhas do parque às calçadas das avenidas. Com `evitarEscadas=true` a rota desvia das escadas.

O arquivo é versionado para a API não depender de um serviço externo para subir. Para atualizar
depois que o mapa do OSM mudar:

```bash
python scripts/gerar-trilhas.py
```
