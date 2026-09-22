package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.Avaliacao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {

    List<Avaliacao> findByPoiIdOrderByDataAvaliacaoDesc(Long poiId);

    Optional<Avaliacao> findByUsuarioIdAndPoiId(Long usuarioId, Long poiId);

    /** Media de estrelas e total de avaliacoes de cada ponto, em uma consulta so. */
    @Query("""
            select a.poi.id, avg(a.nota), count(a)
            from Avaliacao a
            group by a.poi.id
            """)
    List<Object[]> resumoPorPoi();
}
