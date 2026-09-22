package com.smartparkuscs.mapbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Le o cabecalho {@code Authorization: Bearer <token>} de cada requisicao e,
 * quando o token e valido, coloca o usuario no contexto de seguranca.
 *
 * <p>Requisicao sem token passa adiante sem usuario: quem decide se aquilo e
 * permitido e a {@link ConfiguracaoSeguranca}, nao este filtro.</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final DetalhesUsuarioService detalhesUsuarioService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   DetalhesUsuarioService detalhesUsuarioService) {
        this.jwtService = jwtService;
        this.detalhesUsuarioService = detalhesUsuarioService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest requisicao,
                                    @NonNull HttpServletResponse resposta,
                                    @NonNull FilterChain corrente)
            throws ServletException, IOException {

        String cabecalho = requisicao.getHeader("Authorization");
        if (cabecalho == null || !cabecalho.startsWith(PREFIXO)) {
            corrente.doFilter(requisicao, resposta);
            return;
        }

        String email = jwtService.emailDoToken(cabecalho.substring(PREFIXO.length()).trim());
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails usuario = detalhesUsuarioService.loadUserByUsername(email);
                var autenticacao = new UsernamePasswordAuthenticationToken(
                        usuario, null, usuario.getAuthorities());
                autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(requisicao));
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            } catch (UsernameNotFoundException e) {
                // Token valido de um usuario que foi removido depois: segue sem autenticar.
                logger.debug("Token de usuario inexistente");
            }
        }

        corrente.doFilter(requisicao, resposta);
    }
}
