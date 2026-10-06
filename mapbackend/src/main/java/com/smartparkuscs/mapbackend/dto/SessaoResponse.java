package com.smartparkuscs.mapbackend.dto;

import java.time.Instant;

/**
 * Resposta do login (RF02).
 *
 * <p>O token nao vem aqui: ele vai no cookie HttpOnly da resposta, que o JavaScript
 * do site nao consegue ler (ver CookieDeSessao). O corpo traz so o que a tela usa.</p>
 *
 * @param expiraEm momento em que a sessao termina e um novo login e necessario
 */
public record SessaoResponse(Instant expiraEm, UsuarioResponse usuario) {
}
