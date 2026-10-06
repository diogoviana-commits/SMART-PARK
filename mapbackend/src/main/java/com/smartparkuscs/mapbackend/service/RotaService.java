package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.PoiResponse;
import com.smartparkuscs.mapbackend.dto.RotaResponse;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Calculo de rota a pe entre a posicao do visitante e um ponto de interesse (RF05).
 *
 * <p>A rota segue as trilhas, calcadas e ruas mapeadas no OpenStreetMap (ver
 * {@link GrafoDeTrilhas}), e nao a linha reta: a linha reta atravessava canteiros,
 * lagos e muros, e o tempo estimado saia menor que o real.</p>
 */
@Service
public class RotaService {

    static final String ARQUIVO_TRILHAS = "/trilhas/chico-mendes.json";

    /** Velocidade media de caminhada adotada: 5 km/h, o padrao usado por apps de rota a pe. */
    private static final double VELOCIDADE_CAMINHADA_M_POR_MIN = 5_000d / 60d;

    /**
     * A partir desta distancia ate o caminho mais proximo, o visitante esta fora da
     * area mapeada: o trecho ate la sai em linha reta, e a tela avisa.
     */
    private static final double LIMITE_FORA_DOS_CAMINHOS_METROS = 150d;

    /** Ligacoes mais curtas que isto entre a posicao e o caminho nao viram um ponto a mais. */
    private static final double PONTO_REPETIDO_METROS = 1d;

    private final GrafoDeTrilhas grafo;

    public RotaService() {
        try (InputStream entrada = RotaService.class.getResourceAsStream(ARQUIVO_TRILHAS)) {
            if (entrada == null) {
                throw new IllegalStateException("Arquivo de trilhas nao encontrado: " + ARQUIVO_TRILHAS
                        + ". Gere com: python scripts/gerar-trilhas.py");
            }
            this.grafo = GrafoDeTrilhas.carregar(entrada);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Distancia sobre a superficie da Terra entre dois pares de coordenadas, em metros.
     */
    public double distanciaEmMetros(double latOrigem, double lonOrigem, double latDestino, double lonDestino) {
        return GrafoDeTrilhas.distancia(latOrigem, lonOrigem, latDestino, lonDestino);
    }

    public RotaResponse calcular(double latOrigem, double lonOrigem, PontoInteresse destino) {
        return calcular(latOrigem, lonOrigem, destino, false);
    }

    /**
     * Monta a rota a pe da posicao informada ate o ponto de interesse.
     *
     * @param evitarEscadas desvia das escadas, para quem anda de cadeira de rodas
     */
    public RotaResponse calcular(double latOrigem, double lonOrigem, PontoInteresse destino,
                                 boolean evitarEscadas) {
        validarCoordenada(latOrigem, lonOrigem);

        List<double[]> pontos = new ArrayList<>();
        pontos.add(new double[] {latOrigem, lonOrigem});

        GrafoDeTrilhas.Trajeto trajeto = grafo.menorCaminho(latOrigem, lonOrigem,
                destino.getLatitude(), destino.getLongitude(), evitarEscadas);
        boolean foraDosCaminhos = trajeto == null
                || trajeto.inicio().distancia() > LIMITE_FORA_DOS_CAMINHOS_METROS;
        if (trajeto != null) {
            pontos.addAll(trajeto.pontos());
        }
        pontos.add(new double[] {destino.getLatitude(), destino.getLongitude()});

        List<RotaResponse.Coordenada> linha = semRepetidos(pontos);
        double distancia = 0;
        for (int i = 1; i < linha.size(); i++) {
            distancia += distanciaEmMetros(linha.get(i - 1).latitude(), linha.get(i - 1).longitude(),
                    linha.get(i).latitude(), linha.get(i).longitude());
        }
        int minutos = (int) Math.max(1, Math.ceil(distancia / VELOCIDADE_CAMINHADA_M_POR_MIN));

        return new RotaResponse(PoiResponse.de(destino), Math.round(distancia * 10d) / 10d, minutos,
                linha, foraDosCaminhos);
    }

    private List<RotaResponse.Coordenada> semRepetidos(List<double[]> pontos) {
        List<RotaResponse.Coordenada> linha = new ArrayList<>();
        double[] ultimo = null;
        for (int i = 0; i < pontos.size(); i++) {
            double[] ponto = pontos.get(i);
            boolean extremo = i == 0 || i == pontos.size() - 1;
            if (ultimo != null && !extremo
                    && distanciaEmMetros(ultimo[0], ultimo[1], ponto[0], ponto[1]) < PONTO_REPETIDO_METROS) {
                continue;
            }
            linha.add(new RotaResponse.Coordenada(ponto[0], ponto[1]));
            ultimo = ponto;
        }
        return linha;
    }

    /** NaN ou coordenada fora do globo indicam requisicao montada errado, nao uma posicao. */
    private static void validarCoordenada(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Coordenadas de origem invalidas.");
        }
    }
}
