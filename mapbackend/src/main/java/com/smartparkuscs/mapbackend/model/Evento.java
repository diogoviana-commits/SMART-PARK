package com.smartparkuscs.mapbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Evento da agenda do parque (RF08). Pode estar ancorado em um ponto de interesse
 * para aparecer no mapa, ou apenas descrever o local em texto.
 */
@Entity
@Table(name = "tb_evento")
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 800)
    private String descricao;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime dataHoraInicio;

    private LocalDateTime dataHoraFim;

    @Column(length = 200)
    private String localDescritivo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_poi_local")
    private PontoInteresse local;

    @Column(length = 400)
    private String linkMaisInfo;

    protected Evento() {
        // exigido pelo JPA
    }

    public Evento(String nome, String descricao, LocalDateTime dataHoraInicio,
                  LocalDateTime dataHoraFim, PontoInteresse local) {
        this.nome = nome;
        this.descricao = descricao;
        this.dataHoraInicio = dataHoraInicio;
        this.dataHoraFim = dataHoraFim;
        this.local = local;
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

    public LocalDateTime getDataHoraInicio() {
        return dataHoraInicio;
    }

    public void setDataHoraInicio(LocalDateTime dataHoraInicio) {
        this.dataHoraInicio = dataHoraInicio;
    }

    public LocalDateTime getDataHoraFim() {
        return dataHoraFim;
    }

    public void setDataHoraFim(LocalDateTime dataHoraFim) {
        this.dataHoraFim = dataHoraFim;
    }

    public String getLocalDescritivo() {
        return localDescritivo;
    }

    public void setLocalDescritivo(String localDescritivo) {
        this.localDescritivo = localDescritivo;
    }

    public PontoInteresse getLocal() {
        return local;
    }

    public void setLocal(PontoInteresse local) {
        this.local = local;
    }

    public String getLinkMaisInfo() {
        return linkMaisInfo;
    }

    public void setLinkMaisInfo(String linkMaisInfo) {
        this.linkMaisInfo = linkMaisInfo;
    }
}
