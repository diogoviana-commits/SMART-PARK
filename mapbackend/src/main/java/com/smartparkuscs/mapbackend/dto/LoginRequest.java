package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.NotBlank;

/** Credenciais enviadas na autenticacao (RF02). */
public record LoginRequest(@NotBlank String email, @NotBlank String senha) {
}
