-- =============================================================================
--  V5: trava de login persistida no banco.
--
--  Na versão em Java, as senhas erradas eram contadas na memória do servidor. Uma
--  função serverless não guarda memória entre uma chamada e outra: cada pedido pode
--  cair numa instância nova, e a trava de 5 tentativas nunca chegaria a valer. Por
--  isso a contagem passa a ficar aqui.
--
--  A chave é o e-mail normalizado (minúsculo, sem espaços), mesmo que a conta não
--  exista: assim quem testa senhas não descobre quais e-mails estão cadastrados.
-- =============================================================================

CREATE TABLE tb_tentativa_login (
    email        VARCHAR(160) NOT NULL,
    falhas       INT          NOT NULL,
    ultima_falha TIMESTAMP(6) NOT NULL,

    CONSTRAINT pk_tentativa_login PRIMARY KEY (email)
);

COMMENT ON TABLE tb_tentativa_login IS 'Senhas erradas seguidas por e-mail; zera no login correto';
