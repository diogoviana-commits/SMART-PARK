package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.model.Evento;
import com.smartparkuscs.mapbackend.repository.EventoRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Agenda de eventos do parque (RF08).
 */
@Service
public class EventoService {

    private final EventoRepository repository;

    public EventoService(EventoRepository repository) {
        this.repository = repository;
    }

    /**
     * Eventos do periodo. Sem datas informadas, devolve os proximos 30 dias a partir de hoje,
     * que e a "lista do mes" descrita no MVP.
     */
    @Transactional(readOnly = true)
    public List<Evento> listar(LocalDate de, LocalDate ate) {
        LocalDate inicio = de != null ? de : LocalDate.now();
        LocalDate fim = ate != null ? ate : inicio.plusDays(30);
        return repository.buscarNoPeriodo(inicio.atStartOfDay(), LocalDateTime.of(fim, LocalTime.MAX));
    }

    @Transactional(readOnly = true)
    public List<Evento> listarTodos() {
        return repository.findAllByOrderByDataHoraInicioAsc();
    }

    @Transactional(readOnly = true)
    public Evento buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Evento " + id + " nao encontrado."));
    }
}
