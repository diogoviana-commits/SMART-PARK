-- =============================================================================
--  Smart Park - modelo fisico (MySQL 8)
--  V1: esquema inicial com as sete tabelas do sistema.
--
--  Este script e a fonte oficial do esquema em producao. Ele foi conferido
--  contra as entidades JPA: subir a aplicacao com
--  spring.jpa.hibernate.ddl-auto=validate so funciona se os dois estiverem
--  identicos, e e assim que qualquer alteracao aqui deve ser verificada.
--
--  Regra para mudancas: nunca edite este arquivo depois de aplicado. Crie um
--  novo (V2__..., V3__...). O Flyway guarda o hash de cada migracao ja aplicada
--  e recusa subir se um arquivo antigo mudar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Categorias usadas para agrupar e filtrar os pontos no mapa (RF06).
-- O slug e o identificador estavel usado pelo front-end (ex.: "banheiro");
-- o nome pode ser reescrito sem quebrar a interface.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_categoria_poi (
    id    BIGINT       NOT NULL AUTO_INCREMENT,
    slug  VARCHAR(40)  NOT NULL,
    nome  VARCHAR(80)  NOT NULL,
    icone VARCHAR(40)      NULL,
    cor   VARCHAR(7)       NULL COMMENT 'Cor do marcador em hexadecimal, ex.: #16a34a',

    CONSTRAINT pk_categoria_poi PRIMARY KEY (id),
    CONSTRAINT uk_categoria_poi_slug UNIQUE (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Visitantes e administradores (RF01, RF02, RNF03).
-- senha_hash guarda SEMPRE o hash BCrypt, nunca a senha: sao 60 caracteres
-- comecando com $2a$. Senha legivel nesta coluna e bug.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_usuario (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    nome          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL,
    senha_hash    VARCHAR(100)  NOT NULL COMMENT 'Hash BCrypt, nunca a senha em texto',
    tipo_perfil   ENUM('VISITANTE', 'ADMINISTRADOR') NOT NULL,
    data_cadastro DATETIME(6)   NOT NULL,
    ultimo_acesso DATETIME(6)       NULL,

    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT uk_usuario_email UNIQUE (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Pontos de interesse do parque: banheiros, quadras, lanchonetes (RF03, RF07).
--
-- A posicao fica em latitude/longitude (graus decimais, WGS84) em vez do tipo
-- espacial POINT. Motivo: o Leaflet consome lat/lon direto e assim o mesmo
-- codigo roda igual em H2 e MySQL, sem depender de extensao espacial.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_ponto_interesse (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    nome               VARCHAR(120) NOT NULL,
    descricao          VARCHAR(600)     NULL,
    id_categoria       BIGINT       NOT NULL,
    latitude           DOUBLE       NOT NULL COMMENT 'Graus decimais, WGS84',
    longitude          DOUBLE       NOT NULL COMMENT 'Graus decimais, WGS84',
    horario_abertura   TIME(6)          NULL COMMENT 'Nulo = sempre aberto',
    horario_fechamento TIME(6)          NULL,
    status_operacional ENUM('EM_FUNCIONAMENTO', 'EM_MANUTENCAO', 'FECHADO') NOT NULL,
    acessivel          BIT(1)       NOT NULL COMMENT 'Rampa, banheiro adaptado (RF12)',
    foto_url           VARCHAR(400)     NULL,

    CONSTRAINT pk_ponto_interesse PRIMARY KEY (id),
    CONSTRAINT fk_poi_categoria FOREIGN KEY (id_categoria)
        REFERENCES tb_categoria_poi (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Agenda de eventos do parque (RF08).
--
-- id_poi_local e opcional: o evento pode acontecer em um ponto mapeado (e entao
-- aparece no mapa) ou apenas ter o local descrito em texto, como "gramado central".
-- -----------------------------------------------------------------------------
CREATE TABLE tb_evento (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    nome             VARCHAR(150) NOT NULL,
    descricao        VARCHAR(800)     NULL,
    data_hora_inicio DATETIME(6)  NOT NULL,
    data_hora_fim    DATETIME(6)      NULL,
    local_descritivo VARCHAR(200)     NULL COMMENT 'Usado quando o evento nao esta em um POI',
    id_poi_local     BIGINT           NULL,
    link_mais_info   VARCHAR(400)     NULL,

    CONSTRAINT pk_evento PRIMARY KEY (id),
    CONSTRAINT fk_evento_poi FOREIGN KEY (id_poi_local)
        REFERENCES tb_ponto_interesse (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Avaliacoes dos pontos de interesse (RF11).
--
-- A unicidade (id_usuario, id_poi) e regra de negocio: uma avaliacao por pessoa
-- em cada ponto. Sem ela, a media seria distorcida por quem avaliasse varias vezes;
-- reavaliar atualiza a nota anterior.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_avaliacao (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    id_usuario     BIGINT       NOT NULL,
    id_poi         BIGINT       NOT NULL,
    nota           INT          NOT NULL COMMENT 'De 1 a 5 estrelas',
    comentario     VARCHAR(600)     NULL,
    data_avaliacao DATETIME(6)  NOT NULL,

    CONSTRAINT pk_avaliacao PRIMARY KEY (id),
    CONSTRAINT uk_avaliacao_usuario_poi UNIQUE (id_usuario, id_poi),
    CONSTRAINT fk_avaliacao_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id),
    CONSTRAINT fk_avaliacao_poi FOREIGN KEY (id_poi)
        REFERENCES tb_ponto_interesse (id),
    CONSTRAINT ck_avaliacao_nota CHECK (nota BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Missoes de gamificacao (RF10): desafios diarios e semanais.
-- valor_meta e lido conforme tipo_meta: km para DISTANCIA, quantidade para
-- CHECKIN e EVENTO.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_missao (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    nome              VARCHAR(120) NOT NULL,
    descricao         VARCHAR(400)     NULL,
    tipo_meta         ENUM('DISTANCIA', 'CHECKIN', 'EVENTO') NOT NULL,
    periodicidade     ENUM('DIARIA', 'SEMANAL')              NOT NULL,
    valor_meta        DOUBLE       NOT NULL COMMENT 'km para DISTANCIA, quantidade nos demais',
    pontos_recompensa INT          NOT NULL,

    CONSTRAINT pk_missao PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Progresso de cada usuario em cada missao (RF10).
-- Uma linha por par (usuario, missao): o avanco e acumulado nela, e ao alcancar
-- valor_meta a missao e marcada como concluida.
-- -----------------------------------------------------------------------------
CREATE TABLE tb_progresso_missao (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    id_usuario      BIGINT      NOT NULL,
    id_missao       BIGINT      NOT NULL,
    progresso_atual DOUBLE      NOT NULL,
    concluida       BIT(1)      NOT NULL,
    data_conclusao  DATETIME(6)     NULL,

    CONSTRAINT pk_progresso_missao PRIMARY KEY (id),
    CONSTRAINT uk_progresso_usuario_missao UNIQUE (id_usuario, id_missao),
    CONSTRAINT fk_progresso_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id),
    CONSTRAINT fk_progresso_missao FOREIGN KEY (id_missao)
        REFERENCES tb_missao (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
