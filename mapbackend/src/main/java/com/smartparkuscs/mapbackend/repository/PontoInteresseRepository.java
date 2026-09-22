package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.PontoInteresse;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PontoInteresseRepository extends JpaRepository<PontoInteresse, Long> {

    /**
     * Busca por nome e filtra por categoria e acessibilidade (RF06).
     * Parametros nulos sao ignorados, o que permite combinar os filtros livremente.
     */
    @Query("""
            select p from PontoInteresse p
            join p.categoria c
            where (:busca is null or lower(p.nome) like lower(concat('%', :busca, '%'))
                   or lower(coalesce(p.descricao, '')) like lower(concat('%', :busca, '%')))
              and (:categoria is null or lower(c.slug) = lower(:categoria))
              and (:acessivel is null or p.acessivel = :acessivel)
            order by p.nome asc
            """)
    List<PontoInteresse> buscar(@Param("busca") String busca,
                                @Param("categoria") String categoria,
                                @Param("acessivel") Boolean acessivel);

    /** Busca exata pelo nome, usada pela carga inicial para ancorar eventos em um ponto. */
    Optional<PontoInteresse> findByNomeIgnoreCase(String nome);
}
