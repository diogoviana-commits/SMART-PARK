package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.Evento;
import java.time.LocalDateTime;

public record EventoResponse(Long id,
                             String nome,
                             String descricao,
                             LocalDateTime dataHoraInicio,
                             LocalDateTime dataHoraFim,
                             String local,
                             Long poiId,
                             Double latitude,
                             Double longitude,
                             String linkMaisInfo) {

    public static EventoResponse de(Evento evento) {
        var poi = evento.getLocal();
        String local = poi != null ? poi.getNome() : evento.getLocalDescritivo();
        return new EventoResponse(
                evento.getId(),
                evento.getNome(),
                evento.getDescricao(),
                evento.getDataHoraInicio(),
                evento.getDataHoraFim(),
                local,
                poi != null ? poi.getId() : null,
                poi != null ? poi.getLatitude() : null,
                poi != null ? poi.getLongitude() : null,
                evento.getLinkMaisInfo());
    }
}
