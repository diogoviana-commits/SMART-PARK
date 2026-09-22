# Smart Park — Frontend

Interface web do mapa interativo do **Parque Espaço Verde Chico Mendes** (São Caetano do Sul).
Feita em React + Vite, com [Leaflet](https://leafletjs.com/) e mapas base do OpenStreetMap.

## Requisitos

- Node.js 18+ (testado com Node 24)
- A API do Smart Park rodando em `http://localhost:8080` (pasta `mapbackend/`)

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em <http://localhost:5173>. O Vite encaminha as chamadas de `/api` para
`http://localhost:8080` (configurado em `vite.config.js`), então não há CORS em desenvolvimento.

Para gerar a versão de produção:

```bash
npm run build     # gera a pasta dist/
npm run preview   # serve o dist/ localmente para conferência
```

## O que a tela faz

| Recurso | Requisito do PE |
|---|---|
| Mapa com zoom, navegação e marcadores por categoria | RF03 |
| Posição do visitante em tempo real (GPS do navegador) | RF04 |
| Rota a pé até o ponto escolhido, com distância e tempo | RF05 |
| Campo de busca e filtros por categoria e acessibilidade | RF06 |
| Card do ponto com horário, situação e acessibilidade | RF07 |
| Agenda de eventos (clicar leva ao ponto no mapa) | RF08 |
| Botão "A+ Fonte maior" | RF12 (parcial) |

## Estrutura

```
src/
├── api.js                      # chamadas HTTP à API
├── App.jsx                     # estado da tela e composição dos componentes
├── index.css                   # estilos (inclui o modo de fonte ampliada)
├── main.jsx                    # ponto de entrada
└── components/
    ├── MapaParque.jsx          # mapa Leaflet, marcadores, posição e linha da rota
    ├── FiltroCategorias.jsx    # chips de categoria e acessibilidade
    ├── CardPoi.jsx             # card do ponto selecionado e botão de rota
    └── PainelEventos.jsx       # agenda de eventos
```

## Observações

- A **geolocalização** só funciona em `localhost` ou em HTTPS — é uma exigência dos navegadores.
  Sem permissão, o mapa continua utilizável; apenas o botão de rota fica desabilitado.
- O centro do parque está em `src/components/MapaParque.jsx` (`CENTRO_PARQUE`) e precisa ficar
  igual ao `LAT_CENTRO`/`LON_CENTRO` da carga inicial do backend.
- As coordenadas de cada ponto de interesse ainda são aproximadas (ver README do backend).
