# Smart Park — Frontend

Interface web do mapa interativo do **Parque Espaço Verde Chico Mendes** (São Caetano do Sul).
React + Vite, com [Leaflet](https://leafletjs.com/) e mapas base do OpenStreetMap.

## Rodando localmente

```bash
npm install
npm run dev
```

A aplicação sobe em <http://localhost:5173>. Em desenvolvimento o Vite encaminha as chamadas de
`/api` para `http://localhost:8080` (ver `vite.config.js`), então não há CORS — basta ter a API
(pasta `mapbackend/`) rodando.

```bash
npm run build     # gera dist/
npm run preview   # serve o dist/ em localhost:4173, igual ao que vai para produção
```

## Publicando na Vercel

> **A Vercel hospeda apenas o frontend.** Ela não roda Java: a API está na Render, a partir do
> `Dockerfile` de `mapbackend/`. Sem a API no ar ninguém entra, porque o mapa exige login.

1. **Root Directory**: `frontend` — sem isso a Vercel tenta buildar a raiz do repositório e falha.
2. **Framework Preset**: Vite (já declarado em `vercel.json`).
3. Não há variável de ambiente. O `vercel.json` encaminha `/api/*` para a API na Render
   (`rewrites`), então o site e a API ficam na **mesma origem**. Isso é obrigatório: a sessão
   viaja num cookie `HttpOnly` com `SameSite=Strict`, que o navegador não envia para outro
   domínio. Para trocar o endereço da API, mude o `destination` do rewrite.

O `vercel.json` também define os cabeçalhos de segurança do site (Content-Security-Policy, HSTS,
bloqueio de iframe). A política de conteúdo é a mesma de `ConfiguracaoSeguranca.java`; mudou em um,
mude no outro.

Como conferir se deu certo: abra o site publicado, entre ou crie uma conta e veja se a lista mostra
"33 pontos". Na primeira visita do dia a tela avisa que o servidor está ligando — no plano
gratuito ele hiberna e leva perto de um minuto para acordar.

## O que a tela faz

| Recurso | Requisito do PE |
|---|---|
| Mapa com marcadores por categoria, cada um com seu desenho | RF03 |
| Posição do visitante em tempo real (GPS do navegador) | RF04 |
| Rota a pé pelas trilhas do parque, com distância e tempo que diminuem enquanto se anda | RF05 |
| Recalcula a rota ao sair do caminho e avisa na chegada; botão para seguir a própria posição | RF05 |
| Com "Somente pontos acessíveis", a rota desvia das escadas | RF05, RF12 |
| Busca e filtros por categoria e acessibilidade | RF06 |
| Card do ponto com horário, situação, acessibilidade e nota | RF07, RF11 |
| Agenda de eventos (clicar leva ao ponto no mapa) | RF08 |
| Botão de fonte ampliada | RF12 (parcial) |
| Tela de entrada obrigatória: o mapa só abre depois de entrar ou criar conta | RF01, RF02 |
| Sessão em cookie HttpOnly (o JavaScript não lê o token); sair encerra em todos os aparelhos | RNF03 |
| Avaliar o ponto de 1 a 5 estrelas, com comentário | RF11 |

## Estrutura

```
src/
├── api.js                      # chamadas HTTP à API
├── App.jsx                     # estado da tela e composição
├── icones.jsx                  # desenhos das categorias (marcadores e listas)
├── index.css                   # estilos, escritos primeiro para o celular
├── main.jsx                    # ponto de entrada
└── components/
    ├── MapaParque.jsx          # mapa, marcadores, posição e linha da rota
    ├── FiltroCategorias.jsx    # filtros por categoria e acessibilidade
    ├── CardPoi.jsx             # card do ponto e botão de rota
    ├── Avaliacoes.jsx          # notas, comentários e formulário de avaliação
    ├── Acesso.jsx              # diálogo de entrar / criar conta
    ├── Conta.jsx               # botão e menu da conta no cabeçalho
    └── PainelEventos.jsx       # agenda
```

## Decisões de interface

- **Celular primeiro.** O mapa ocupa a tela inteira e a lista fica em um painel deslizante; duas
  colunas só a partir de 900px. É onde o app será usado de verdade: alguém em pé no parque.
- O painel tem **botão de recolher visível** além da alça, e fecha com `Esc`. Alça sozinha é fácil
  de ignorar ([NN/g](https://www.nngroup.com/articles/bottom-sheet/)), e aberto ele para em 82% da
  altura para o mapa continuar visível.
- **Alvos de toque de 44px**, conforme Apple HIG e Material Design — acima do mínimo de 24px da
  [WCAG 2.5.8](https://www.w3.org/TR/WCAG22/).
- Cada categoria tem **cor e desenho**. Só cor deixaria de fora quem não distingue bem as cores.

## Limitações conhecidas

- **Entrar e avaliar exigem o servidor no ar.** Diferente do mapa, essas ações não têm cópia de
  reserva, de propósito: uma tela que fingisse aceitar um cadastro sem servidor estaria mentindo —
  a conta não existiria, e a pessoa descobriria isso na próxima vez que tentasse entrar.
- **Não há "esqueci minha senha"** nem renovação automática do token: depois de 2 h, é preciso
  entrar de novo.
- A **geolocalização** só funciona em `localhost` ou HTTPS, exigência dos navegadores. Na Vercel
  isso já vem resolvido; ao testar em rede local por IP, não funciona.
- Os **tiles do OpenStreetMap** vêm do servidor público, que pede uso moderado. Para um projeto
  acadêmico está dentro do aceitável; com tráfego real, use um provedor de tiles.
