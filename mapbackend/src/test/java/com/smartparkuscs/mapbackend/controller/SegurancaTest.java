package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    // ------------------------------------------------- publico: so o minimo ----

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
    void checagemDeSaudeNaoExigeLogin() throws Exception {
        // A tela de entrar usa isto para acordar o servidor antes do login.
        mockMvc.perform(get("/api/saude"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")));
    }

    @Test
    void documentacaoDaApiFicaDisponivelEmDesenvolvimento() throws Exception {
        // Nos perfis publicados o springdoc fica desligado (application-prod.properties).
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    // ------------------------------------------- o mapa inteiro exige login ----

    @Test
    void verOMapaExigeLogin() throws Exception {
        for (String caminho : java.util.List.of("/api/pois", "/api/categorias", "/api/eventos",
                "/api/pois/1", "/api/pois/proximos?lat=-23.63&lon=-46.57", "/api/pois/1/avaliacoes",
                "/api/eventos/1", "/api/missoes")) {
            mockMvc.perform(get(caminho))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status", is(401)));
        }
        mockMvc.perform(get("/api/pois/1/rota").param("lat", "-23.63").param("lon", "-46.57"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void comLoginOMapaResponde() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(get("/api/pois").header(HttpHeaders.AUTHORIZATION, visitante.autorizacao()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/pois/1/rota").param("lat", "-23.6313").param("lon", "-46.5734")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao()))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------- cookie e sessao ----

    @Test
    void oCookieDeSessaoAutenticaSozinho() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(get("/api/usuarios/eu").cookie(cookie(visitante.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is(visitante.email())));
    }

    @Test
    void sairInvalidaOTokenNoServidorMesmoAntesDeExpirar() throws Exception {
        Sessao visitante = apoio.novoVisitante();
        String tokenAntigo = visitante.token();

        mockMvc.perform(post("/api/usuarios/sair")
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
                        .cookie(cookie(tokenAntigo)))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        // Uma copia do token (roubada, ou esquecida em outro aparelho) para de valer.
        mockMvc.perform(get("/api/usuarios/eu").cookie(cookie(tokenAntigo)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/usuarios/eu")
                        .header(HttpHeaders.AUTHORIZATION, ApoioDeAutenticacao.bearer(tokenAntigo)))
                .andExpect(status().isUnauthorized());

        // Entrar de novo funciona normalmente.
        String novo = apoio.token(visitante.email(), ApoioDeAutenticacao.SENHA_PADRAO);
        mockMvc.perform(get("/api/usuarios/eu").cookie(cookie(novo))).andExpect(status().isOk());
    }

    @Test
    void sairSemSessaoApenasApagaOCookie() throws Exception {
        mockMvc.perform(post("/api/usuarios/sair")
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR))
                .andExpect(status().isNoContent());
    }

    // ------------------------------------------------------------------ CSRF ----

    @Test
    void requisicaoComCookieSemOCabecalhoDoSiteERecusada() throws Exception {
        // E o que um formulario escondido em outro site conseguiria enviar.
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .cookie(cookie(visitante.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nota":1,"comentario":"Forjada"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/usuarios/" + visitante.id()).cookie(cookie(visitante.token())))
                .andExpect(status().isForbidden());
    }

    @Test
    void requisicaoComCookieEOCabecalhoDoSitePassa() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .cookie(cookie(visitante.token()))
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nota":5,"comentario":"Pelo site"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void loginSemOCabecalhoDoSiteERecusado() throws Exception {
        // Impede um site de logar a vitima numa conta do atacante (login CSRF).
        mockMvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@smartpark.uscs","senha":"smartpark2026"}
                                """))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------- cabecalhos de seguranca ---

    @Test
    void respostasTrazemCabecalhosDeSeguranca() throws Exception {
        mockMvc.perform(get("/api/saude"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", containsString("geolocation=(self)")))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")));
    }

    @Test
    void comentarioMaiorQueAColunaRetorna400() throws Exception {
        Sessao visitante = apoio.novoVisitante();

        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, visitante.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(java.util.Map.of(
                                "nota", 3, "comentario", "x".repeat(700)))))
                .andExpect(status().isBadRequest());
    }

    private static jakarta.servlet.http.Cookie cookie(String token) {
        return new jakarta.servlet.http.Cookie(ApoioDeAutenticacao.COOKIE_SESSAO, token);
    }

    // ------------------------------------------------- exige autenticacao ----

    @Test
    void avaliarSemLoginRetorna401() throws Exception {
        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
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
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
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
        mockMvc.perform(post("/api/usuarios")
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
                        .contentType(MediaType.APPLICATION_JSON)
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
                            .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
                            .contentType(MediaType.APPLICATION_JSON).content(erradas))
                    .andExpect(status().isUnauthorized());
        }

        // A partir daqui nem a senha certa passa, enquanto durar o bloqueio.
        mockMvc.perform(post("/api/usuarios/login")
                        .header(ApoioDeAutenticacao.CSRF, ApoioDeAutenticacao.CSRF_VALOR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"senhaDeTeste1"}
                                """.formatted(vitima.email())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem",
                        org.hamcrest.Matchers.containsString("Muitas tentativas")));
    }
}
