package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.ProgressoMissao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProgressoMissaoRepository extends JpaRepository<ProgressoMissao, Long> {

    List<ProgressoMissao> findByUsuarioId(Long usuarioId);

    Optional<ProgressoMissao> findByUsuarioIdAndMissaoId(Long usuarioId, Long missaoId);
}
