package com.smartparkuscs.mapbackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Quem pode chamar o que (RNF03).
 *
 * <p>A regra geral e: <strong>ler o mapa e publico, escrever exige login</strong>.
 * Isso vem do proprio relatorio, que descreve o cadastro como opcional para quem so
 * quer se localizar no parque. Gestao de pontos, eventos e usuarios exige perfil de
 * administrador.</p>
 *
 * <p>A aplicacao nao usa sessao: cada requisicao se identifica pelo token JWT, o que
 * tambem torna o CSRF inaplicavel (nao ha cookie de sessao para o navegador reenviar
 * automaticamente), por isso ele fica desligado.</p>
 */
@Configuration
@EnableMethodSecurity
public class ConfiguracaoSeguranca {

    private final JwtAuthenticationFilter filtroJwt;
    private final ObjectMapper json;
    private final String[] origensPermitidas;
    private final boolean desenvolvimento;

    public ConfiguracaoSeguranca(JwtAuthenticationFilter filtroJwt,
                                 ObjectMapper json,
                                 @Value("${smartpark.cors.origens}") String[] origensPermitidas,
                                 Environment ambiente) {
        this.filtroJwt = filtroJwt;
        this.json = json;
        this.origensPermitidas = origensPermitidas;
        this.desenvolvimento = ambiente.matchesProfiles("dev", "test");
    }

    @Bean
    public PasswordEncoder codificadorDeSenha() {
        // BCrypt com custo 12: mais lento de propósito, o que encarece a quebra por forca bruta.
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager gerenciadorDeAutenticacao(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filtros(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(configuracaoCors()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(regras -> {
                    if (desenvolvimento) {
                        // Console do H2, util para inspecionar o banco durante o desenvolvimento.
                        // Precisa vir antes de anyRequest, que encerra a lista de regras.
                        regras.requestMatchers("/h2-console/**").permitAll();
                    }

                    regras
                            // Pagina de erro do proprio Spring. Sem liberar isto, um erro
                            // interno sai como 401 "faca login": o Spring encaminha a
                            // requisicao que falhou para /error, /error cai no
                            // anyRequest().authenticated() e a resposta que chega ao
                            // usuario fala de autenticacao, escondendo o erro de verdade.
                            .requestMatchers("/error").permitAll()

                            // --- publico: o site e a consulta ao mapa ---
                            .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**",
                                    "/favicon.ico", "/*.png", "/*.svg").permitAll()
                            .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                            .permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/categorias", "/api/pois",
                                    "/api/pois/proximos", "/api/pois/*", "/api/pois/*/rota",
                                    "/api/pois/*/avaliacoes", "/api/eventos", "/api/eventos/*",
                                    "/api/missoes").permitAll()

                            // --- publico: criar conta e entrar ---
                            .requestMatchers(HttpMethod.POST, "/api/usuarios", "/api/usuarios/login")
                            .permitAll()

                            // --- administracao do parque ---
                            .requestMatchers(HttpMethod.POST, "/api/pois").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.PUT, "/api/pois/*").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.DELETE, "/api/pois/*").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.GET, "/api/usuarios").hasRole("ADMINISTRADOR")

                            // --- qualquer usuario logado ---
                            .anyRequest().authenticated();
                })
                .exceptionHandling(erros -> erros
                        .authenticationEntryPoint((req, res, e) ->
                                responder(res, HttpStatus.UNAUTHORIZED,
                                        "Faca login para usar este recurso."))
                        .accessDeniedHandler((req, res, e) ->
                                responder(res, HttpStatus.FORBIDDEN,
                                        "Seu perfil nao tem permissao para esta acao.")))
                .addFilterBefore(filtroJwt, UsernamePasswordAuthenticationFilter.class);

        if (desenvolvimento) {
            // O console do H2 e renderizado em frames, bloqueados por padrao.
            http.headers(h -> h.frameOptions(f -> f.sameOrigin()));
        }

        return http.build();
    }

    private CorsConfigurationSource configuracaoCors() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(origensPermitidas));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
        fonte.registerCorsConfiguration("/api/**", config);
        return fonte;
    }

    /** Mantem o mesmo formato de erro usado pelo TratadorDeErros. */
    private void responder(HttpServletResponse resposta, HttpStatus status, String mensagem)
            throws java.io.IOException {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("momento", LocalDateTime.now().toString());
        corpo.put("status", status.value());
        corpo.put("erro", status.getReasonPhrase());
        corpo.put("mensagem", mensagem);

        resposta.setStatus(status.value());
        resposta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resposta.setCharacterEncoding("UTF-8");
        resposta.getWriter().write(json.writeValueAsString(corpo));
    }
}
