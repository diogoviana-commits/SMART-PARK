-- =============================================================================
--  V3: permite encerrar as sessoes de uma conta.
--
--  O token JWT vale ate expirar, mesmo depois de a pessoa clicar em "Sair": o
--  servidor nao guarda lista de tokens. Cada token carrega o numero da versao
--  da conta no momento do login; sair incrementa esse numero, e todo token
--  emitido antes passa a ser recusado - inclusive um token roubado.
-- =============================================================================
ALTER TABLE tb_usuario
    ADD COLUMN versao_token INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN tb_usuario.versao_token IS 'Incrementada ao sair: invalida os tokens emitidos antes';
