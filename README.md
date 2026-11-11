# Smart Park — Mapa Interativo Turístico

Projeto de Extensão (PE) do curso de Análise e Desenvolvimento de Sistemas da **USCS**.

O Smart Park é um mapa digital do **Espaço Verde Chico Mendes**, em São Caetano do Sul (SP). Ele
ajuda o visitante a encontrar banheiros, quadras, bebedouros e lanchonetes, traçar a rota a pé até o
ponto escolhido, acompanhar a agenda de eventos e avaliar os pontos do parque.

A proposta nasceu de uma pesquisa de campo com **68 frequentadores** do parque (Apêndice C do
relatório do PE), em que a agenda de eventos (89,7%), a localização de estruturas como banheiros e
lanchonetes (76,5%) e os horários de funcionamento (75%) apareceram como as informações mais desejadas.

## Equipe

Diogo Leite Viana · Gabriel Vinicius Ballacchino Leandro · Ryan Morgado Goulart

## Como o sistema é feito

Um projeto só na Vercel: o site e a API ficam no mesmo endereço.

| Camada | Escolha |
|---|---|
| Site | React 18 + Vite, mapa com Leaflet e OpenStreetMap |
| API | TypeScript, Hono, como função da Vercel (região São Paulo) |
| Banco | PostgreSQL no Neon, acessado com Drizzle ORM |
| Rota a pé | Calculada no próprio aparelho (Dijkstra sobre os caminhos do OpenStreetMap) |
| Testes | Vitest + PGlite (PostgreSQL embutido), no GitHub Actions a cada push |

```
SMART-PARK/
├── api/            entrada da API na Vercel (uma função atende todas as rotas /api/*)
├── servidor/       API: rotas, segurança, banco (esquema, migrações, carga inicial)
├── compartilhado/  código usado pelo site e pela API: distância e grafo de trilhas
├── src/            site (React)
├── public/dados/   rede de caminhos do parque (trilhas.json)
├── db/migracoes/   migrações SQL do banco (V1 em diante)
├── scripts/        servidor local, migração do banco, geração das trilhas
└── testes/         testes automatizados
```

### Por que a API saiu do Java

A primeira versão da API era Java 17 + Spring Boot, publicada na Render. No plano gratuito, a Render
desliga o serviço depois de 15 minutos sem acesso, e o primeiro acesso seguinte esperava o Java
iniciar do zero: de dezenas de segundos a mais de um minuto. A API foi reescrita em TypeScript como
função da Vercel, que não hiberna desse jeito. As regras de negócio e de segurança foram portadas uma
a uma, e o banco continua o mesmo, sem perda de dados. O código Java está no histórico do Git.

## Como rodar

Precisa de Node.js 22 ou mais novo.

```bash
npm install
npm run dev
```

O site sobe em <http://localhost:5173> e a API em <http://localhost:8787/api>. Não é preciso
instalar banco: sem `DATABASE_URL`, a API usa um PostgreSQL embutido gravado em `.dados-locais/`, já
com o parque carregado. Conta de administração local: `admin@smartpark.uscs` / `parque-local-2026`.

```bash
npm test          # testes automatizados
npm run tipos     # conferência de tipos (TypeScript)
npm run build     # gera o site em dist/
```

> No Windows, rode os testes com o caminho do projeto começando por `C:` maiúsculo (o PowerShell
> faz isso). Com `c:` minúsculo, o Vitest carrega duas cópias de si mesmo e falha antes de começar.

### Publicar

1. Variáveis na Vercel (Settings → Environment Variables), descritas em `.env.example`:
   `DATABASE_URL`, `SMARTPARK_JWT_SECRET` e, se quiser criar a administração, `SMARTPARK_ADMIN_SENHA`.
2. Banco: `DATABASE_URL="..." npm run migrar`. Faça antes um backup pelo fluxo "Backup do banco".
3. O push na `main` publica.

## O que o sistema faz

O mapa é aberto: consultar o parque não exige conta. A conta é pedida para avaliar e para as missões.

