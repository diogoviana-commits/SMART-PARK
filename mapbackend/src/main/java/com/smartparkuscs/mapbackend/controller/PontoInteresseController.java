package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.dto.PoiRequest;
import com.smartparkuscs.mapbackend.dto.PoiResponse;
import com.smartparkuscs.mapbackend.dto.RotaResponse;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import com.smartparkuscs.mapbackend.service.AvaliacaoService;
import com.smartparkuscs.mapbackend.service.PontoInteresseService;
import com.smartparkuscs.mapbackend.service.RotaService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints dos pontos de interesse do parque (RF03, RF05, RF06, RF07).
 */
@RestController
@RequestMapping("/api/pois")
public class PontoInteresseController {

    private final PontoInteresseService service;
    private final RotaService rotaService;
    private final AvaliacaoService avaliacaoService;

    public PontoInteresseController(PontoInteresseService service, RotaService rotaService,
                                    AvaliacaoService avaliacaoService) {
        this.service = service;
        this.rotaService = rotaService;
        this.avaliacaoService = avaliacaoService;
    }

    /** Converte a lista anexando a media de estrelas de cada ponto, sem uma consulta por item. */
    private List<PoiResponse> comAvaliacoes(List<PontoInteresse> pois) {
        Map<Long, AvaliacaoService.Resumo> resumo = avaliacaoService.resumoPorPoi();
        return pois.stream().map(poi -> {
            var r = resumo.get(poi.getId());
            return r == null ? PoiResponse.de(poi) : PoiResponse.de(poi, r.media(), r.total());
        }).toList();
    }

    /**
     * Lista os pontos, opcionalmente filtrados por texto, categoria e acessibilidade.
     * Ex.: GET /api/pois?busca=banheiro&categoria=banheiro&acessivel=true
     */
    @GetMapping
    public List<PoiResponse> listar(@RequestParam(required = false) String busca,
                                    @RequestParam(required = false) String categoria,
                                    @RequestParam(required = false) Boolean acessivel) {
        return comAvaliacoes(service.buscar(busca, categoria, acessivel));
    }

    /**
     * Pontos mais proximos da posicao do visitante, do mais perto ao mais longe.
     */
    @GetMapping("/proximos")
    public List<PoiResponse> proximos(@RequestParam double lat,
                                      @RequestParam double lon,
                                      @RequestParam(defaultValue = "500") double raio) {
        return comAvaliacoes(service.buscarProximos(lat, lon, raio));
    }

    @GetMapping("/{id}")
    public PoiResponse porId(@PathVariable Long id) {
        return comAvaliacoes(List.of(service.buscarPorId(id))).get(0);
    }

    /**
     * Rota a pe da posicao do visitante ate este ponto de interesse (RF05).
     */
    @GetMapping("/{id}/rota")
    public RotaResponse rota(@PathVariable Long id, @RequestParam double lat, @RequestParam double lon) {
        PontoInteresse destino = service.buscarPorId(id);
        return rotaService.calcular(lat, lon, destino);
    }

    @PostMapping
    public ResponseEntity<PoiResponse> criar(@RequestBody @Valid PoiRequest request) {
        PontoInteresse criado = service.criar(request);
        return ResponseEntity.created(URI.create("/api/pois/" + criado.getId()))
                .body(PoiResponse.de(criado));
    }

    @PutMapping("/{id}")
    public PoiResponse atualizar(@PathVariable Long id, @RequestBody @Valid PoiRequest request) {
        return PoiResponse.de(service.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        service.remover(id);
        return ResponseEntity.noContent().build();
    }
}
