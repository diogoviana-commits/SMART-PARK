package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import com.smartparkuscs.mapbackend.repository.CategoriaPoiRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Categorias usadas pelos filtros do mapa (RF06).
 */
@Service
public class CategoriaService {

    private final CategoriaPoiRepository repository;

    public CategoriaService(CategoriaPoiRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CategoriaPoi> listar() {
        return repository.findAllByOrderByNomeAsc();
    }
}
