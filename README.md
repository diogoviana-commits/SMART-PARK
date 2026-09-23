# Smart Park — Mapa Interativo Turístico

Projeto de Extensão (PE) do curso de Análise e Desenvolvimento de Sistemas da **USCS**.

O Smart Park é um mapa digital interativo do **Parque Espaço Verde Chico Mendes**, em São Caetano
do Sul (SP). Ele ajuda o visitante a se localizar, encontrar banheiros, quadras, bebedouros e
lanchonetes, traçar a rota a pé até o ponto escolhido e acompanhar a agenda de eventos do parque.

A proposta nasceu de uma pesquisa de campo com **68 frequentadores** do parque, em que a agenda de
eventos (89,7%), a localização de estruturas como banheiros e lanchonetes (76,5%) e os horários de
funcionamento (75%) apareceram como as informações mais desejadas.

## No ar

| | |
|---|---|
| Site | <https://smart-park-eight-puce.vercel.app> |
| API | <https://smartpark-api-kncs.onrender.com> |
| Documentação da API | <https://smartpark-api-kncs.onrender.com/swagger-ui/index.html> |

## Estrutura do repositório

```
SMART-PARK/
├── frontend/     Interface web em React + Vite + Leaflet (OpenStreetMap)
├── mapbackend/   API REST em Java 17 + Spring Boot
└── docs/         Material de apoio do projeto
```

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

A interface sobe em <http://localhost:5173> e consome a API em `http://localhost:8080`
(o Vite faz o encaminhamento de `/api`, então não há CORS em desenvolvimento).
Detalhes em [`frontend/README.md`](frontend/README.md).

## Como rodar o backend

```bash
cd mapbackend
mvnw spring-boot:run
```

Sobe em <http://localhost:8080> com H2 em memória e o parque já carregado — não precisa instalar
banco nenhum. Detalhes, perfis e segurança em [`mapbackend/README.md`](mapbackend/README.md).

## API consumida pelo frontend

| Método | Rota | Para que serve |
|---|---|---|
| GET | `/api/categorias` | Categorias que alimentam os filtros do mapa |
| GET | `/api/pois` | Lista os pontos; aceita `busca`, `categoria` e `acessivel` |
| GET | `/api/pois/{id}` | Dados de um ponto (card informativo) |
| GET | `/api/pois/{id}/rota?lat=&lon=` | Rota a pé, com distância em metros e tempo estimado |
| GET | `/api/pois/proximos?lat=&lon=&raio=` | Pontos mais próximos da posição informada |
| GET | `/api/eventos` | Agenda de eventos dos próximos 30 dias |
| POST | `/api/usuarios` | Cria a conta de visitante (RF01) |
| POST | `/api/usuarios/login` | Autentica e devolve o token JWT (RF02) |
| GET | `/api/pois/{id}/avaliacoes` | Notas e comentários de um ponto (RF11) |
| POST | `/api/pois/{id}/avaliacoes` | Avalia o ponto de 1 a 5 — exige token (RF11) |

## Tecnologias

| Camada | Escolha |
|---|---|
| Frontend | JavaScript, React 18, Vite, Leaflet / react-leaflet |
| Mapa base | OpenStreetMap (sem custo de licença de API) |
| Backend | Java 17, Spring Boot 3, Spring Data JPA |
| Banco | H2 em memória (desenvolvimento), MySQL 8 ou PostgreSQL 16 (produção) |
| Publicação | Vercel (site) + Render (API em contêiner Docker) |
| Versionamento | Git + GitHub |

> **Nota sobre o relatório do PE:** o documento descreve o backend em Python e o banco em
> PostgreSQL/PostGIS. A implementação seguiu **Java + Spring Boot + MySQL**, que é a base que o
> grupo já tinha começado e domina. A troca do Google Maps pelo **Leaflet + OpenStreetMap** foi
> mantida, pelo motivo já registrado no relatório: elimina custo de licença de API.

## Equipe

Gabriel Bello Gimenez · Gabriel Vinicius Ballacchino Leandro · Ryan Morgado Goulart ·
Luis Fernando Mendes dos Santos

## Documentos

- [`docs/backend-tutorial-inicial.md`](docs/backend-tutorial-inicial.md) — passo a passo usado na
  montagem da primeira versão do backend (Spring Initializr, MySQL e Hibernate Spatial).
