package com.smartparkuscs.mapbackend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

/**
 * Corpo aceito ao cadastrar ou atualizar um ponto de interesse.
 * A categoria e informada pelo slug (ex.: "banheiro"), mais legivel que o id.
 */
public record PoiRequest(@NotBlank String nome,
                         String descricao,
                         @NotBlank String categoriaSlug,
                         @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
                         @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
                         LocalTime horarioAbertura,
                         LocalTime horarioFechamento,
                         String statusOperacional,
                         Boolean acessivel,
                         String fotoUrl) {
}
