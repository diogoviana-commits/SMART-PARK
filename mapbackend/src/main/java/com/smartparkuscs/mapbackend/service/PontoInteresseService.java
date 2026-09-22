package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.PoiRequest;
import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import com.smartparkuscs.mapbackend.model.StatusOperacional;
import com.smartparkuscs.mapbackend.repository.CategoriaPoiRepository;
import com.smartparkuscs.mapbackend.repository.PontoInteresseRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de negocio dos pontos de interesse: busca, filtros e manutencao do cadastro.
 */
@Service
public class PontoInteresseService {

    private final PontoInteresseRepository repository;
    private final CategoriaPoiRepository categoriaRepository;
    private final RotaService rotaService;

    public PontoInteresseService(PontoInteresseRepository repository,
                                 CategoriaPoiRepository categoriaRepository,
                                 RotaService rotaService) {
        this.repository = repository;
        this.categoriaRepository = categoriaRepository;
        this.rotaService = rotaService;
    }

    @Transactional(readOnly = true)
    public List<PontoInteresse> buscar(String busca, String categoriaSlug, Boolean acessivel) {
        String termo = (busca == null || busca.isBlank()) ? null : busca.trim();
        String categoria = (categoriaSlug == null || categoriaSlug.isBlank()) ? null : categoriaSlug.trim();
        return repository.buscar(termo, categoria, acessivel);
    }

    @Transactional(readOnly = true)
    public PontoInteresse buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Ponto de interesse " + id + " nao encontrado."));
    }

    /**
     * Pontos dentro de um raio a partir da posicao do visitante, do mais proximo ao mais distante.
     */
    @Transactional(readOnly = true)
    public List<PontoInteresse> buscarProximos(double latitude, double longitude, double raioMetros) {
        Comparator<PontoInteresse> porDistancia = Comparator.comparingDouble(
                poi -> rotaService.distanciaEmMetros(latitude, longitude, poi.getLatitude(), poi.getLongitude()));
        return repository.findAll().stream()
                .filter(poi -> rotaService.distanciaEmMetros(latitude, longitude,
                        poi.getLatitude(), poi.getLongitude()) <= raioMetros)
                .sorted(porDistancia)
                .toList();
    }

    @Transactional
    public PontoInteresse criar(PoiRequest request) {
        PontoInteresse poi = new PontoInteresse(request.nome(), request.descricao(),
                categoriaPeloSlug(request.categoriaSlug()), request.latitude(), request.longitude());
        aplicarCamposOpcionais(poi, request);
        return repository.save(poi);
    }

    @Transactional
    public PontoInteresse atualizar(Long id, PoiRequest request) {
        PontoInteresse poi = buscarPorId(id);
        poi.setNome(request.nome());
        poi.setDescricao(request.descricao());
        poi.setCategoria(categoriaPeloSlug(request.categoriaSlug()));
        poi.setLatitude(request.latitude());
        poi.setLongitude(request.longitude());
        aplicarCamposOpcionais(poi, request);
        return repository.save(poi);
    }

    @Transactional
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Ponto de interesse " + id + " nao encontrado.");
        }
        repository.deleteById(id);
    }

    private void aplicarCamposOpcionais(PontoInteresse poi, PoiRequest request) {
        poi.setHorarioAbertura(request.horarioAbertura());
        poi.setHorarioFechamento(request.horarioFechamento());
        poi.setAcessivel(Boolean.TRUE.equals(request.acessivel()));
        poi.setFotoUrl(request.fotoUrl());
        if (request.statusOperacional() != null && !request.statusOperacional().isBlank()) {
            try {
                poi.setStatusOperacional(StatusOperacional.valueOf(request.statusOperacional().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Status operacional invalido: " + request.statusOperacional()
                        + ". Use EM_FUNCIONAMENTO, EM_MANUTENCAO ou FECHADO.");
            }
        }
    }

    private CategoriaPoi categoriaPeloSlug(String slug) {
        return categoriaRepository.findBySlugIgnoreCase(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Categoria " + slug + " nao encontrada."));
    }
}
