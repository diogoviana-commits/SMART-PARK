package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.PontoInteresse;
import java.time.LocalTime;

/**
 * Conteudo do card informativo do ponto de interesse (RF07), incluindo o resumo
 * das avaliacoes recebidas (RF11).
 *
 * @param notaMedia media de estrelas, ou null quando o ponto ainda nao foi avaliado
 */
public record PoiResponse(Long id,
                          String nome,
                          String descricao,
                          CategoriaResponse categoria,
                          double latitude,
                          double longitude,
                          LocalTime horarioAbertura,
                          LocalTime horarioFechamento,
                          String statusOperacional,
                          boolean acessivel,
                          String fotoUrl,
                          Double notaMedia,
                          long totalAvaliacoes) {

    /** Versao sem o resumo de avaliacoes, para quando ele nao foi consultado. */
    public static PoiResponse de(PontoInteresse poi) {
        return de(poi, null, 0);
    }

    public static PoiResponse de(PontoInteresse poi, Double notaMedia, long totalAvaliacoes) {
        return new PoiResponse(
                poi.getId(),
                poi.getNome(),
                poi.getDescricao(),
                CategoriaResponse.de(poi.getCategoria()),
                poi.getLatitude(),
                poi.getLongitude(),
                poi.getHorarioAbertura(),
                poi.getHorarioFechamento(),
                poi.getStatusOperacional().name(),
                poi.isAcessivel(),
                poi.getFotoUrl(),
                notaMedia,
                totalAvaliacoes);
    }
}
