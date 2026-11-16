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
| Testes | Vitest + PGlite (PostgreSQL embutido), rodados neste computador antes de cada `git push` |
| App instalável | PWA (vite-plugin-pwa / Workbox) |

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
npm run verificar # os três acima, em sequência
```

O `npm install` liga um gancho do Git (`.githooks/pre-push`) que roda `npm run verificar` antes de
todo `git push` e recusa o envio se algo falhar. Ele substitui os testes no GitHub Actions: a Vercel
publica direto da `main`, então a conferência precisa acontecer antes de o commit sair daqui. Numa
emergência, `git push --no-verify` pula a conferência.

> No Windows, rode os testes com o caminho do projeto começando por `C:` maiúsculo (o PowerShell
> faz isso). Com `c:` minúsculo, o Vitest carrega duas cópias de si mesmo e falha antes de começar.

### Publicar

1. Variáveis na Vercel (Settings → Environment Variables), descritas em `.env.example`:
   `DATABASE_URL`, `SMARTPARK_JWT_SECRET` e, se quiser criar a administração, `SMARTPARK_ADMIN_SENHA`.
   Dois recursos dependem de contas em serviços externos e só aparecem no site quando as
   variáveis deles existem:
   - **E-mail** (confirmação de cadastro e recuperação de senha): uma conta Gmail do projeto com
     senha de app, em `SMARTPARK_SMTP_USUARIO` e `SMARTPARK_SMTP_SENHA`; ou, com domínio próprio, a
     [Resend](https://resend.com), com `SMARTPARK_EMAIL_CHAVE` e `SMARTPARK_EMAIL_REMETENTE`.
   - **Login com Google**: cliente OAuth no Google Cloud, com `SMARTPARK_GOOGLE_ID` e
     `SMARTPARK_GOOGLE_SEGREDO`, e a URI de redirecionamento `<site>/api/usuarios/google/retorno`.

   Em desenvolvimento, os e-mails não saem: o link aparece no terminal da API.
2. Banco: `DATABASE_URL="..." npm run migrar`. Faça antes um backup: `npm run backup`.
3. O push na `main` publica.

### Backup do banco

```bash
npm run backup            # grava um backup agora
npm run backup:agendar    # agenda um backup por semana (Agendador de Tarefas do Windows)
```

O backup guarda as linhas de todas as tabelas num arquivo `.json.gz` em `Backups/SmartPark`, na pasta
do usuário (ou na pasta de `SMARTPARK_PASTA_BACKUP`), e mantém os 12 mais recentes. Fica fora do
repositório porque contém os e-mails dos visitantes. O endereço do banco vem de `DATABASE_URL` ou,
sem ela, do CLI do Neon (`npx neonctl auth`, uma vez); nada é gravado em arquivo. Cada execução deixa
uma linha em `backup.log`, na mesma pasta.

Para restaurar num banco novo, já migrado até a mesma versão:

```bash
DATABASE_URL="..." npm run migrar
DATABASE_URL="..." npm run backup -- --restaurar CAMINHO.json.gz --confirmar
```

Sem `--confirmar`, o comando só mostra o que faria. A restauração substitui o conteúdo do destino.

## O que o sistema faz

Cinco destinos na barra inferior, como no protótipo de alta fidelidade: **Mapa, Agenda, Missões,
Feed e Perfil** (com Ajustes). O mapa é aberto: consultar o parque não exige conta. A conta é pedida
para avaliar, publicar, seguir pessoas e fazer as missões. A administração do parque abre a sua
tela em Perfil › Ajustes › Administração do parque.

**Instalar no celular:** o site é um PWA. No Android, abra no Chrome e toque em "Instalar app"; no
iPhone, abra no Safari › Compartilhar › "Adicionar à Tela de Início". Ele abre em tela cheia, com
ícone próprio, e guarda o app, a rede de trilhas e as últimas consultas para funcionar com sinal fraco.

| Recurso | Requisito |
|---|---|
| Cadastro por e-mail ou Google, com confirmação do e-mail por link | RF01 (sem Apple, por decisão do grupo) |
| Login com senha e recuperação de senha por e-mail ("Esqueci minha senha") | RF02 |
| Mapa com os 33 pontos, cada categoria com cor e desenho | RF03 |
| Posição do visitante pelo GPS | RF04 |
| Rota a pé pelos caminhos, com distância e tempo; opção sem escadas; recálculo ao sair do caminho | RF05 |
| Busca por pontos e eventos; filtros por categoria e acessibilidade | RF06 |
| Card do ponto com foto, situação, horário, acessibilidade e nota | RF07 (as fotos são enviadas pela administração) |
| Agenda dos próximos 30 dias | RF08 |
| Missões do dia e da semana, "Registrar visita", XP, nível, medalhas e ranking (geral e entre amigos) | RF09 |
| Avaliação de 1 a 5 estrelas com comentário; reportar problema no ponto; enviar sugestão | RF10 |
| Ajustes: tamanho do texto, alto contraste, só rotas acessíveis, descrever imagens | RF11 |
| Tela de administração: pontos (com foto), eventos, avisos, problemas e sugestões recebidos, moderação do feed | RF12, UC07, UC08 |
| Relatórios de uso: visitas por dia, pontos mais visitados e mais bem avaliados, missões concluídas | UC09 |
| Administração de contas: bloquear, desbloquear e mudar o perfil | UC10 |
| Feed "No parque hoje": avisos oficiais, publicações, curtidas, comentários, denúncia | protótipo |
| Perfil com estatísticas, conquistas, pontos visitados e amigos (seguir pessoas) | protótipo |
| Favoritos, tela de abertura, tour de primeiro acesso, ajuda | protótipo, heurística 10 |
| Instalável no celular (PWA), com trilhas e últimas consultas disponíveis sem sinal | RNF06 |

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
| GET | `/api/pois/{id}/foto` | aberto |
| PUT/DELETE | `/api/pois/{id}/foto` | administração |
| GET | `/api/pois/{id}/avaliacoes` | aberto |
| POST | `/api/pois/{id}/avaliacoes` | conta |
| DELETE | `/api/pois/{id}/avaliacoes/{id}` | dono ou administração |
| GET | `/api/eventos` (`de`, `ate`, `todos`), `/api/eventos/{id}` | aberto |
| POST/PUT/DELETE | `/api/eventos`, `/api/eventos/{id}` | administração |
| POST | `/api/usuarios` (cadastro), `/api/usuarios/login`, `/api/usuarios/sair` | aberto |
| GET | `/api/recursos` (o que está configurado: e-mail, Google) | aberto |
| POST | `/api/usuarios/senha/esqueci`, `/api/usuarios/senha/redefinir` | aberto |
| POST | `/api/usuarios/confirmar` (código do link) | aberto |
| POST | `/api/usuarios/confirmar/reenviar` | conta |
| GET | `/api/usuarios/google/iniciar`, `/api/usuarios/google/retorno` | aberto |
| GET | `/api/usuarios/eu` | conta |
| GET/DELETE | `/api/usuarios/{id}` | a própria conta ou administração |
| GET, POST | `/api/usuarios`, `/api/usuarios/administradores` | administração |
| PATCH | `/api/usuarios/{id}` (`bloqueado`, `perfil`) | administração |
| GET | `/api/missoes` (`periodicidade`) | aberto (com progresso, se logado) |
| GET | `/api/missoes/pontos` | conta |
| POST | `/api/visitas` (`poiId`, `latitude`, `longitude`) | conta |
| GET | `/api/favoritos` | conta |
| POST/DELETE | `/api/pois/{id}/favorito` | conta |
| POST | `/api/pois/{id}/problemas` (`tipo`, `descricao`) | conta |
| GET, PATCH | `/api/problemas` (`situacao`), `/api/problemas/{id}` | administração |
| GET | `/api/avisos` | aberto (`todos=true`: administração) |
| POST/PUT/DELETE | `/api/avisos`, `/api/avisos/{id}` | administração |
| GET | `/api/feed` (`aba`) | aberto (`aba=seguindo`: conta) |
| POST | `/api/publicacoes` | conta |
| DELETE | `/api/publicacoes/{id}` | dono ou administração |
| POST/DELETE | `/api/publicacoes/{id}/curtida` | conta |
| GET | `/api/publicacoes/{id}/comentarios` | aberto |
| POST | `/api/publicacoes/{id}/comentarios`, `/api/publicacoes/{id}/denuncia` | conta |
| GET, PATCH | `/api/publicacoes/denunciadas`, `/api/publicacoes/{id}` | administração |
| GET/PATCH | `/api/perfil` (`nome`, `perfilPublico`) | conta |
| GET | `/api/perfil/seguindo` | conta |
| GET | `/api/perfis/{id}` | aberto (só perfis públicos) |
| POST/DELETE | `/api/perfis/{id}/seguir` | conta |
| GET | `/api/ranking` (`escopo`) | aberto (`escopo=amigos`: conta) |
| POST | `/api/sugestoes` | conta |
| GET, PATCH | `/api/sugestoes` (`situacao`), `/api/sugestoes/{id}` | administração |
| GET | `/api/relatorios` (`dias`) | administração |

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
- Links de e-mail (confirmar e redefinir senha) levam um código aleatório de 256 bits, de uso único e
  com validade; no banco fica só o hash dele. "Esqueci minha senha" responde igual, e no mesmo tempo,
  exista a conta ou não, e redefinir a senha encerra as sessões abertas.
- O endereço dos links vem da configuração, nunca do cabeçalho `Host` da requisição.
- Login com Google confere a assinatura do token e o parâmetro `state`. Ao vincular a uma conta cujo
  e-mail nunca foi confirmado, a senha anterior é descartada.
- Conta bloqueada pela administração perde as sessões na hora e não entra mais.
- Foto de ponto: só JPEG, PNG ou WebP, com o conteúdo conferido, até 400 KB.
- Em produção, a API se recusa a subir sem um segredo próprio para o JWT.
- Cabeçalhos de segurança (CSP, HSTS, bloqueio de iframe) em `vercel.json`.

## Pendências conhecidas

- E-mail e login com Google estão implementados, mas só funcionam no site publicado depois de criadas
  as variáveis de e-mail e o cliente OAuth no Google Cloud (veja "Publicar").
- Login com Apple (a Especificação cita; o grupo decidiu ficar só com o Google).
- Fotos dos pontos: o envio funciona, mas as fotos em si ainda precisam ser tiradas no parque.
- Mapa base totalmente offline: hoje ficam guardados os blocos do mapa que a pessoa já viu.
- Notificações no celular (os avisos aparecem no Feed e na Agenda).
- Teste com visitantes no parque e conferência em campo das coordenadas e da precisão do GPS.
