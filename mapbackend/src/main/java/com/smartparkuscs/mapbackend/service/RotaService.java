package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.PoiResponse;
import com.smartparkuscs.mapbackend.dto.RotaResponse;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Calculo de rota a pe entre a posicao do visitante e um ponto de interesse (RF05).
 *
 * <p>Nesta versao a rota e a linha reta entre os dois pontos, com a distancia calculada
 * pela formula de Haversine. O parque tem caminhos curtos e bem conectados, entao a linha
 * reta ja da uma estimativa util; trocar por um servico de roteamento (OSRM, GraphHopper)
 * significa reimplementar apenas este servico.</p>
 */
@Service
public class RotaService {

    private static final double RAIO_TERRA_METROS = 6_371_000d;

    /** Velocidade media de caminhada adotada: 5 km/h, o padrao usado por apps de rota a pe. */
    private static final double VELOCIDADE_CAMINHADA_M_POR_MIN = 5_000d / 60d;

    /**
     * Distancia sobre a superficie da Terra entre dois pares de coordenadas, em metros.
     */
    public double distanciaEmMetros(double latOrigem, double lonOrigem, double latDestino, double lonDestino) {
        double dLat = Math.toRadians(latDestino - latOrigem);
        double dLon = Math.toRadians(lonDestino - lonOrigem);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(latOrigem)) * Math.cos(Math.toRadians(latDestino))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return RAIO_TERRA_METROS * c;
    }

    /**
     * Monta a rota a pe da posicao informada ate o ponto de interesse.
     */
    public RotaResponse calcular(double latOrigem, double lonOrigem, PontoInteresse destino) {
        double distancia = distanciaEmMetros(latOrigem, lonOrigem, destino.getLatitude(), destino.getLongitude());
        int minutos = (int) Math.max(1, Math.ceil(distancia / VELOCIDADE_CAMINHADA_M_POR_MIN));
        List<RotaResponse.Coordenada> pontos = List.of(
                new RotaResponse.Coordenada(latOrigem, lonOrigem),
                new RotaResponse.Coordenada(destino.getLatitude(), destino.getLongitude()));
        return new RotaResponse(PoiResponse.de(destino), Math.round(distancia * 10d) / 10d, minutos, pontos);
    }
}
