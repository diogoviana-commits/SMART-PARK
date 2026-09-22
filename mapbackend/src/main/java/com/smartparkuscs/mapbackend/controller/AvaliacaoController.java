package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.dto.AvaliacaoRequest;
import com.smartparkuscs.mapbackend.dto.AvaliacaoResponse;
import com.smartparkuscs.mapbackend.security.UsuarioAutenticado;
import com.smartparkuscs.mapbackend.service.AvaliacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Avaliacoes e comentarios dos pontos de interesse (RF11).
 */
@RestController
@RequestMapping("/api/pois/{poiId}/avaliacoes")
@Tag(name = "Avaliacoes", description = "Notas e comentarios dos visitantes sobre os pontos (RF11)")
public class AvaliacaoController {

    private final AvaliacaoService service;

    public AvaliacaoController(AvaliacaoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista as avaliacoes de um ponto, da mais recente para a mais antiga")
    public List<AvaliacaoResponse> listar(@PathVariable Long poiId) {
        return service.listarDoPoi(poiId).stream().map(AvaliacaoResponse::de).toList();
    }

    @PostMapping
    @Operation(summary = "Avalia o ponto de 1 a 5 estrelas (exige login)",
            description = "A avaliacao fica no nome de quem esta logado; avaliar de novo substitui a nota.")
    @SecurityRequirement(name = "bearer")
    public ResponseEntity<AvaliacaoResponse> avaliar(@PathVariable Long poiId,
                                                     @AuthenticationPrincipal UsuarioAutenticado autenticado,
                                                     @RequestBody @Valid AvaliacaoRequest request) {
        var avaliacao = service.avaliar(poiId, autenticado.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(AvaliacaoResponse.de(avaliacao));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Remove uma avaliacao",
            description = "Cada pessoa remove apenas a propria avaliacao; administradores removem qualquer uma.")
    public ResponseEntity<Void> remover(@PathVariable Long poiId, @PathVariable Long id,
                                        @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        boolean administrador = autenticado.getAuthorities().stream()
                .anyMatch(perm -> perm.getAuthority().equals("ROLE_ADMINISTRADOR"));
        service.remover(id, autenticado.getId(), administrador);
        return ResponseEntity.noContent().build();
    }
}
