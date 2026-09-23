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
     *
     * <p>Os {@code cast} nao sao enfeite. Quando um parametro chega nulo, o driver
     * o envia sem tipo, e o PostgreSQL chuta {@code bytea} - ai
     * {@code lower(:busca)} vira {@code lower(bytea)}, que nao existe, e a
     * listagem inteira quebra. O cast diz o tipo antes de o banco precisar
     * adivinhar. H2 e MySQL aceitam o mesmo SQL, entao a consulta continua
     * unica para os tres bancos.</p>
     */
    @Query("""
            select p from PontoInteresse p
            join p.categoria c
            where (cast(:busca as string) is null
                   or lower(p.nome) like lower(concat('%', cast(:busca as string), '%'))
                   or lower(coalesce(p.descricao, '')) like lower(concat('%', cast(:busca as string), '%')))
              and (cast(:categoria as string) is null
                   or lower(c.slug) = lower(cast(:categoria as string)))
              and (cast(:acessivel as boolean) is null or p.acessivel = :acessivel)
            order by p.nome asc
            """)
    List<PontoInteresse> buscar(@Param("busca") String busca,
                                @Param("categoria") String categoria,
                                @Param("acessivel") Boolean acessivel);

    /** Busca exata pelo nome, usada pela carga inicial para ancorar eventos em um ponto. */
    Optional<PontoInteresse> findByNomeIgnoreCase(String nome);
}
