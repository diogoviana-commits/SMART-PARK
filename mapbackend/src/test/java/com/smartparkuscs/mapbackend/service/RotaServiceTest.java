package com.smartparkuscs.mapbackend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartparkuscs.mapbackend.dto.RotaResponse;
import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;

class RotaServiceTest {

    private final RotaService servico = new RotaService();

    /** Portao da Av. Goias e banheiro do lado leste: atravessam o parque. */
    private static final double PORTAO_LAT = -23.631338;
    private static final double PORTAO_LON = -46.573411;
    private static final double BANHEIRO_LAT = -23.632080;
    private static final double BANHEIRO_LON = -46.570970;

    @Test
    void distanciaEntreOMesmoPontoEZero() {
        assertThat(servico.distanciaEmMetros(-23.6404, -46.5622, -23.6404, -46.5622)).isZero();
    }

    @Test
    void distanciaConfereComValorConhecido() {
        // Um grau de latitude equivale a aproximadamente 111,2 km.
        double distancia = servico.distanciaEmMetros(-23.0, -46.5622, -24.0, -46.5622);
        assertThat(distancia).isCloseTo(111_195d, Offset.offset(500d));
    }

    @Test
    void rotaSegueOsCaminhosEmVezDaLinhaReta() {
        RotaResponse rota = servico.calcular(PORTAO_LAT, PORTAO_LON, poiEm(BANHEIRO_LAT, BANHEIRO_LON));
        double linhaReta = servico.distanciaEmMetros(PORTAO_LAT, PORTAO_LON, BANHEIRO_LAT, BANHEIRO_LON);

        // Com curvas no caminho a linha tem bem mais que dois pontos, e fica mais
        // longa que a reta - mas nao absurdamente, ou estaria dando a volta no quarteirao.
        assertThat(rota.pontos().size()).isGreaterThan(4);
        assertThat(rota.distanciaMetros()).isGreaterThanOrEqualTo(linhaReta);
        assertThat(rota.distanciaMetros()).isLessThan(linhaReta * 2);
        assertThat(rota.foraDosCaminhos()).isFalse();
    }

    @Test
    void rotaComecaNoVisitanteETerminaNoPonto() {
        RotaResponse rota = servico.calcular(PORTAO_LAT, PORTAO_LON, poiEm(BANHEIRO_LAT, BANHEIRO_LON));

        assertThat(rota.pontos().get(0).latitude()).isEqualTo(PORTAO_LAT);
        assertThat(rota.pontos().get(0).longitude()).isEqualTo(PORTAO_LON);
        RotaResponse.Coordenada ultimo = rota.pontos().get(rota.pontos().size() - 1);
        assertThat(ultimo.latitude()).isEqualTo(BANHEIRO_LAT);
        assertThat(ultimo.longitude()).isEqualTo(BANHEIRO_LON);
        assertThat(rota.destino().nome()).isEqualTo("Pista de Corrida");
    }

    @Test
    void tempoEstimadoCorrespondeACaminhadaDe5KmPorHora() {
        RotaResponse rota = servico.calcular(PORTAO_LAT, PORTAO_LON, poiEm(BANHEIRO_LAT, BANHEIRO_LON));

        double esperado = Math.ceil(rota.distanciaMetros() / (5000d / 60d));
        assertThat(rota.duracaoMinutos()).isEqualTo((int) esperado);
    }

    @Test
    void evitarEscadasNuncaEncurtaARota() {
        PontoInteresse destino = poiEm(BANHEIRO_LAT, BANHEIRO_LON);

        RotaResponse normal = servico.calcular(PORTAO_LAT, PORTAO_LON, destino, false);
        RotaResponse semEscadas = servico.calcular(PORTAO_LAT, PORTAO_LON, destino, true);

        assertThat(semEscadas.distanciaMetros()).isGreaterThanOrEqualTo(normal.distanciaMetros() - 1);
    }

    @Test
    void visitanteLongeDoParqueRecebeAviso() {
        // Centro de Sao Paulo, a uns 15 km do parque.
        RotaResponse rota = servico.calcular(-23.5505, -46.6333, poiEm(BANHEIRO_LAT, BANHEIRO_LON));

        assertThat(rota.foraDosCaminhos()).isTrue();
        assertThat(rota.distanciaMetros()).isGreaterThan(10_000d);
    }

    @Test
    void duracaoNuncaEZeroParaDestinoMuitoProximo() {
        RotaResponse rota = servico.calcular(BANHEIRO_LAT, BANHEIRO_LON,
                poiEm(BANHEIRO_LAT + 0.00001, BANHEIRO_LON));

        assertThat(rota.duracaoMinutos()).isEqualTo(1);
    }

    @Test
    void coordenadaInvalidaERecusada() {
        PontoInteresse destino = poiEm(BANHEIRO_LAT, BANHEIRO_LON);

        assertThatThrownBy(() -> servico.calcular(Double.NaN, -46.57, destino))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> servico.calcular(-123, -46.57, destino))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> servico.calcular(-23.6, 200, destino))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private PontoInteresse poiEm(double lat, double lon) {
        CategoriaPoi categoria = new CategoriaPoi("esporte", "Esporte", "sports", "#16a34a");
        return new PontoInteresse("Pista de Corrida", "Circuito de caminhada", categoria, lat, lon);
    }
}
