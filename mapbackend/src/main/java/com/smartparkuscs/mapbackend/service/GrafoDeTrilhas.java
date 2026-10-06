package com.smartparkuscs.mapbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.PriorityQueue;

/**
 * Rede de caminhos a pe do parque e das ruas em volta, com o menor trajeto entre
 * dois pontos quaisquer (RF05).
 *
 * <p>Os dados vem do OpenStreetMap, ja convertidos para nos e trechos pelo script
 * {@code scripts/gerar-trilhas.py}. Ficam todos na memoria: sao poucos milhares de
 * trechos, e o calculo de uma rota leva milissegundos.</p>
 *
 * <p>A classe e imutavel depois de carregada, entao pode atender varias requisicoes
 * ao mesmo tempo sem sincronizacao.</p>
 */
public final class GrafoDeTrilhas {

    private static final double RAIO_TERRA_METROS = 6_371_000d;

    /** Tipos de trecho, na ordem gravada pelo script. */
    private static final int CAMINHO = 0;
    private static final int RUA = 1;
    private static final int ESCADA = 2;

    /**
     * Quanto cada tipo de trecho "custa" a mais que a distancia real. Serve para a
     * rota preferir as trilhas do parque a calcada da avenida quando a diferenca de
     * distancia e pequena. A distancia exibida ao visitante continua sendo a real.
     */
    private static final double[] PESO = {1.0, 1.3, 1.5};

    private final double[] lat;
    private final double[] lon;
    private final int[] origemDoTrecho;
    private final int[] destinoDoTrecho;
    private final int[] tipoDoTrecho;
    private final double[] comprimento;
    /** Para cada no, os indices dos trechos que saem dele. */
    private final int[][] trechosDoNo;

    /** Ponto da rede mais proximo de uma posicao qualquer. */
    record Encaixe(int trecho, double fracao, double latitude, double longitude, double distancia) {
    }

    /**
     * Trajeto encontrado.
     *
     * @param pontos         do ponto de partida ao de chegada, ja sobre os caminhos
     * @param inicio         onde a rota entra na rede de caminhos
     * @param fim            onde a rota sai da rede de caminhos
     */
    record Trajeto(List<double[]> pontos, Encaixe inicio, Encaixe fim) {
    }

    private GrafoDeTrilhas(double[] lat, double[] lon, int[] origem, int[] destino, int[] tipo) {
        this.lat = lat;
        this.lon = lon;
        this.origemDoTrecho = origem;
        this.destinoDoTrecho = destino;
        this.tipoDoTrecho = tipo;
        this.comprimento = new double[origem.length];

        int[] grau = new int[lat.length];
        for (int t = 0; t < origem.length; t++) {
            comprimento[t] = distancia(lat[origem[t]], lon[origem[t]], lat[destino[t]], lon[destino[t]]);
            grau[origem[t]]++;
            grau[destino[t]]++;
        }
        this.trechosDoNo = new int[lat.length][];
        for (int n = 0; n < lat.length; n++) {
            trechosDoNo[n] = new int[grau[n]];
        }
        int[] preenchido = new int[lat.length];
        for (int t = 0; t < origem.length; t++) {
            trechosDoNo[origem[t]][preenchido[origem[t]]++] = t;
            trechosDoNo[destino[t]][preenchido[destino[t]]++] = t;
        }
    }

    /** Le o arquivo gerado por {@code scripts/gerar-trilhas.py}. */
    public static GrafoDeTrilhas carregar(InputStream entrada) {
        try {
            JsonNode raiz = new ObjectMapper().readTree(entrada);
            JsonNode nos = raiz.get("nos");
            JsonNode arestas = raiz.get("arestas");

            double[] lat = new double[nos.size()];
            double[] lon = new double[nos.size()];
            for (int i = 0; i < nos.size(); i++) {
                lat[i] = nos.get(i).get(0).asDouble();
                lon[i] = nos.get(i).get(1).asDouble();
            }

            int[] origem = new int[arestas.size()];
            int[] destino = new int[arestas.size()];
            int[] tipo = new int[arestas.size()];
            for (int i = 0; i < arestas.size(); i++) {
                origem[i] = arestas.get(i).get(0).asInt();
                destino[i] = arestas.get(i).get(1).asInt();
                tipo[i] = arestas.get(i).get(2).asInt();
            }
            return new GrafoDeTrilhas(lat, lon, origem, destino, tipo);
        } catch (IOException e) {
            throw new UncheckedIOException("Nao foi possivel ler o grafo de trilhas.", e);
        }
    }

    public int quantidadeDeNos() {
        return lat.length;
    }

