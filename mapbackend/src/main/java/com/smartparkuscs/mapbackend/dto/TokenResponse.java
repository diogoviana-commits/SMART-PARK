package com.smartparkuscs.mapbackend.dto;

import java.time.Instant;

/**
 * Resposta do login (RF02).
 *
 * <p>O cliente guarda o token e o envia nas proximas requisicoes no cabecalho
 * {@code Authorization: Bearer <token>}.</p>
 *
 * @param expiraEm momento em que o token deixa de valer e um novo login e necessario
 */
public record TokenResponse(String token, String tipo, Instant expiraEm, UsuarioResponse usuario) {
}
