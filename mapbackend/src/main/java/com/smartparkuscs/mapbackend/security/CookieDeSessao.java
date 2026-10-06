package com.smartparkuscs.mapbackend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * O cookie que carrega o token de sessao no navegador.
 *
 * <p>Por que cookie e nao localStorage: o que fica no localStorage qualquer script
 * da pagina le, entao uma unica falha de XSS entregaria o token a quem a explorasse.
 * Um cookie {@code HttpOnly} o navegador envia sozinho, mas nenhum JavaScript
 * consegue ler.</p>
 *
 * <ul>
 *   <li>{@code HttpOnly} - invisivel para scripts;</li>
 *   <li>{@code Secure} - so trafega em HTTPS;</li>
 *   <li>{@code SameSite=Strict} - o navegador nao o envia em requisicoes que partem
 *       de outro site, a primeira barreira contra CSRF (a segunda e a
 *       {@link ProtecaoCsrf});</li>
 *   <li>prefixo {@code __Host-} - o navegador so aceita o cookie se ele for Secure,
 *       com Path=/ e sem Domain, o que impede um subdominio de sobrescreve-lo.</li>
 * </ul>
 *
 * <p>Em desenvolvimento, sem HTTPS, o Secure e o prefixo ficam desligados
 * ({@code smartpark.cookie.seguro=false}); o resto vale igual.</p>
 */
@Component
public class CookieDeSessao {

    private final boolean seguro;
    private final String nome;

    public CookieDeSessao(@Value("${smartpark.cookie.seguro:true}") boolean seguro) {
        this.seguro = seguro;
        this.nome = seguro ? "__Host-smartpark_sessao" : "smartpark_sessao";
    }

    public String nome() {
        return nome;
    }

    /** Cabecalho Set-Cookie que guarda o token no navegador. */
    public String criar(String token, long duracaoSegundos) {
        return base(token).maxAge(Duration.ofSeconds(duracaoSegundos)).build().toString();
    }

    /** Cabecalho Set-Cookie que apaga o cookie (validade zero). */
    public String apagar() {
        return base("").maxAge(Duration.ZERO).build().toString();
    }

    /** Token enviado no cookie, ou null se nao houver. */
    public String ler(HttpServletRequest requisicao) {
        Cookie[] cookies = requisicao.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (nome.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie.ResponseCookieBuilder base(String valor) {
        return ResponseCookie.from(nome, valor)
                .httpOnly(true)
                .secure(seguro)
                .sameSite("Strict")
                .path("/");
    }
}
