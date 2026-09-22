package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Avaliacao enviada pelo visitante (RF11).
 *
 * <p>Nao recebe o id do usuario: quem avaliou e sempre o dono do token. Se viesse no
 * corpo, daria para avaliar em nome de outra pessoa.</p>
 */
public record AvaliacaoRequest(@NotNull @Min(1) @Max(5) Integer nota, String comentario) {
}
