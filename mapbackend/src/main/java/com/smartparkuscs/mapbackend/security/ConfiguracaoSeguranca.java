package com.smartparkuscs.mapbackend.security;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Quem pode chamar o que (RNF03).
 *
 * <p>A regra geral e: <strong>tudo exige login</strong>, menos o necessario para
 * conseguir entrar - criar conta, entrar, sair e a checagem de saude que o site usa
 * para acordar o servidor. O mapa, os pontos, os eventos e as rotas so respondem a
 * quem esta autenticado. Gestao de pontos, eventos e usuarios exige perfil de
 * administrador.</p>
 *
 * <p>A sessao vai num cookie HttpOnly (ver {@link CookieDeSessao}). Nao ha sessao
 * no servidor: cada requisicao se identifica pelo token dentro do cookie. O CSRF
 * do Spring fica desligado porque a protecao e feita pelo SameSite=Strict do
 * cookie somado a {@link ProtecaoCsrf}, mais simples para um front-end que nao e
 * renderizado pelo servidor.</p>
 */
@Configuration
@EnableMethodSecurity
public class ConfiguracaoSeguranca {

    /**
     * Politica de conteudo do site quando servido por esta API.
     *
     * <p>So scripts do proprio site rodam: um script injetado na pagina (XSS) nao
     * executa. Os mosaicos do mapa vem do OpenStreetMap e as fontes do Google.
     * {@code 'unsafe-inline'} em style-src e exigencia do Leaflet, que posiciona o
     * mapa com estilos inline; estilo nao executa codigo.</p>
     *
     * <p>A mesma politica esta em frontend/vercel.json, para o site publicado na
     * Vercel. Mudou aqui, mude la.</p>
     */
    static final String POLITICA_DE_CONTEUDO = String.join("; ",
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'");

    private final JwtAuthenticationFilter filtroJwt;
    private final RespostaDeErro respostaDeErro;
    private final String[] origensPermitidas;
    private final boolean desenvolvimento;

    public ConfiguracaoSeguranca(JwtAuthenticationFilter filtroJwt,
                                 RespostaDeErro respostaDeErro,
                                 @Value("${smartpark.cors.origens}") String[] origensPermitidas,
                                 Environment ambiente) {
        this.filtroJwt = filtroJwt;
        this.respostaDeErro = respostaDeErro;
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
                        // Console do H2 e documentacao da API: uteis na maquina de quem
                        // desenvolve, mas mapas da aplicacao para quem a ataca. Publicado,
                        // o springdoc fica desligado (ver application-prod.properties).
                        // Precisa vir antes de anyRequest, que encerra a lista de regras.
                        regras.requestMatchers("/h2-console/**").permitAll();
                        regras.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                                .permitAll();
                    }

                    regras
                            // Pagina de erro do proprio Spring. Sem liberar isto, um erro
                            // interno sai como 401 "faca login": o Spring encaminha a
                            // requisicao que falhou para /error, /error cai no
                            // anyRequest().authenticated() e a resposta que chega ao
                            // usuario fala de autenticacao, escondendo o erro de verdade.
                            .requestMatchers("/error").permitAll()

                            // --- publico: os arquivos do site (a tela de entrar) ---
                            // O site em si nao tem dado nenhum: tudo que ele mostra vem
                            // da API, que exige login.
                            .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**",
                                    "/favicon.ico", "/favicon.svg", "/*.png").permitAll()

                            // --- publico: o minimo para conseguir entrar ---
                            .requestMatchers(HttpMethod.GET, "/api/saude").permitAll()
                            .requestMatchers(HttpMethod.POST, "/api/usuarios", "/api/usuarios/login",
                                    "/api/usuarios/sair").permitAll()

                            // --- administracao do parque ---
                            .requestMatchers(HttpMethod.POST, "/api/pois").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.PUT, "/api/pois/*").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.DELETE, "/api/pois/*").hasRole("ADMINISTRADOR")
                            .requestMatchers(HttpMethod.GET, "/api/usuarios").hasRole("ADMINISTRADOR")

                            // --- todo o resto, inclusive ver o mapa: qualquer usuario logado ---
                            .anyRequest().authenticated();
                })
                .exceptionHandling(erros -> erros
                        .authenticationEntryPoint((req, res, e) ->
                                respostaDeErro.escrever(res, 401, "Faca login para usar este recurso."))
                        .accessDeniedHandler((req, res, e) ->
                                respostaDeErro.escrever(res, 403,
                                        "Seu perfil nao tem permissao para esta acao.")))
                .addFilterBefore(filtroJwt, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new ProtecaoCsrf(respostaDeErro), JwtAuthenticationFilter.class)
                .headers(cabecalhos -> {
                    cabecalhos
                            .referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                            // A localizacao so pode ser pedida pelo proprio site; camera e
                            // microfone, que ele nao usa, por ninguem.
                            .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                                    "geolocation=(self), camera=(), microphone=(), payment=()"))
                            .httpStrictTransportSecurity(h -> h.includeSubDomains(true)
                                    .maxAgeInSeconds(31_536_000));
                    if (desenvolvimento) {
                        // O console do H2 e renderizado em frames e usa scripts inline,
                        // o que a politica de conteudo e o frame-options bloqueariam.
                        cabecalhos.frameOptions(f -> f.sameOrigin());
                    } else {
                        cabecalhos.contentSecurityPolicy(csp -> csp.policyDirectives(POLITICA_DE_CONTEUDO));
                    }
                });

        return http.build();
    }

    /**
     * CORS restrito as origens conhecidas e sem credenciais.
     *
     * <p>O site fala com a API pela mesma origem (o proxy da Vercel ou do Vite), entao
     * o cookie de sessao nunca precisa atravessar origens. Sem allowCredentials, o
     * navegador nao anexa o cookie a chamadas de outro dominio, mesmo listado aqui.</p>
     */
    private CorsConfigurationSource configuracaoCors() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(origensPermitidas));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", ProtecaoCsrf.CABECALHO));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
        fonte.registerCorsConfiguration("/api/**", config);
        return fonte;
    }
}
