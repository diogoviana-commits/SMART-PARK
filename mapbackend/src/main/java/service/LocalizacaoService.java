package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.model.Localizacao;
import com.smartparkuscs.mapbackend.repository.LocalizacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class LocalizacaoService {

    @Autowired
    private LocalizacaoRepository repository;

    public List<Localizacao> findAll() {
        return repository.findAll();
    }

    public Localizacao save(Localizacao localizacao) {
        return repository.save(localizacao);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    public Localizacao findById(Long id) {
        return repository.findById(id).orElse(null);
    }
}