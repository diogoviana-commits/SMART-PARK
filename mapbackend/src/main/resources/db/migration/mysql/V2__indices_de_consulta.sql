-- =============================================================================
--  V2: indices para as consultas que a aplicacao realmente faz.
--
--  Nota honesta sobre escala: com as dezenas de linhas que o parque tem hoje, o
--  MySQL varre a tabela inteira em menos tempo do que levaria para ler um indice.
--  Estes indices nao aceleram nada agora; existem para que o comportamento se
--  mantenha quando o cadastro crescer (outros parques, historico de avaliacoes)
--  e para deixar registrado quais colunas sao criterio de busca.
--
--  As chaves primarias, as unicas e as estrangeiras ja criam indice sozinhas,
--  entao nao aparecem aqui.
-- =============================================================================

-- Busca de ponto por nome, em PontoInteresseRepository.buscar.
-- Ajuda no prefixo (LIKE 'ban%'); a busca atual usa LIKE '%termo%', que nao
-- aproveita indice. Para busca por palavra no meio do texto em escala maior, o
-- caminho seria um indice FULLTEXT.
CREATE INDEX ix_poi_nome ON tb_ponto_interesse (nome);

-- Filtro "somente pontos acessiveis" combinado com a categoria (RF06, RF12).
CREATE INDEX ix_poi_categoria_acessivel ON tb_ponto_interesse (id_categoria, acessivel);

-- Agenda por periodo, em EventoRepository.buscarNoPeriodo: e a consulta que mais
-- se beneficia, porque filtra por faixa de data e ordena pela mesma coluna.
CREATE INDEX ix_evento_inicio ON tb_evento (data_hora_inicio);

-- Listagem das avaliacoes de um ponto, da mais recente para a mais antiga.
CREATE INDEX ix_avaliacao_poi_data ON tb_avaliacao (id_poi, data_avaliacao DESC);

-- Missoes concluidas de um usuario, para somar os pontos do perfil (RF10).
CREATE INDEX ix_progresso_usuario_concluida ON tb_progresso_missao (id_usuario, concluida);
