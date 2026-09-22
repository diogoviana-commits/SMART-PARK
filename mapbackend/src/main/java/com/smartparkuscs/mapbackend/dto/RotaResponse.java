package com.smartparkuscs.mapbackend.dto;

import java.util.List;

/**
 * Resultado do calculo de rota a pe ate um ponto de interesse (RF05).
 *
 * @param pontos sequencia origem -> destino que o front-end desenha como linha no mapa
 */
public record RotaResponse(PoiResponse destino,
                           double distanciaMetros,
                           int duracaoMinutos,
                           List<Coordenada> pontos) {

    public record Coordenada(double latitude, double longitude) {
    }
}
