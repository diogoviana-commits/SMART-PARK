package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados do cadastro de um novo usuario (RF01).
 *
 * <p>Nao existe campo de perfil: quem se cadastra e sempre VISITANTE. Se o perfil
 * viesse daqui, qualquer pessoa se tornaria administradora no proprio cadastro.</p>
 */
public record UsuarioRequest(@NotBlank String nome,
                             @NotBlank @Email String email,
                             @NotBlank @Size(min = 8, message = "deve ter ao menos 8 caracteres")
                             String senha) {
}
