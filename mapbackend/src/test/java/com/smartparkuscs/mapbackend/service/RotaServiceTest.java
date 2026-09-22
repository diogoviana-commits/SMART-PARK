package com.smartparkuscs.mapbackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartparkuscs.mapbackend.dto.RotaResponse;
import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import org.junit.jupiter.api.Test;

class RotaServiceTest {

    private final RotaService servico = new RotaService();

    @Test
    void distanciaEntreOMesmoPontoEZero() {
        assertThat(servico.distanciaEmMetros(-23.6404, -46.5622, -23.6404, -46.5622)).isZero();
    }

    @Test
    void distanciaConfereComValorConhecido() {
        // Um grau de latitude equivale a aproximadamente 111,2 km.
        double distancia = servico.distanciaEmMetros(-23.0, -46.5622, -24.0, -46.5622);
        assertThat(distancia).isCloseTo(111_195d, org.assertj.core.data.Offset.offset(500d));
    }

    @Test
    void rotaTrazDistanciaTempoEOsDoisPontosDaLinha() {
        PontoInteresse destino = poiEm(-23.6404, -46.5614);

        RotaResponse rota = servico.calcular(-23.6395, -46.5633, destino);

        assertThat(rota.distanciaMetros()).isBetween(150d, 350d);
        assertThat(rota.duracaoMinutos()).isBetween(1, 6);
        assertThat(rota.pontos()).hasSize(2);
        assertThat(rota.pontos().get(0).latitude()).isEqualTo(-23.6395);
        assertThat(rota.pontos().get(1).longitude()).isEqualTo(-46.5614);
        assertThat(rota.destino().nome()).isEqualTo("Pista de Corrida");
    }

    @Test
    void duracaoNuncaEZeroParaDestinoMuitoProximo() {
        PontoInteresse destino = poiEm(-23.64041, -46.56221);

        RotaResponse rota = servico.calcular(-23.6404, -46.5622, destino);

        assertThat(rota.duracaoMinutos()).isEqualTo(1);
    }

    private PontoInteresse poiEm(double lat, double lon) {
        CategoriaPoi categoria = new CategoriaPoi("esporte", "Esporte", "sports", "#16a34a");
        return new PontoInteresse("Pista de Corrida", "Circuito de caminhada", categoria, lat, lon);
    }
}
