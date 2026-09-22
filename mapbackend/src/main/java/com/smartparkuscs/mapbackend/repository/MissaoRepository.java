package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.Missao;
import com.smartparkuscs.mapbackend.model.PeriodicidadeMissao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissaoRepository extends JpaRepository<Missao, Long> {

    List<Missao> findByPeriodicidadeOrderByValorMetaAsc(PeriodicidadeMissao periodicidade);

    List<Missao> findAllByOrderByPeriodicidadeAscValorMetaAsc();
}
