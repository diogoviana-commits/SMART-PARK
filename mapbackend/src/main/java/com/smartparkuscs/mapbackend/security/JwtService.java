package com.smartparkuscs.mapbackend.security;

import com.smartparkuscs.mapbackend.config.Ambientes;
import com.smartparkuscs.mapbackend.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/**
 * Emissao e validacao dos tokens JWT (RF02).
 *
 * <p>O token e assinado com HMAC-SHA256. A assinatura e o que impede alguem de
 * trocar o perfil dentro do token: qualquer alteracao no conteudo invalida a
 * assinatura e o token e recusado.</p>
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    /** Segredo usado quando nenhum outro e informado. Serve apenas para desenvolvimento. */
    static final String SEGREDO_PADRAO_DEV =
            "segredo-de-desenvolvimento-do-smart-park-troque-em-producao-1234567890";

    private final String segredo;
    private final long duracaoMinutos;
    private final Environment ambiente;
    private SecretKey chave;

    public JwtService(@Value("${smartpark.jwt.segredo:}") String segredo,
                      @Value("${smartpark.jwt.duracao-minutos:120}") long duracaoMinutos,
                      Environment ambiente) {
        this.segredo = (segredo == null || segredo.isBlank()) ? SEGREDO_PADRAO_DEV : segredo;
        this.duracaoMinutos = duracaoMinutos;
        this.ambiente = ambiente;
    }

    @PostConstruct
    void prepararChave() {
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "O segredo do JWT precisa de ao menos 32 caracteres. Ajuste smartpark.jwt.segredo.");
        }
        this.chave = Keys.hmacShaKeyFor(bytes);

        // Vale para todo perfil publicado, nao so prod: ver Ambientes.
        boolean exposto = Ambientes.exposto(ambiente);
        if (exposto && SEGREDO_PADRAO_DEV.equals(segredo)) {
            // Com o segredo publico qualquer pessoa forjaria um token de administrador.
            throw new IllegalStateException("""
                    Este perfil esta usando o segredo de desenvolvimento do JWT.
                    Defina a variavel de ambiente SMARTPARK_JWT_SECRET com um valor secreto
                    de pelo menos 32 caracteres antes de subir a aplicacao.""");
        }
        if (SEGREDO_PADRAO_DEV.equals(segredo)) {
            log.warn("JWT assinado com o segredo padrao de desenvolvimento. "
                    + "Defina SMARTPARK_JWT_SECRET antes de publicar.");
        }
    }

    /** Momento em que o token emitido agora deixa de valer. */
    public Instant expiracao() {
        return Instant.now().plus(duracaoMinutos, ChronoUnit.MINUTES);
    }

    public String gerar(Usuario usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("uid", usuario.getId())
                .claim("perfil", usuario.getPerfil().name())
                .claim("nome", usuario.getNome())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(duracaoMinutos, ChronoUnit.MINUTES)))
                .signWith(chave)
                .compact();
    }

    /**
     * Le o token e devolve o e-mail de quem o token identifica.
     *
     * @return null quando o token e invalido, expirado ou foi adulterado
     */
    public String emailDoToken(String token) {
        try {
            Claims dados = Jwts.parser().verifyWith(chave).build()
                    .parseSignedClaims(token).getPayload();
            return dados.getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token recusado: {}", e.getMessage());
            return null;
        }
    }
}
