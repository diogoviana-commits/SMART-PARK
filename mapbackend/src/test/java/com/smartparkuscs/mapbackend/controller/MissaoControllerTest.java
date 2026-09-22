package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao.Sessao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Missoes e progresso da gamificacao (RF10).
 */
@SpringBootTest
@AutoConfigureMockMvc
class MissaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper json;

    private ApoioDeAutenticacao apoio;
    private Sessao sessao;

    @BeforeEach
    void prepararUsuario() throws Exception {
        apoio = new ApoioDeAutenticacao(mockMvc, json);
        sessao = apoio.novoVisitante();
    }

    private String avanco(double quantidade) {
        return """
                {"quantidade":%s}
                """.formatted(quantidade);
    }

    @Test
    void listaAsMissoesDaCargaInicial() throws Exception {
        mockMvc.perform(get("/api/missoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(6)));
    }

    @Test
    void filtraPorPeriodicidade() throws Exception {
        mockMvc.perform(get("/api/missoes").param("periodicidade", "DIARIA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].periodicidade", everyItem(is("DIARIA"))))
                .andExpect(jsonPath("$.length()", greaterThan(0)));
    }

    @Test
    void periodicidadeInvalidaRetorna400() throws Exception {
        mockMvc.perform(get("/api/missoes").param("periodicidade", "MENSAL"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void semLoginAsMissoesVemZeradas() throws Exception {
        mockMvc.perform(get("/api/missoes"))
                .andExpect(jsonPath("$[*].progressoAtual", everyItem(is(0.0))))
                .andExpect(jsonPath("$[*].concluida", everyItem(is(false))));
    }

    @Test
    void progressoParcialNaoConcluiAMissao() throws Exception {
        // Missao 1 = "Primeiros Passos", meta de 2,5 km
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(1.0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressoAtual", is(1.0)))
                .andExpect(jsonPath("$.fracaoConcluida", is(0.4)))
                .andExpect(jsonPath("$.concluida", is(false)));
    }

    @Test
    void avancosSaoSomadosAteConcluir() throws Exception {
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(1.5)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(1.0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressoAtual", is(2.5)))
                .andExpect(jsonPath("$.fracaoConcluida", is(1.0)))
                .andExpect(jsonPath("$.concluida", is(true)));
    }

    @Test
    void fracaoNaoPassaDeUmQuandoSuperaAMeta() throws Exception {
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(10.0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fracaoConcluida", is(1.0)))
                .andExpect(jsonPath("$.concluida", is(true)));
    }

    @Test
    void oProgressoDeUmaPessoaNaoApareceParaOutra() throws Exception {
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(2.0)))
                .andExpect(status().isOk());

        Sessao outro = apoio.novoVisitante();
        mockMvc.perform(get("/api/missoes").param("periodicidade", "DIARIA")
                        .header(HttpHeaders.AUTHORIZATION, outro.autorizacao()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].progressoAtual", everyItem(is(0.0))));
    }

    @Test
    void pontosSomamApenasMissoesConcluidas() throws Exception {
        mockMvc.perform(get("/api/missoes/pontos")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pontos", is(0)));

        // conclui "Primeiros Passos" (50 pontos)
        mockMvc.perform(post("/api/missoes/1/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(3.0)))
                .andExpect(status().isOk());

        // avanca sem concluir "Turista" (meta de 5 km)
        mockMvc.perform(post("/api/missoes/2/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(1.0)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/missoes/pontos")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao()))
                .andExpect(jsonPath("$.pontos", is(50)));
    }

    @Test
    void listaComProgressoDeQuemEstaLogado() throws Exception {
        mockMvc.perform(post("/api/missoes/4/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(8.0)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/missoes").param("periodicidade", "SEMANAL")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 4)].progressoAtual", contains(8.0)));
    }

    @Test
    void progressoEmMissaoInexistenteRetorna404() throws Exception {
        mockMvc.perform(post("/api/missoes/999999/progresso")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(avanco(1.0)))
                .andExpect(status().isNotFound());
    }
}
