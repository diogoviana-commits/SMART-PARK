package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.model.Localizacao;
import com.smartparkuscs.mapbackend.service.LocalizacaoService;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/localizacoes")
@CrossOrigin(origins = "*") // Permite requisições de qualquer origem (apenas para testes)
public class LocalizacaoController {

    @Autowired
    private LocalizacaoService service;

    // Listar todas as localizações
    @GetMapping
    public List<Localizacao> getAll() {
        return service.findAll();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public ResponseEntity<Localizacao> getById(@PathVariable Long id) {
        Localizacao loc = service.findById(id);
        if (loc != null) {
            return ResponseEntity.ok(loc);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Criar uma nova localização (recebe um JSON com nome e coordenadas)
    @PostMapping
    public Localizacao create(@RequestBody Localizacao localizacao) {
        return service.save(localizacao);
    }

    // Deletar por ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Endpoint auxiliar para criar uma localização a partir de latitude e longitude
    @PostMapping("/criar")
    public Localizacao criarPorLatLon(@RequestParam String nome,
                                      @RequestParam double lat,
                                      @RequestParam double lon) {
        GeometryFactory gf = new GeometryFactory();
        Point point = gf.createPoint(new Coordinate(lon, lat));
        point.setSRID(4326); // Define o sistema de coordenadas geográficas (WGS84)
        Localizacao loc = new Localizacao(nome, point);
        return service.save(loc);
    }
}