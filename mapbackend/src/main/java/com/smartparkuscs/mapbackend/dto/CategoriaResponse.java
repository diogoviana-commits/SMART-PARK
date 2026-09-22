package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.CategoriaPoi;

public record CategoriaResponse(Long id, String slug, String nome, String icone, String cor) {

    public static CategoriaResponse de(CategoriaPoi categoria) {
        return new CategoriaResponse(categoria.getId(), categoria.getSlug(), categoria.getNome(),
                categoria.getIcone(), categoria.getCor());
    }
}
