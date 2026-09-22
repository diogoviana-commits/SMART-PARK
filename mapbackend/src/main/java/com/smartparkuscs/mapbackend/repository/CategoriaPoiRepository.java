package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoriaPoiRepository extends JpaRepository<CategoriaPoi, Long> {

    Optional<CategoriaPoi> findBySlugIgnoreCase(String slug);

    List<CategoriaPoi> findAllByOrderByNomeAsc();
}
