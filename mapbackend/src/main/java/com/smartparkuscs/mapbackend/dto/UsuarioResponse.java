package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.Usuario;
import java.time.LocalDateTime;

/**
 * Usuario devolvido pela API. Nao expoe a senha nem o hash dela.
 */
public record UsuarioResponse(Long id,
                              String nome,
                              String email,
                              String perfil,
                              LocalDateTime dataCadastro,
                              LocalDateTime ultimoAcesso) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(),
                usuario.getPerfil().name(), usuario.getDataCadastro(), usuario.getUltimoAcesso());
    }
}
