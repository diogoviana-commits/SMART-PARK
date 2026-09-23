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
4. `RotaService` calcula distância (fórmula de Haversine) e tempo estimado a pé.
5. `TratadorDeErros` transforma qualquer exceção em uma resposta HTTP com corpo previsível.

## Requisitos atendidos

Rastreabilidade entre os requisitos do relatório e o código que os implementa:

| Requisito | Situação | Onde está |
|---|---|---|
| RF01 – Cadastro de usuário | Atendido (sem e-mail de confirmação) | `UsuarioController.cadastrar` |
| RF02 – Autenticação | Atendido: login com JWT (falta recuperação de senha) | `AutenticacaoService`, `JwtService` |
| RF03 – Mapa interativo | Atendido (dados; o mapa em si é do frontend) | `PontoInteresseController.listar` |
| RF04 – Localização em tempo real | Atendido pelo frontend (GPS do navegador) | — |
| RF05 – Cálculo de rotas | Atendido (linha reta + tempo estimado) | `RotaService` |
| RF06 – Busca e filtros | Atendido | `PontoInteresseRepository.buscar` |
| RF07 – Card do ponto | Atendido | `PoiResponse` |
| RF08 – Agenda de eventos | Atendido | `EventoController` |
| RF09 – Estoque dos quiosques | **Não implementado** | — |
| RF10 – Gamificação (missões) | Atendido | `MissaoController`, `MissaoService` |
| RF11 – Avaliação e feedback | Atendido | `AvaliacaoController` |
| RF12 – Acessibilidade | Parcial: o dado `acessivel` existe; a interface é do frontend | `PontoInteresse.acessivel` |

**RNF03 (segurança de acesso)** está atendido: senhas com BCrypt, dois perfis, autenticação por
token JWT e cada endpoint com sua regra de acesso. Ver a seção "Segurança" abaixo.

## Principais endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/categorias` | Categorias para os filtros do mapa |
| GET | `/api/pois` | Lista pontos; aceita `busca`, `categoria`, `acessivel` |
| GET | `/api/pois/{id}` | Card do ponto, com média de estrelas |
| GET | `/api/pois/proximos` | Pontos próximos a `lat`/`lon` dentro de um `raio` |
| GET | `/api/pois/{id}/rota` | Rota a pé, com distância e tempo |
| POST/PUT/DELETE | `/api/pois` | Manutenção dos pontos (administração) |
| GET/POST | `/api/pois/{id}/avaliacoes` | Avaliações de 1 a 5 estrelas |
| GET | `/api/eventos` | Agenda; sem parâmetros traz os próximos 30 dias |
| POST | `/api/usuarios` | Cadastro |
| POST | `/api/usuarios/login` | Autenticação |
| GET | `/api/missoes` | Missões; com login traz o progresso de quem está autenticado |
| POST | `/api/missoes/{id}/progresso` | Registra avanço na missão |

Todos os erros seguem o mesmo formato:

```json
{ "momento": "2026-09-22T19:45:27", "status": 404, "erro": "Not Found",
  "mensagem": "Ponto de interesse 999 nao encontrado." }
```

## Segurança

A regra geral: **ler o mapa é público, escrever exige login**. Isso vem do próprio relatório, que
descreve o cadastro como opcional para quem só quer se localizar no parque.

### Como autenticar

```bash
# 1. entrar e receber o token
curl -X POST http://localhost:8080/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartpark.uscs","senha":"smartpark2026"}'

# 2. usar o token nas chamadas seguintes
curl http://localhost:8080/api/usuarios \
  -H "Authorization: Bearer <token>"
```

No Swagger UI, o botão **Authorize** guarda o token e o envia automaticamente.

### Quem pode o quê

| Ação | Quem pode |
|---|---|
| Ver mapa, pontos, rotas, eventos, avaliações e catálogo de missões | Qualquer pessoa, sem login |
| Criar conta e entrar | Qualquer pessoa |
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
- **Sem sessão no servidor**: cada requisição se identifica pelo token, o que também torna o CSRF
  inaplicável (não há cookie que o navegador reenvie sozinho), por isso ele fica desligado.

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
2. **Rota pelos caminhos do parque** — hoje é linha reta. Trocar por OSRM ou GraphHopper exige
   mexer só em `RotaService`.
3. **RF09 (estoque dos quiosques)** — não implementado.
4. **Recuperação de senha por e-mail** (parte do RF02).
5. **Refresh token** — hoje, ao expirar (2 h), é preciso fazer login de novo.
