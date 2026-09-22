package com.smartparkuscs.mapbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * Desafio proposto ao visitante (RF10), equivalente a TB_MISSAO do modelo fisico.
 * Ex.: "caminhar 5 km nesta semana", "visitar 3 pontos hoje".
 */
@Entity
@Table(name = "tb_missao")
public class Missao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 400)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_meta", nullable = false, length = 20)
    private TipoMissao tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PeriodicidadeMissao periodicidade;

    /** Quanto e preciso atingir: km para DISTANCIA, quantidade para CHECKIN e EVENTO. */
    @Positive
    @Column(name = "valor_meta", nullable = false)
    private double valorMeta;

    @Column(name = "pontos_recompensa", nullable = false)
    private int pontosRecompensa;

    protected Missao() {
        // exigido pelo JPA
    }

    public Missao(String nome, String descricao, TipoMissao tipo,
                  PeriodicidadeMissao periodicidade, double valorMeta, int pontosRecompensa) {
        this.nome = nome;
        this.descricao = descricao;
        this.tipo = tipo;
        this.periodicidade = periodicidade;
        this.valorMeta = valorMeta;
        this.pontosRecompensa = pontosRecompensa;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public TipoMissao getTipo() {
        return tipo;
    }

    public PeriodicidadeMissao getPeriodicidade() {
        return periodicidade;
    }

    public double getValorMeta() {
        return valorMeta;
    }

    public int getPontosRecompensa() {
        return pontosRecompensa;
    }
}
