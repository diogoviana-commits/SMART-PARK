package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados do cadastro de um novo usuario (RF01).
 *
 * <p>Nao existe campo de perfil: quem se cadastra e sempre VISITANTE. Se o perfil
 * viesse daqui, qualquer pessoa se tornaria administradora no proprio cadastro.</p>
 *
 * <p>Os limites de tamanho batem com as colunas do banco: sem eles um nome longo
 * demais estouraria no INSERT como erro 500, em vez de voltar como 400 explicado.
 * As demais regras da senha ficam na PoliticaDeSenha.</p>
 */
public record UsuarioRequest(@NotBlank @Size(max = 120, message = "pode ter no maximo 120 caracteres")
                             String nome,
                             @NotBlank @Email @Size(max = 160, message = "pode ter no maximo 160 caracteres")
                             String email,
                             @NotBlank @Size(min = 8, max = 72, message = "deve ter entre 8 e 72 caracteres")
                             String senha) {
}
