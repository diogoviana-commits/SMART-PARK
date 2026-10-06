package com.smartparkuscs.mapbackend.dto;

import java.util.List;

/**
 * Resultado do calculo de rota a pe ate um ponto de interesse (RF05).
 *
 * @param pontos          trajeto pelos caminhos do parque, da origem ao destino, que o
 *                        front-end desenha como linha no mapa
 * @param foraDosCaminhos true quando a origem fica longe de qualquer caminho mapeado: o
 *                        trecho ate o primeiro caminho e uma linha reta, so indicativa
 */
public record RotaResponse(PoiResponse destino,
                           double distanciaMetros,
                           int duracaoMinutos,
                           List<Coordenada> pontos,
                           boolean foraDosCaminhos) {

    public record Coordenada(double latitude, double longitude) {
    }
}
