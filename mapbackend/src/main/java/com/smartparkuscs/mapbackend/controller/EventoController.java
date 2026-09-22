package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.dto.EventoResponse;
import com.smartparkuscs.mapbackend.service.EventoService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Agenda de eventos do parque (RF08).
 */
@RestController
@RequestMapping("/api/eventos")
public class EventoController {

    private final EventoService service;

    public EventoController(EventoService service) {
        this.service = service;
    }

    /**
     * Eventos do periodo informado (formato yyyy-MM-dd). Sem parametros, os proximos 30 dias.
     * Use todos=true para a lista completa, util no painel da administracao.
     */
    @GetMapping
    public List<EventoResponse> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(defaultValue = "false") boolean todos) {
        var eventos = todos ? service.listarTodos() : service.listar(de, ate);
        return eventos.stream().map(EventoResponse::de).toList();
    }

    @GetMapping("/{id}")
    public EventoResponse porId(@PathVariable Long id) {
        return EventoResponse.de(service.buscarPorId(id));
    }
}
