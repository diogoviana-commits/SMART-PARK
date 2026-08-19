package com.smartparkuscs.mapbackend.model;

import org.locationtech.jts.geom.Point;
import javax.persistence.*;

@Entity
@Table(name = "localizacoes")
public class Localizacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    @Column(columnDefinition = "GEOMETRY")
    private Point coordenadas;

    public Localizacao() {}

    public Localizacao(String nome, Point coordenadas) {
        this.nome = nome;
        this.coordenadas = coordenadas;
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Point getCoordenadas() {
        return coordenadas;
    }

    public void setCoordenadas(Point coordenadas) {
        this.coordenadas = coordenadas;
    }
}