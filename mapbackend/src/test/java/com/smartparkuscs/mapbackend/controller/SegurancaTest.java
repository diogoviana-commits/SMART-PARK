package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartparkuscs.mapbackend.ApoioDeAutenticacao;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao.Sessao;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Garante quem pode chamar o que (RNF03).
 *
 * <p>Estes testes existem para que uma mudanca futura nas regras de acesso quebre a
 * build em vez de abrir a aplicacao silenciosamente.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "smartpark.login.max-tentativas=3")
class SegurancaTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper json;

    private ApoioDeAutenticacao apoio;

    @BeforeEach
    void prepararApoio() {
        apoio = new ApoioDeAutenticacao(mockMvc, json);
    }

    private static final String POI_NOVO = """
            {"nome":"Quiosque Novo","categoriaSlug":"alimentacao",
             "latitude":-23.6325,"longitude":-46.5731}
            """;

    // ------------------------------------------------------------ publico ----

    /**
     * Quando algo estoura dentro da aplicacao, o Spring encaminha a requisicao para
     * /error. Se esse caminho exigisse login, o erro interno chegaria ao usuario
     * como "faca login para usar este recurso" - foi o que aconteceu ao rodar a API
     * contra PostgreSQL pela primeira vez, e levou um bom tempo para descobrir que
     * o 401 nao tinha nada a ver com autenticacao.
     */
    @Test
    void paginaDeErroNaoPedeLogin() throws Exception {
        mockMvc.perform(get("/error"))
                .andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }

    @Test
    void consultarOMapaNaoExigeLogin() throws Exception {
        mockMvc.perform(get("/api/pois")).andExpect(status().isOk());
        mockMvc.perform(get("/api/categorias")).andExpect(status().isOk());
        mockMvc.perform(get("/api/eventos")).andExpect(status().isOk());
        mockMvc.perform(get("/api/pois/1")).andExpect(status().isOk());
        mockMvc.perform(get("/api/pois/1/rota").param("lat", "-23.63").param("lon", "-46.57"))
                .andExpect(status().isOk());
    }

    @Test
    void catalogoDeMissoesEPublicoMasVemZerado() throws Exception {
        mockMvc.perform(get("/api/missoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].progressoAtual", is(0.0)));
    }

    @Test
    void documentacaoDaApiEPublica() throws Exception {
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    // ------------------------------------------------- exige autenticacao ----

    @Test
    void avaliarSemLoginRetorna401() throws Exception {
        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nota":5,"comentario":"Sem login"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    void registrarProgressoSemLoginRetorna401() throws Exception {
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"quantidade":3.0}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenInventadoNaoAutentica() throws Exception {
        mockMvc.perform(get("/api/usuarios/eu")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer token.completamente.falso"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenAdulteradoNaoAutentica() throws Exception {
        Sessao visitante = apoio.novoVisitante();
        String token = visitante.token();

        // Troca um caractere no meio do payload: a assinatura deixa de conferir.
        // (Alterar o ultimo caractere nao serviria: em base64url ele carrega bits
        // nao usados, entao dois caracteres podem decodificar para os mesmos bytes.)
        int posicao = token.indexOf('.') + 5;
        char atual = token.charAt(posicao);
        String adulterado = token.substring(0, posicao)
                + (atual == 'a' ? 'b' : 'a')
                + token.substring(posicao + 1);

        mockMvc.perform(get("/api/usuarios/eu")
                        .header(HttpHeaders.AUTHORIZATION, ApoioDeAutenticacao.bearer(adulterado)))
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------- exige administrador ---

    @Test
    void visitanteNaoCadastraPontoDeInteresse() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(post("/api/pois")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(POI_NOVO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    @Test
    void administradorCadastraPontoDeInteresse() throws Exception {
        mockMvc.perform(post("/api/pois")
                        .header(HttpHeaders.AUTHORIZATION,
                                ApoioDeAutenticacao.bearer(apoio.tokenDoAdministrador()))
                        .contentType(MediaType.APPLICATION_JSON).content(POI_NOVO))
                .andExpect(status().isCreated());
    }

    @Test
    void visitanteNaoApagaPontoDeInteresse() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(delete("/api/pois/2")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao()))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitanteNaoListaOsUsuarios() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(get("/api/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao()))
                .andExpect(status().isForbidden());
    }

    @Test
    void administradorListaOsUsuarios() throws Exception {
        mockMvc.perform(get("/api/usuarios")
                        .header(HttpHeaders.AUTHORIZATION,
                                ApoioDeAutenticacao.bearer(apoio.tokenDoAdministrador())))
                .andExpect(status().isOk());
    }

    @Test
    void ninguemSeCadastraComoAdministrador() throws Exception {
        // Mesmo mandando o campo perfil, a conta sai como VISITANTE.
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Tentativa","email":"tentativa%d@exemplo.com",
                                 "senha":"senhaForte1","perfil":"ADMINISTRADOR"}
                                """.formatted(System.nanoTime())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perfil", is("VISITANTE")));
    }

    @Test
    void visitanteNaoCriaOutroAdministrador() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(post("/api/usuarios/administradores")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Admin Pirata","email":"pirata%d@exemplo.com","senha":"senhaForte1"}
                                """.formatted(System.nanoTime())))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------ dados de outro ---

    @Test
    void naoDaParaLerAContaDeOutraPessoa() throws Exception {
        Sessao um = apoio.novoVisitante();
        Sessao outro = apoio.novoVisitante();

        mockMvc.perform(get("/api/usuarios/" + outro.id())
                        .header(HttpHeaders.AUTHORIZATION, um.autorizacao()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/usuarios/" + um.id())
                        .header(HttpHeaders.AUTHORIZATION, um.autorizacao()))
                .andExpect(status().isOk());
    }

    @Test
    void naoDaParaApagarAContaDeOutraPessoa() throws Exception {
        Sessao um = apoio.novoVisitante();
        Sessao outro = apoio.novoVisitante();

        mockMvc.perform(delete("/api/usuarios/" + outro.id())
                        .header(HttpHeaders.AUTHORIZATION, um.autorizacao()))
                .andExpect(status().isForbidden());
    }

    @Test
    void naoDaParaApagarAAvaliacaoDeOutraPessoa() throws Exception {
        Sessao dono = apoio.novoVisitante();
        Sessao intruso = apoio.novoVisitante();

        String criada = mockMvc.perform(post("/api/pois/6/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, dono.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nota":4,"comentario":"Minha avaliacao"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long avaliacaoId = com.jayway.jsonpath.JsonPath.parse(criada).read("$.id", Integer.class);

        mockMvc.perform(delete("/api/pois/6/avaliacoes/" + avaliacaoId)
                        .header(HttpHeaders.AUTHORIZATION, intruso.autorizacao()))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/pois/6/avaliacoes/" + avaliacaoId)
                        .header(HttpHeaders.AUTHORIZATION, dono.autorizacao()))
                .andExpect(status().isNoContent());
    }

    // --------------------------------------------------------- forca bruta ---

    @Test
    void loginTravaDepoisDeVariasSenhasErradas() throws Exception {
        Sessao vitima = apoio.novoVisitante();
        String erradas = """
                {"email":"%s","senha":"senhaErrada9"}
                """.formatted(vitima.email());

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/usuarios/login")
                            .contentType(MediaType.APPLICATION_JSON).content(erradas))
                    .andExpect(status().isUnauthorized());
        }

        // A partir daqui nem a senha certa passa, enquanto durar o bloqueio.
        mockMvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"senhaDeTeste1"}
                                """.formatted(vitima.email())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem",
                        org.hamcrest.Matchers.containsString("Muitas tentativas")));
    }
}
