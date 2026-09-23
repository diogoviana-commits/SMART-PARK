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

> **A Vercel hospeda apenas o frontend.** Ela não roda Java, então a API precisa estar publicada
> em outro serviço — a nossa está na Render, a partir do `Dockerfile` de `mapbackend/`. Sem a API
> no ar, o mapa continua abrindo com a cópia embutida (ver abaixo), mas entrar e avaliar não
> funcionam, porque dependem do servidor.

1. **Root Directory**: `frontend` — sem isso a Vercel tenta buildar a raiz do repositório e falha.
2. **Framework Preset**: Vite (já declarado em `vercel.json`).
3. **Environment Variables**: `VITE_API_URL` com a URL pública da API, sem barra no final:

   ```
   VITE_API_URL=https://smartpark-api.up.railway.app
   ```

   Essa variável é lida no momento do **build**. Se você alterá-la depois, precisa fazer um novo
   deploy para o site passar a usar o novo endereço.

4. No backend, defina `SMARTPARK_CORS_ORIGENS` com o domínio da Vercel:

   ```
   SMARTPARK_CORS_ORIGENS=https://smart-park.vercel.app
   ```

   Sem isso o navegador bloqueia todas as chamadas, mesmo com a API no ar.

Como conferir se deu certo: abra o site publicado e veja se a lista mostra "33 pontos" **sem** o
aviso de dados de demonstração. Se o aviso aparecer, o site não está falando com a API, e o
problema está em uma das duas variáveis acima.

## Dados de demonstração

O site guarda uma cópia dos pontos e eventos em `src/dadosDemonstracao.js` e a usa **quando a API
não responde**, mostrando um aviso de "dados de demonstração". Sem isso, o endereço publicado
mostraria um mapa vazio sempre que o backend estivesse fora do ar — que é o estado normal enquanto
ele não tem hospedagem fixa. Assim que a API volta, a tela passa a usar os dados reais sozinha.

Para atualizar a cópia depois de mexer na carga inicial do backend:

```bash
python scripts/gerar-dados-demo.py                    # usa http://localhost:8080
python scripts/gerar-dados-demo.py http://localhost:9099
```

As datas dos eventos são guardadas como deslocamento em dias, e não como data fixa: assim a agenda
nunca aparece vencida.

## O que a tela faz

| Recurso | Requisito do PE |
|---|---|
| Mapa com marcadores por categoria, cada um com seu desenho | RF03 |
| Posição do visitante em tempo real (GPS do navegador) | RF04 |
| Rota a pé até o ponto escolhido, com distância e tempo | RF05 |
| Busca e filtros por categoria e acessibilidade | RF06 |
| Card do ponto com horário, situação, acessibilidade e nota | RF07, RF11 |
| Agenda de eventos (clicar leva ao ponto no mapa) | RF08 |
| Botão de fonte ampliada | RF12 (parcial) |
| Criar conta e entrar (token JWT guardado no navegador) | RF01, RF02 |
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