    /**
     * Menor trajeto a pe entre duas posicoes.
     *
     * @param evitarEscadas para quem usa cadeira de rodas ou carrinho de bebe
     * @return null quando nao existe caminho (so acontece evitando escadas, se a
     *         unica ligacao entre os dois lados for uma escada)
     */
    Trajeto menorCaminho(double latOrigem, double lonOrigem, double latDestino, double lonDestino,
                         boolean evitarEscadas) {
        Encaixe inicio = encaixar(latOrigem, lonOrigem, evitarEscadas);
        Encaixe fim = encaixar(latDestino, lonDestino, evitarEscadas);
        if (inicio == null || fim == null) {
            return null;
        }

        double[] custo = new double[lat.length];
        int[] anterior = new int[lat.length];
        Arrays.fill(custo, Double.POSITIVE_INFINITY);
        Arrays.fill(anterior, -1);

        // Os dois pontos no mesmo trecho: andar direto por ele pode ser o melhor.
        double melhor = Double.POSITIVE_INFINITY;
        int chegada = -1;
        if (inicio.trecho() == fim.trecho()) {
            melhor = Math.abs(inicio.fracao() - fim.fracao()) * custoDoTrecho(inicio.trecho());
        }

        // A partida fica no meio de um trecho: as duas pontas dele sao o comeco.
        PriorityQueue<double[]> fila = new PriorityQueue<>((x, y) -> Double.compare(x[0], y[0]));
        semear(fila, custo, origemDoTrecho[inicio.trecho()], inicio.fracao() * custoDoTrecho(inicio.trecho()));
        semear(fila, custo, destinoDoTrecho[inicio.trecho()],
                (1 - inicio.fracao()) * custoDoTrecho(inicio.trecho()));

        int pontaA = origemDoTrecho[fim.trecho()];
        int pontaB = destinoDoTrecho[fim.trecho()];

        while (!fila.isEmpty()) {
            double[] item = fila.poll();
            double custoAtual = item[0];
            int no = (int) item[1];
            if (custoAtual > custo[no]) {
                continue; // entrada velha da fila: o no ja foi alcancado por um caminho melhor
            }
            if (custoAtual >= melhor) {
                break; // nada que ainda esta na fila pode melhorar a rota encontrada
            }

            if (no == pontaA) {
                double total = custoAtual + fim.fracao() * custoDoTrecho(fim.trecho());
                if (total < melhor) {
                    melhor = total;
                    chegada = no;
                }
            }
            if (no == pontaB) {
                double total = custoAtual + (1 - fim.fracao()) * custoDoTrecho(fim.trecho());
                if (total < melhor) {
                    melhor = total;
                    chegada = no;
                }
            }

            for (int trecho : trechosDoNo[no]) {
                if (evitarEscadas && tipoDoTrecho[trecho] == ESCADA) {
                    continue;
                }
                int vizinho = origemDoTrecho[trecho] == no ? destinoDoTrecho[trecho] : origemDoTrecho[trecho];
                double novo = custoAtual + custoDoTrecho(trecho);
                if (novo < custo[vizinho]) {
                    custo[vizinho] = novo;
                    anterior[vizinho] = no;
                    fila.add(new double[] {novo, vizinho});
                }
            }
        }

        if (Double.isInfinite(melhor)) {
            return null;
        }

        List<double[]> pontos = new ArrayList<>();
        pontos.add(new double[] {inicio.latitude(), inicio.longitude()});
        if (chegada >= 0) {
            List<double[]> meio = new ArrayList<>();
            for (int no = chegada; no >= 0; no = anterior[no]) {
                meio.add(new double[] {lat[no], lon[no]});
            }
            Collections.reverse(meio);
            pontos.addAll(meio);
        }
        pontos.add(new double[] {fim.latitude(), fim.longitude()});
        return new Trajeto(pontos, inicio, fim);
    }

    private static void semear(PriorityQueue<double[]> fila, double[] custo, int no, double valor) {
        if (valor < custo[no]) {
            custo[no] = valor;
            fila.add(new double[] {valor, no});
        }
    }

    private double custoDoTrecho(int trecho) {
        return comprimento[trecho] * PESO[tipoDoTrecho[trecho]];
    }

    /**
     * Projeta a posicao sobre o trecho mais proximo.
     *
     * <p>Usa uma projecao plana local (equiretangular): numa area do tamanho de um
     * parque o erro e de centimetros, e a conta fica muito mais simples.</p>
     */
    Encaixe encaixar(double latitude, double longitude, boolean evitarEscadas) {
        double escalaX = Math.cos(Math.toRadians(latitude)) * Math.toRadians(1) * RAIO_TERRA_METROS;
        double escalaY = Math.toRadians(1) * RAIO_TERRA_METROS;

        Encaixe melhor = null;
        double menorDistancia2 = Double.POSITIVE_INFINITY;
        for (int t = 0; t < origemDoTrecho.length; t++) {
            if (evitarEscadas && tipoDoTrecho[t] == ESCADA) {
                continue;
            }
            int a = origemDoTrecho[t];
            int b = destinoDoTrecho[t];
            double ax = (lon[a] - longitude) * escalaX;
            double ay = (lat[a] - latitude) * escalaY;
            double bx = (lon[b] - longitude) * escalaX;
            double by = (lat[b] - latitude) * escalaY;
            double dx = bx - ax;
            double dy = by - ay;
            double tamanho2 = dx * dx + dy * dy;
            // Posicao relativa da projecao no trecho, presa entre as duas pontas.
            double fracao = tamanho2 == 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tamanho2));
            double px = ax + fracao * dx;
            double py = ay + fracao * dy;
            double distancia2 = px * px + py * py;
            if (distancia2 < menorDistancia2) {
                menorDistancia2 = distancia2;
                melhor = new Encaixe(t, fracao,
                        lat[a] + fracao * (lat[b] - lat[a]),
                        lon[a] + fracao * (lon[b] - lon[a]),
                        Math.sqrt(distancia2));
            }
        }
        return melhor;
    }

    /** Distancia sobre a superficie da Terra (Haversine), em metros. */
    static double distancia(double latOrigem, double lonOrigem, double latDestino, double lonDestino) {
        double dLat = Math.toRadians(latDestino - latOrigem);
        double dLon = Math.toRadians(lonDestino - lonOrigem);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(latOrigem)) * Math.cos(Math.toRadians(latDestino))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return RAIO_TERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
