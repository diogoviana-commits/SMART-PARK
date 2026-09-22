package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao.Sessao;
import com.smartparkuscs.mapbackend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Cadastro e autenticacao (RF01, RF02).
 */
@SpringBootTest
@AutoConfigureMockMvc
class UsuarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper json;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private ApoioDeAutenticacao apoio;

    @BeforeEach
    void prepararApoio() {
        apoio = new ApoioDeAutenticacao(mockMvc, json);
    }

    private String email(String prefixo) {
        return prefixo + System.nanoTime() + "@exemplo.com";
    }

    @Test
    void cadastraVisitanteSemDevolverSenha() throws Exception {
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Eliana Souza","email":"%s","senha":"corrida2026"}
                                """.formatted(email("eliana"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.perfil", is("VISITANTE")))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
    }

    @Test
    void guardaASenhaComHashNuncaEmTextoPuro() throws Exception {
        String email = email("marcos");
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Marcos Oliveira","email":"%s","senha":"familia2026"}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        var salvo = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(salvo.getSenhaHash())
                .isNotEqualTo("familia2026")
                .startsWith("$2a$");
    }

    @Test
    void emailRepetidoRetorna409() throws Exception {
        String email = email("olga");
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Olga Menezes","email":"%s","senha":"turismo2026"}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Outra Olga","email":"%s","senha":"outrasenha1"}
                                """.formatted(email.toUpperCase())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)));
    }

    @Test
    void senhaCurtaRetorna400() throws Exception {
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"%s","senha":"123"}
                                """.formatted(email("curta"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emailInvalidoRetorna400() throws Exception {
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"nao-e-email","senha":"senhavalida1"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginDevolveTokenEOsDadosDaConta() throws Exception {
        Sessao sessao = apoio.novoVisitante();

        mockMvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"%s"}
                                """.formatted(sessao.email(), ApoioDeAutenticacao.SENHA_PADRAO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.tipo", is("Bearer")))
                .andExpect(jsonPath("$.expiraEm", notNullValue()))
                .andExpect(jsonPath("$.usuario.email", is(sessao.email())))
                .andExpect(jsonPath("$.usuario.ultimoAcesso", notNullValue()))
                .andExpect(jsonPath("$.usuario.senhaHash").doesNotExist());
    }

    @Test
    void loginComSenhaErradaRetorna401() throws Exception {
        Sessao sessao = apoio.novoVisitante();

        mockMvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"senhaerrada1"}
                                """.formatted(sessao.email())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem", is("E-mail ou senha incorretos.")));
    }

    @Test
    void loginComEmailInexistenteDaAMesmaRespostaDeSenhaErrada() throws Exception {
        mockMvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"ninguem@exemplo.com","senha":"qualquersenha"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem", is("E-mail ou senha incorretos.")));
    }

    @Test
    void enderecoEuDevolveAContaDoToken() throws Exception {
        Sessao sessao = apoio.novoVisitante();

        mockMvc.perform(get("/api/usuarios/eu")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(sessao.id().intValue())))
                .andExpect(jsonPath("$.email", is(sessao.email())));
    }

    @Test
    void administradorCriaOutroAdministrador() throws Exception {
        mockMvc.perform(post("/api/usuarios/administradores")
                        .header(HttpHeaders.AUTHORIZATION,
                                ApoioDeAutenticacao.bearer(apoio.tokenDoAdministrador()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Novo Admin","email":"%s","senha":"administrar1"}
                                """.formatted(email("admin"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perfil", is("ADMINISTRADOR")));
    }
}
