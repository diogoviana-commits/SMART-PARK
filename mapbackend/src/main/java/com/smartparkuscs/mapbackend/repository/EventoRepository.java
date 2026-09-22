package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.Evento;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Long> {

    /**
     * Eventos que acontecem dentro da janela informada, ordenados por inicio (RF08).
     * Um evento entra na janela se comeca antes do fim dela e termina depois do inicio.
     */
    @Query("""
            select e from Evento e
            where e.dataHoraInicio <= :ate
              and coalesce(e.dataHoraFim, e.dataHoraInicio) >= :de
            order by e.dataHoraInicio asc
            """)
    List<Evento> buscarNoPeriodo(@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

    List<Evento> findAllByOrderByDataHoraInicioAsc();
}
