package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciais enviadas na autenticacao (RF02).
 *
 * <p>O teto de tamanho evita que alguem mande senhas de megabytes so para ocupar o
 * servidor; nenhuma senha cadastrada passa de 72 caracteres (PoliticaDeSenha).</p>
 */
public record LoginRequest(@NotBlank @Size(max = 160) String email,
                           @NotBlank @Size(max = 128) String senha) {
}
