package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Avanco registrado em uma missao (RF10): quilometros caminhados, visitas ou
 * participacoes em eventos, conforme o tipo da missao.
 *
 * <p>Assim como na avaliacao, o usuario vem do token, nao do corpo da requisicao.</p>
 */
public record ProgressoRequest(@NotNull @Positive Double quantidade) {
}
