-- =============================================================================
--  V4: acentuação dos textos exibidos ao visitante.
--
--  A versão em Java gravou categorias, nomes e descrições sem acento ("Alimentacao",
--  "Praca da Agua"), e a tela mostrava assim. Esta migração troca pelo texto correto.
--  Só altera linhas que ainda têm o texto da carga original, então é segura num banco
--  em que a administração já tenha editado algum ponto.
-- =============================================================================

UPDATE tb_categoria_poi SET nome = 'Alimentação' WHERE slug = 'alimentacao' AND nome = 'Alimentacao';
UPDATE tb_categoria_poi SET nome = 'Serviços e apoio' WHERE slug = 'servico' AND nome = 'Servicos e apoio';
UPDATE tb_categoria_poi SET nome = 'Entrada e saída' WHERE slug = 'entrada' AND nome = 'Entrada e saida';

UPDATE tb_ponto_interesse SET nome = 'Ponto de Ônibus da Entrada Principal' WHERE nome = 'Ponto de Onibus da Entrada Principal';
UPDATE tb_ponto_interesse SET nome = 'Ponto de Ônibus das Quadras' WHERE nome = 'Ponto de Onibus das Quadras';
UPDATE tb_ponto_interesse SET nome = 'Praça da Água' WHERE nome = 'Praca da Agua';
UPDATE tb_ponto_interesse SET nome = 'Bicicletário' WHERE nome = 'Bicicletario';

