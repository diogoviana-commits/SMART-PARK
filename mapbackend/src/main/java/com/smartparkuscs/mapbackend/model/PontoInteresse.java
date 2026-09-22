package com.smartparkuscs.mapbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

/**
 * Ponto de interesse do parque: banheiro, quadra, lanchonete, entrada etc. (RF03, RF07).
 *
 * <p>A posicao e guardada como latitude/longitude em graus decimais (WGS84), que e o
 * formato que o Leaflet consome direto e que funciona igual em H2 e MySQL.</p>
 */
@Entity
@Table(name = "tb_ponto_interesse")
public class PontoInteresse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 600)
    private String descricao;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_categoria", nullable = false)
    private CategoriaPoi categoria;

    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    @Column(nullable = false)
    private Double latitude;

    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    @Column(nullable = false)
    private Double longitude;

    private LocalTime horarioAbertura;

    private LocalTime horarioFechamento;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusOperacional statusOperacional = StatusOperacional.EM_FUNCIONAMENTO;

    /** Indica acessibilidade fisica (rampa, banheiro adaptado) - RF12. */
    @Column(nullable = false)
    private boolean acessivel;

    @Column(length = 400)
    private String fotoUrl;

    protected PontoInteresse() {
        // exigido pelo JPA
    }

    public PontoInteresse(String nome, String descricao, CategoriaPoi categoria,
                          Double latitude, Double longitude) {
        this.nome = nome;
        this.descricao = descricao;
        this.categoria = categoria;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public CategoriaPoi getCategoria() {
        return categoria;
    }

    public void setCategoria(CategoriaPoi categoria) {
        this.categoria = categoria;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public LocalTime getHorarioAbertura() {
        return horarioAbertura;
    }

    public void setHorarioAbertura(LocalTime horarioAbertura) {
        this.horarioAbertura = horarioAbertura;
    }

    public LocalTime getHorarioFechamento() {
        return horarioFechamento;
    }

    public void setHorarioFechamento(LocalTime horarioFechamento) {
        this.horarioFechamento = horarioFechamento;
    }

    public StatusOperacional getStatusOperacional() {
        return statusOperacional;
    }

    public void setStatusOperacional(StatusOperacional statusOperacional) {
        this.statusOperacional = statusOperacional;
    }

    public boolean isAcessivel() {
        return acessivel;
    }

    public void setAcessivel(boolean acessivel) {
        this.acessivel = acessivel;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }
}
