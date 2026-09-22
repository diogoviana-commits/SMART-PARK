package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.Avaliacao;
import java.time.LocalDateTime;

public record AvaliacaoResponse(Long id,
                                Long poiId,
                                Long usuarioId,
                                String usuarioNome,
                                int nota,
                                String comentario,
                                LocalDateTime dataAvaliacao) {

    public static AvaliacaoResponse de(Avaliacao avaliacao) {
        return new AvaliacaoResponse(
                avaliacao.getId(),
                avaliacao.getPoi().getId(),
                avaliacao.getUsuario().getId(),
                avaliacao.getUsuario().getNome(),
                avaliacao.getNota(),
                avaliacao.getComentario(),
                avaliacao.getDataAvaliacao());
    }
}
