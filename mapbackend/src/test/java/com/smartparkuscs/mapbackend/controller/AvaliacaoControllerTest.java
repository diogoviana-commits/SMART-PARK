package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.hasSize;
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
 * Avaliacoes dos pontos de interesse (RF11).
 */
@SpringBootTest
@AutoConfigureMockMvc
class AvaliacaoControllerTest {

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

    private String corpo(int nota, String comentario) {
        return """
                {"nota":%d,"comentario":"%s"}
                """.formatted(nota, comentario);
    }

    @Test
    void avaliaUmPontoComEstrelasEComentario() throws Exception {
        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(5, "Bem limpo")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nota", is(5)))
                .andExpect(jsonPath("$.comentario", is("Bem limpo")))
                .andExpect(jsonPath("$.poiId", is(3)))
                .andExpect(jsonPath("$.usuarioId", is(sessao.id().intValue())));
    }

    @Test
    void aAvaliacaoFicaSempreNoNomeDeQuemEstaLogado() throws Exception {
        Sessao outro = apoio.novoVisitante();

        // Mesmo que o corpo tente indicar outro usuario, vale o dono do token.
        mockMvc.perform(post("/api/pois/9/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usuarioId":%d,"nota":1,"comentario":"Tentando personificar"}
                                """.formatted(outro.id())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuarioId", is(sessao.id().intValue())));
    }

    @Test
    void avaliarDeNovoSubstituiANotaEmVezDeDuplicar() throws Exception {
        mockMvc.perform(post("/api/pois/5/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(2, "Estava quebrado")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/pois/5/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(4, "Consertaram")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nota", is(4)));

        mockMvc.perform(get("/api/pois/5/avaliacoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.usuarioId == %d)]".formatted(sessao.id()), hasSize(1)));
    }

    @Test
    void mediaDeEstrelasApareceNoCardDoPonto() throws Exception {
        mockMvc.perform(post("/api/pois/7/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(4, "Boa comida")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/pois/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notaMedia", is(4.0)))
                .andExpect(jsonPath("$.totalAvaliacoes", is(1)));
    }

    @Test
    void pontoSemAvaliacaoTrazMediaNula() throws Exception {
        mockMvc.perform(get("/api/pois/14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notaMedia").doesNotExist())
                .andExpect(jsonPath("$.totalAvaliacoes", is(0)));
    }

    @Test
    void listarAvaliacoesEPublico() throws Exception {
        mockMvc.perform(get("/api/pois/3/avaliacoes")).andExpect(status().isOk());
    }

    @Test
    void notaForaDaEscalaRetorna400() throws Exception {
        mockMvc.perform(post("/api/pois/3/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(9, "Nota invalida")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void avaliarPontoInexistenteRetorna404() throws Exception {
        mockMvc.perform(post("/api/pois/999999/avaliacoes")
                        .header(HttpHeaders.AUTHORIZATION, sessao.autorizacao())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo(5, "Nao existe")))
                .andExpect(status().isNotFound());
    }
}
