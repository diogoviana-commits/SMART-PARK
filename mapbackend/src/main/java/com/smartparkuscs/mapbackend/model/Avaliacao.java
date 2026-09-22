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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Avaliacao de um ponto de interesse por um usuario (RF11), equivalente a
 * TB_AVALIACAO do modelo fisico.
 *
 * <p>A restricao de unicidade (usuario, poi) garante uma avaliacao por pessoa em cada
 * ponto: sem isso, a media poderia ser distorcida por quem avaliasse varias vezes.
 * Reavaliar atualiza a nota anterior.</p>
 */
@Entity
@Table(name = "tb_avaliacao",
        uniqueConstraints = @UniqueConstraint(name = "uk_avaliacao_usuario_poi",
                columnNames = {"id_usuario", "id_poi"}))
public class Avaliacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_poi", nullable = false)
    private PontoInteresse poi;

    @Min(1)
    @Max(5)
    @Column(nullable = false)
    private int nota;

    @Column(length = 600)
    private String comentario;

    @Column(name = "data_avaliacao", nullable = false)
    private LocalDateTime dataAvaliacao = LocalDateTime.now();

    protected Avaliacao() {
        // exigido pelo JPA
    }

    public Avaliacao(Usuario usuario, PontoInteresse poi, int nota, String comentario) {
        this.usuario = usuario;
        this.poi = poi;
        this.nota = nota;
        this.comentario = comentario;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public PontoInteresse getPoi() {
        return poi;
    }

    public int getNota() {
        return nota;
    }

    public String getComentario() {
        return comentario;
    }

    public LocalDateTime getDataAvaliacao() {
        return dataAvaliacao;
    }

    /** Usado quando a pessoa avalia de novo o mesmo ponto. */
    public void atualizar(int nota, String comentario) {
        this.nota = nota;
        this.comentario = comentario;
        this.dataAvaliacao = LocalDateTime.now();
    }
}
