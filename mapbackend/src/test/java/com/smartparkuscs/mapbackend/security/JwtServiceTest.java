package com.smartparkuscs.mapbackend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartparkuscs.mapbackend.model.Perfil;
import com.smartparkuscs.mapbackend.model.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtServiceTest {

    private static final String SEGREDO_FORTE =
            "um-segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

    private JwtService servico(String segredo, String... perfis) {
        MockEnvironment ambiente = new MockEnvironment();
        ambiente.setActiveProfiles(perfis);
        JwtService servico = new JwtService(segredo, 120, ambiente);
        servico.prepararChave();
        return servico;
    }

    private Usuario usuario() {
        return new Usuario("Eliana Souza", "eliana@exemplo.com", "hash-qualquer", Perfil.VISITANTE);
    }

    @Test
    void tokenGeradoEValidadoDevolveOEmail() {
        JwtService servico = servico(SEGREDO_FORTE, "dev");

        String token = servico.gerar(usuario());

        assertThat(servico.emailDoToken(token)).isEqualTo("eliana@exemplo.com");
    }

    @Test
    void tokenAssinadoComOutroSegredoERecusado() {
        String token = servico(SEGREDO_FORTE, "dev").gerar(usuario());
        JwtService outroServidor = servico("outro-segredo-completamente-diferente-e-longo", "dev");

        assertThat(outroServidor.emailDoToken(token)).isNull();
    }

    @Test
    void tokenAdulteradoERecusado() {
        JwtService servico = servico(SEGREDO_FORTE, "dev");
        String token = servico.gerar(usuario());
        String adulterado = token.substring(0, token.length() - 2) + "xy";

        assertThat(servico.emailDoToken(adulterado)).isNull();
    }

    @Test
    void textoQueNaoEUmTokenERecusado() {
        JwtService servico = servico(SEGREDO_FORTE, "dev");

        assertThat(servico.emailDoToken("isto-nao-e-um-token")).isNull();
        assertThat(servico.emailDoToken("")).isNull();
    }

    @Test
    void segredoCurtoNaoEAceito() {
        assertThatThrownBy(() -> servico("curto-demais", "dev"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 caracteres");
    }

    @Test
    void producaoRecusaSubirComOSegredoDeDesenvolvimento() {
        // Esta e a protecao contra publicar com um segredo que esta no repositorio:
        // com ele, qualquer pessoa forjaria um token de administrador.
        assertThatThrownBy(() -> servico(JwtService.SEGREDO_PADRAO_DEV, "prod"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMARTPARK_JWT_SECRET");
    }

    @Test
    void desenvolvimentoAceitaOSegredoPadrao() {
        assertThat(servico(JwtService.SEGREDO_PADRAO_DEV, "dev")).isNotNull();
    }
}
