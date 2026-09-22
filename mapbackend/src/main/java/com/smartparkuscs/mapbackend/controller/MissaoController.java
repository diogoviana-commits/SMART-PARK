package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.dto.MissaoResponse;
import com.smartparkuscs.mapbackend.dto.ProgressoRequest;
import com.smartparkuscs.mapbackend.model.PeriodicidadeMissao;
import com.smartparkuscs.mapbackend.security.UsuarioAutenticado;
import com.smartparkuscs.mapbackend.service.MissaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Missoes de gamificacao (RF10): desafios diarios e semanais com barra de progresso.
 */
@RestController
@RequestMapping("/api/missoes")
@Tag(name = "Missoes", description = "Desafios diarios e semanais e o progresso do visitante (RF10)")
public class MissaoController {

    private final MissaoService service;

    public MissaoController(MissaoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista as missoes",
            description = """
                    Sem login, devolve o catalogo de missoes com progresso zerado.
                    Com login, devolve cada missao com o progresso de quem esta autenticado.
                    O filtro periodicidade aceita DIARIA ou SEMANAL.
                    """)
    public List<MissaoResponse> listar(@AuthenticationPrincipal UsuarioAutenticado autenticado,
                                       @RequestParam(required = false) String periodicidade) {
        PeriodicidadeMissao filtro = periodicidade(periodicidade);

        // Sem login a tela ainda mostra o catalogo, so que com o progresso zerado.
        if (autenticado == null) {
            return service.listar(filtro).stream().map(MissaoResponse::de).toList();
        }

        return service.listarComProgresso(autenticado.getId(), filtro).stream()
                .map(item -> item.progresso() == null
                        ? MissaoResponse.de(item.missao())
                        : MissaoResponse.de(item.progresso()))
                .toList();
    }

    @PostMapping("/{id}/progresso")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Registra um avanco na missao (exige login)",
            description = "A quantidade e somada ao que ja existia; ao atingir a meta a missao e concluida.")
    public MissaoResponse registrarProgresso(@PathVariable Long id,
                                             @AuthenticationPrincipal UsuarioAutenticado autenticado,
                                             @RequestBody @Valid ProgressoRequest request) {
        return MissaoResponse.de(service.registrarProgresso(id, autenticado.getId(), request));
    }

    @GetMapping("/pontos")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Total de pontos de quem esta logado nas missoes concluidas")
    public Map<String, Object> pontos(@AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return Map.of("usuarioId", autenticado.getId(),
                "pontos", service.pontosDoUsuario(autenticado.getId()));
    }

    private PeriodicidadeMissao periodicidade(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return PeriodicidadeMissao.valueOf(valor.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Periodicidade invalida: " + valor + ". Use DIARIA ou SEMANAL.");
        }
    }
}