UPDATE tb_ponto_interesse SET descricao = 'Portão principal para pedestres, com passagem para cadeira de rodas.' WHERE nome = 'Entrada da Avenida Fernando Simonsen' AND lower(descricao) = lower('Portao principal para pedestres, com passagem para cadeira de rodas.');
UPDATE tb_ponto_interesse SET descricao = 'Portão de pedestres ao lado da entrada de veículos.' WHERE nome = 'Entrada do Bosque' AND lower(descricao) = lower('Portao de pedestres ao lado da entrada de veiculos.');
UPDATE tb_ponto_interesse SET descricao = 'Portão a leste, o mais próximo das quadras e dos banheiros.' WHERE nome = 'Entrada das Quadras' AND lower(descricao) = lower('Portao a leste, o mais proximo das quadras e dos banheiros.');
UPDATE tb_ponto_interesse SET descricao = 'Parada coberta e iluminada, em frente ao portão da Avenida Fernando Simonsen.' WHERE nome = 'Ponto de Ônibus da Entrada Principal' AND lower(descricao) = lower('Parada coberta e iluminada, em frente ao portao da Avenida Fernando Simonsen.');
UPDATE tb_ponto_interesse SET descricao = 'Parada coberta e iluminada, junto à entrada leste.' WHERE nome = 'Ponto de Ônibus das Quadras' AND lower(descricao) = lower('Parada coberta e iluminada, junto a entrada leste.');
UPDATE tb_ponto_interesse SET descricao = 'Banheiro masculino, gratuito, com cabine adaptada para cadeira de rodas.' WHERE nome = 'Banheiro das Quadras' AND lower(descricao) = lower('Banheiro masculino, gratuito, com cabine adaptada para cadeira de rodas.');
UPDATE tb_ponto_interesse SET descricao = 'Banheiro feminino, gratuito. Sem cabine adaptada.' WHERE nome = 'Banheiro do Bosque' AND lower(descricao) = lower('Banheiro feminino, gratuito. Sem cabine adaptada.');
UPDATE tb_ponto_interesse SET descricao = 'Torneira de água potável junto às quadras.' WHERE nome = 'Bebedouro das Quadras' AND lower(descricao) = lower('Torneira de agua potavel junto as quadras.');
UPDATE tb_ponto_interesse SET descricao = 'Torneira de água potável ao lado dos aparelhos.' WHERE nome = 'Bebedouro da Academia' AND lower(descricao) = lower('Torneira de agua potavel ao lado dos aparelhos.');
UPDATE tb_ponto_interesse SET descricao = 'Torneira de água potável no meio dos canteiros.' WHERE nome = 'Bebedouro dos Jardins' AND lower(descricao) = lower('Torneira de agua potavel no meio dos canteiros.');
UPDATE tb_ponto_interesse SET descricao = 'Torneira de água potável perto das mesas cobertas.' WHERE nome = 'Bebedouro dos Quiosques' AND lower(descricao) = lower('Torneira de agua potavel perto das mesas cobertas.');
UPDATE tb_ponto_interesse SET descricao = 'Pastelaria na calçada do parque, Avenida Fernando Simonsen, 501. Aceita cartão.' WHERE nome = 'Gumis Pastelaria' AND lower(descricao) = lower('Pastelaria na calcada do parque, Avenida Fernando Simonsen, 501. Aceita cartao.');
UPDATE tb_ponto_interesse SET descricao = 'Bar e petiscos na Avenida Fernando Simonsen, 503, ao lado do portão principal.' WHERE nome = 'Botequim Cacique' AND lower(descricao) = lower('Bar e petiscos na Avenida Fernando Simonsen, 503, ao lado do portao principal.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 1' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 2' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 3' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 4' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 5' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 6' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.' WHERE nome = 'Quadra Poliesportiva 7' AND lower(descricao) = lower('Quadra de piso de concreto, iluminada, para futsal, volei e basquete.');
UPDATE tb_ponto_interesse SET descricao = 'Aparelhos de alongamento e musculação à sombra.' WHERE nome = 'Academia ao Ar Livre do Bosque' AND lower(descricao) = lower('Aparelhos de alongamento e musculacao a sombra.');
UPDATE tb_ponto_interesse SET descricao = 'Segundo conjunto de aparelhos, no lado oeste do parque.' WHERE nome = 'Academia ao Ar Livre da Alameda' AND lower(descricao) = lower('Segundo conjunto de aparelhos, no lado oeste do parque.');
UPDATE tb_ponto_interesse SET descricao = 'Área infantil aberta ao público.' WHERE nome = 'Playground do Bosque' AND lower(descricao) = lower('Area infantil aberta ao publico.');
UPDATE tb_ponto_interesse SET descricao = 'Área infantil no lado oeste, perto dos quiosques.' WHERE nome = 'Playground da Alameda' AND lower(descricao) = lower('Area infantil no lado oeste, perto dos quiosques.');
UPDATE tb_ponto_interesse SET descricao = 'Área infantil logo após o portão principal.' WHERE nome = 'Playground da Entrada' AND lower(descricao) = lower('Area infantil logo apos o portao principal.');
UPDATE tb_ponto_interesse SET descricao = 'Área infantil com jatos de água no piso. Iluminada.' WHERE nome = 'Praça da Água' AND lower(descricao) = lower('Area infantil com jatos de agua no piso. Iluminada.');
UPDATE tb_ponto_interesse SET descricao = 'Mesa com bancos e cobertura, junto ao lago.' WHERE nome = 'Quiosque Coberto do Lago' AND lower(descricao) = lower('Mesa com bancos e cobertura, junto ao lago.');
UPDATE tb_ponto_interesse SET descricao = 'Mesa com bancos e cobertura, sob as árvores.' WHERE nome = 'Quiosque Coberto do Bosque' AND lower(descricao) = lower('Mesa com bancos e cobertura, sob as arvores.');
UPDATE tb_ponto_interesse SET descricao = 'Mesa com bancos e cobertura, perto do portão principal.' WHERE nome = 'Quiosque Coberto da Entrada' AND lower(descricao) = lower('Mesa com bancos e cobertura, perto do portao principal.');
UPDATE tb_ponto_interesse SET descricao = 'Espelho d’água no centro do parque, com caminho ao redor.' WHERE nome = 'Lago Principal' AND lower(descricao) = lower('Espelho de agua no centro do parque, com caminho ao redor.');
UPDATE tb_ponto_interesse SET descricao = 'Segundo espelho d’água, na parte arborizada.' WHERE nome = 'Lago do Bosque' AND lower(descricao) = lower('Segundo espelho de agua, na parte arborizada.');
UPDATE tb_ponto_interesse SET descricao = 'Base da Guarda Civil dentro do parque, ao lado do portão principal.' WHERE nome = 'Posto da Guarda Civil Municipal' AND lower(descricao) = lower('Base da Guarda Civil dentro do parque, ao lado do portao principal.');
UPDATE tb_ponto_interesse SET descricao = 'Trinta vagas gratuitas em suportes de parede, junto à entrada leste.' WHERE nome = 'Bicicletário' AND lower(descricao) = lower('Trinta vagas gratuitas em suportes de parede, junto a entrada leste.');

UPDATE tb_evento SET descricao = 'Caminhada guiada de 3 km, com saída no portão principal.' WHERE nome = 'Caminhada Orientada' AND lower(descricao) = lower('Caminhada guiada de 3 km, com saida no portao principal.');
UPDATE tb_evento SET descricao = 'Torneio aberto para equipes do município. Inscrição no local.' WHERE nome = 'Torneio de Futsal' AND lower(descricao) = lower('Torneio aberto para equipes do municipio. Inscricao no local.');
UPDATE tb_evento SET descricao = 'Oficina de educação ambiental com doação de mudas nativas.' WHERE nome = 'Oficina de Plantio' AND lower(descricao) = lower('Oficina de educacao ambiental com doacao de mudas nativas.');
UPDATE tb_evento SET descricao = 'Sessão de cinema para toda a família. Traga sua canga.' WHERE nome = 'Cinema ao Ar Livre' AND lower(descricao) = lower('Sessao de cinema para toda a familia. Traga sua canga.');
UPDATE tb_evento SET descricao = 'Produtores e artesãos locais expondo em volta da Praça da Água.' WHERE nome = 'Feira de Artesanato' AND lower(descricao) = lower('Produtores e artesaos locais expondo em volta da Praca da Agua.');

UPDATE tb_missao SET nome = 'Presença Cultural' WHERE nome = 'Presenca Cultural';
