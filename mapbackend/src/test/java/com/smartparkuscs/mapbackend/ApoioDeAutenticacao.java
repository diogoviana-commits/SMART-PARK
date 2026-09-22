package com.smartparkuscs.mapbackend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Cria contas e obtem tokens nos testes, para nao repetir o mesmo cadastro e login
 * em cada classe.
 *
 * <p>E uma classe comum, criada no @BeforeEach de quem precisa. Como bean do Spring
 * ela seria carregada tambem nos testes sem MockMvc e quebraria aqueles contextos.</p>
 */
public class ApoioDeAutenticacao {

    /** Credenciais do administrador criado pela carga inicial. */
    public static final String ADMIN_EMAIL = "admin@smartpark.uscs";
    public static final String ADMIN_SENHA = "smartpark2026";

    /** Senha usada em todas as contas de teste criadas por esta classe. */
    public static final String SENHA_PADRAO = "senhaDeTeste1";

    private final MockMvc mockMvc;
    private final ObjectMapper json;

    public ApoioDeAutenticacao(MockMvc mockMvc, ObjectMapper json) {
        this.mockMvc = mockMvc;
        this.json = json;
    }

    /** Conta de visitante com e-mail unico, ja com o token pronto para uso. */
    public Sessao novoVisitante() throws Exception {
        String email = "visitante" + System.nanoTime() + "@exemplo.com";

        String corpo = mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Visitante de Teste","email":"%s","senha":"%s"}
                                """.formatted(email, SENHA_PADRAO)))
                .andReturn().getResponse().getContentAsString();

        Long id = json.readTree(corpo).get("id").asLong();
        return new Sessao(id, email, token(email, SENHA_PADRAO));
    }

    public String tokenDoAdministrador() throws Exception {
        return token(ADMIN_EMAIL, ADMIN_SENHA);
    }

    public String token(String email, String senha) throws Exception {
        String corpo = mockMvc.perform(post("/api/usuarios/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"%s"}
                                """.formatted(email, senha)))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(corpo).get("token").asText();
    }

    /** Valor pronto para o cabecalho Authorization. */
    public static String bearer(String token) {
        return "Bearer " + token;
    }

    public record Sessao(Long id, String email, String token) {

        public String autorizacao() {
            return bearer(token);
        }
    }
}
