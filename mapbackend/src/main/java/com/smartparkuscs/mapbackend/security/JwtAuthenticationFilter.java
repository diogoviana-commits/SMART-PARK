package com.smartparkuscs.mapbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Identifica quem fez a requisicao a partir do token de sessao.
 *
 * <p>O token vem do cookie de sessao, que e como o site se autentica, ou do
 * cabecalho {@code Authorization: Bearer <token>}, para clientes que nao sao
 * navegador (testes automatizados, ferramentas de linha de comando).</p>
 *
 * <p>Alem da assinatura e da validade, o token precisa ter a mesma versao que a
 * conta tem hoje no banco. Quando a pessoa sai, a versao muda e todo token
 * anterior deixa de valer, mesmo que ainda nao tenha expirado.</p>
 *
 * <p>Requisicao sem token valido passa adiante sem usuario: quem decide se aquilo e
 * permitido e a {@link ConfiguracaoSeguranca}, nao este filtro.</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final DetalhesUsuarioService detalhesUsuarioService;
    private final CookieDeSessao cookie;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   DetalhesUsuarioService detalhesUsuarioService,
                                   CookieDeSessao cookie) {
        this.jwtService = jwtService;
        this.detalhesUsuarioService = detalhesUsuarioService;
        this.cookie = cookie;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest requisicao,
                                    @NonNull HttpServletResponse resposta,
                                    @NonNull FilterChain corrente)
            throws ServletException, IOException {

        String token = tokenDaRequisicao(requisicao);
        JwtService.DadosDoToken dados = token == null ? null : jwtService.ler(token);

        if (dados != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UsuarioAutenticado usuario =
                        (UsuarioAutenticado) detalhesUsuarioService.loadUserByUsername(dados.email());
                if (usuario.getVersaoToken() == dados.versao()) {
                    var autenticacao = new UsernamePasswordAuthenticationToken(
                            usuario, null, usuario.getAuthorities());
                    autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(requisicao));
                    SecurityContextHolder.getContext().setAuthentication(autenticacao);
                } else {
                    logger.debug("Token de uma sessao ja encerrada");
                }
            } catch (UsernameNotFoundException e) {
                // Token valido de um usuario que foi removido depois: segue sem autenticar.
                logger.debug("Token de usuario inexistente");
            }
        }

        corrente.doFilter(requisicao, resposta);
    }

    private String tokenDaRequisicao(HttpServletRequest requisicao) {
        String cabecalho = requisicao.getHeader("Authorization");
        if (cabecalho != null && cabecalho.startsWith(PREFIXO)) {
            return cabecalho.substring(PREFIXO.length()).trim();
        }
        return cookie.ler(requisicao);
    }
}
