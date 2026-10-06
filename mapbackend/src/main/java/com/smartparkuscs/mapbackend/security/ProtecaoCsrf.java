package com.smartparkuscs.mapbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Barra requisicoes forjadas por outro site (CSRF).
 *
 * <p>Com a sessao em cookie, um site malicioso poderia montar um formulario que
 * envia uma avaliacao ou apaga a conta de quem o visitasse: o navegador anexaria
 * o cookie sozinho. O {@code SameSite=Strict} do cookie ja impede isso nos
 * navegadores atuais; esta e a segunda barreira, para os que nao o respeitam.</p>
 *
 * <p>Toda requisicao que altera algo precisa trazer o cabecalho
 * {@code X-Requested-With: SmartPark}. Um formulario HTML nao consegue enviar
 * cabecalhos, e um script de outro site so conseguiria passando pelo CORS, que nao
 * libera esse cabecalho para origem nenhuma alem do proprio site.</p>
 *
 * <p>Requisicoes com {@code Authorization: Bearer} ficam de fora: o navegador nunca
 * anexa esse cabecalho sozinho, entao elas nao sao forjaveis.</p>
 *
 * <p>Nao e um bean do Spring de proposito: como {@code @Component} ele seria
 * registrado tambem como filtro de servlet, fora da cadeia de seguranca.</p>
 */
public class ProtecaoCsrf extends OncePerRequestFilter {

    public static final String CABECALHO = "X-Requested-With";
    public static final String VALOR = "SmartPark";

    private static final Set<String> METODOS_SEGUROS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final RespostaDeErro respostaDeErro;

    public ProtecaoCsrf(RespostaDeErro respostaDeErro) {
        this.respostaDeErro = respostaDeErro;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest requisicao,
                                    @NonNull HttpServletResponse resposta,
                                    @NonNull FilterChain corrente)
            throws ServletException, IOException {

        boolean altera = !METODOS_SEGUROS.contains(requisicao.getMethod());
        boolean daApi = requisicao.getRequestURI().startsWith("/api/");
        String autorizacao = requisicao.getHeader("Authorization");
        boolean bearer = autorizacao != null && autorizacao.startsWith("Bearer ");

        if (altera && daApi && !bearer && !VALOR.equals(requisicao.getHeader(CABECALHO))) {
            respostaDeErro.escrever(resposta, 403, "Requisicao recusada: origem nao confirmada.");
            return;
        }
        corrente.doFilter(requisicao, resposta);
    }
}