| Recurso | Requisito |
|---|---|
| Cadastro e login por e-mail e senha | RF01, RF02 (parciais: sem confirmação de e-mail nem recuperação de senha) |
| Mapa com os 33 pontos, cada categoria com cor e desenho | RF03 |
| Posição do visitante pelo GPS | RF04 |
| Rota a pé pelos caminhos, com distância e tempo; opção sem escadas; recálculo ao sair do caminho | RF05 |
| Busca e filtros por categoria e acessibilidade | RF06 |
| Card do ponto com situação, horário, acessibilidade e nota | RF07 (parcial: sem foto) |
| Agenda dos próximos 30 dias | RF08 |
| Missões com progresso verificado no servidor (API pronta; tela na próxima etapa) | RF09 (parcial) |
| Avaliação de 1 a 5 estrelas com comentário | RF10 (parcial: sem reportar problema) |
| Fonte ampliada, rota sem escadas, foco visível | RF11 (parcial) |
| Cadastro e edição de pontos e eventos pela administração (pela API) | RF12 (parcial: sem tela) |

Numeração dos requisitos conforme a Especificação de Requisitos de Software 2026.

### Os 33 pontos

As coordenadas são as do OpenStreetMap para o polígono do parque, consultadas pela Overpass API:
2 banheiros (um com cabine adaptada), 4 bebedouros, 7 quadras, 2 academias ao ar livre, 3
playgrounds, 3 quiosques cobertos, 2 lagos, a Praça da Água, 3 portões, 2 pontos de ônibus, 2
estabelecimentos de alimentação, o bicicletário e o posto da Guarda Civil Municipal. A agenda de
eventos e a situação de cada ponto são conteúdo de exemplo: não existe fonte pública delas, e a
administração do parque as atualiza pela API.

## API

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/saude` | aberto |
| GET | `/api/categorias` | aberto |
| GET | `/api/pois` (`busca`, `categoria`, `acessivel`) | aberto |
| GET | `/api/pois/proximos` (`lat`, `lon`, `raio`) | aberto |
| GET | `/api/pois/{id}` | aberto |
| POST/PUT/DELETE | `/api/pois`, `/api/pois/{id}` | administração |
| GET | `/api/pois/{id}/avaliacoes` | aberto |
| POST | `/api/pois/{id}/avaliacoes` | conta |
| DELETE | `/api/pois/{id}/avaliacoes/{id}` | dono ou administração |
| GET | `/api/eventos` (`de`, `ate`, `todos`), `/api/eventos/{id}` | aberto |
| POST/PUT/DELETE | `/api/eventos`, `/api/eventos/{id}` | administração |
| POST | `/api/usuarios` (cadastro), `/api/usuarios/login`, `/api/usuarios/sair` | aberto |
| GET | `/api/usuarios/eu` | conta |
| GET/DELETE | `/api/usuarios/{id}` | a própria conta ou administração |
| GET, POST | `/api/usuarios`, `/api/usuarios/administradores` | administração |
| GET | `/api/missoes` (`periodicidade`) | aberto (com progresso, se logado) |
| GET | `/api/missoes/pontos` | conta |
| POST | `/api/visitas` (`poiId`, `latitude`, `longitude`) | conta |

Todo erro tem o mesmo formato: `{ "momento", "status", "erro", "mensagem" }`.

## Segurança

- Senhas com BCrypt custo 12 e política do NIST SP 800-63B: mínimo de 8 caracteres, máximo de 72 bytes,
  bloqueio das senhas mais comuns e das que contêm o nome ou o e-mail.
- Sessão em JWT dentro de cookie `__Host-`, `HttpOnly`, `Secure` e `SameSite=Strict`; o token não aparece
  no corpo das respostas. Sair invalida o token no servidor, em todos os aparelhos.
- Login trava por 15 minutos depois de 5 senhas erradas. A contagem fica no banco, porque uma função
  serverless não guarda memória entre chamadas.
- Mesma mensagem para e-mail inexistente e senha errada, com o mesmo tempo de resposta.
- Proteção contra CSRF: toda requisição que altera algo exige o cabeçalho `X-Requested-With: SmartPark`.
- Quem se cadastra é sempre visitante; o autor de uma avaliação ou visita é sempre o dono da sessão.
- Missões não aceitam progresso informado pelo aparelho: contam visitas a até 30 m de um ponto, uma por
  ponto por dia, com a caminhada limitada ao que dá para andar no tempo entre duas visitas.
- Em produção, a API se recusa a subir sem um segredo próprio para o JWT.
- Cabeçalhos de segurança (CSP, HSTS, bloqueio de iframe) em `vercel.json`.

## Pendências conhecidas

- Telas de missões, perfil, feed e ajustes do protótipo; tela de administração.
- Confirmação de e-mail, recuperação de senha e login com Google (dependem de serviços externos).
- Uso offline (PWA com mapa próprio do parque).
- Teste com visitantes no parque e conferência em campo das coordenadas e da precisão do GPS.
