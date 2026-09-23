package com.smartparkuscs.mapbackend.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartparkuscs.mapbackend.ApoioDeAutenticacao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testes de ponta a ponta da API sobre o banco H2 populado pela carga inicial.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PontoInteresseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper json;

    /** Cadastro de pontos exige perfil de administrador. */
    private String tokenAdmin;

    @BeforeEach
    void autenticarComoAdministrador() throws Exception {
        tokenAdmin = ApoioDeAutenticacao.bearer(
                new ApoioDeAutenticacao(mockMvc, json).tokenDoAdministrador());
    }

    @Test
    void listaTodosOsPontosDaCargaInicial() throws Exception {
        mockMvc.perform(get("/api/pois"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(10)));
    }

    @Test
    void buscaPorTextoFiltraPeloNome() throws Exception {
        // A busca varre nome e descricao: os tres playgrounds vem pelo nome.
        mockMvc.perform(get("/api/pois").param("busca", "playground"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].nome", containsInAnyOrder(
                        "Playground do Bosque", "Playground da Alameda", "Playground da Entrada")));
    }

    @Test
    void buscaSemResultadoRetornaListaVazia() throws Exception {
        mockMvc.perform(get("/api/pois").param("busca", "heliponto"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void filtraPorCategoria() throws Exception {
        mockMvc.perform(get("/api/pois").param("categoria", "banheiro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].categoria.slug", everyItem(is("banheiro"))));
    }

    @Test
    void filtraPorAcessibilidade() throws Exception {
        mockMvc.perform(get("/api/pois").param("categoria", "banheiro").param("acessivel", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nome", is("Banheiro das Quadras")));
    }

    @Test
    void pontoInexistenteRetorna404ComMensagem() throws Exception {
        mockMvc.perform(get("/api/pois/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));
    }

    @Test
    void rotaTrazDistanciaEDuracao() throws Exception {
        mockMvc.perform(get("/api/pois/1/rota").param("lat", "-23.6420").param("lon", "-46.5600"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.distanciaMetros", greaterThan(0.0)))
                .andExpect(jsonPath("$.duracaoMinutos", greaterThan(0)))
                .andExpect(jsonPath("$.pontos", hasSize(2)));
    }

    @Test
    void cadastroComCategoriaInexistenteRetorna404() throws Exception {
        String corpo = """
                {"nome":"Teste","categoriaSlug":"inexistente","latitude":-23.64,"longitude":-46.56}
                """;
        mockMvc.perform(post("/api/pois").header(HttpHeaders.AUTHORIZATION, tokenAdmin)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isNotFound());
    }

    @Test
    void cadastroSemNomeRetorna400() throws Exception {
        String corpo = """
                {"categoriaSlug":"banheiro","latitude":-23.64,"longitude":-46.56}
                """;
        mockMvc.perform(post("/api/pois").header(HttpHeaders.AUTHORIZATION, tokenAdmin)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest());
    }

    @Test
    void agendaDeEventosRetornaProximosEventos() throws Exception {
        mockMvc.perform(get("/api/eventos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(0)))
                .andExpect(jsonPath("$[0].nome", is("Caminhada Orientada")))
                .andExpect(jsonPath("$[0].local", is("Entrada da Avenida Fernando Simonsen")));
    }

    @Test
    void categoriasSaoExpostasParaOsFiltros() throws Exception {
        mockMvc.perform(get("/api/categorias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)));
    }
}
