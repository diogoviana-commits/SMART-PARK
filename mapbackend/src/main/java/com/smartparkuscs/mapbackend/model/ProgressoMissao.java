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
import java.time.LocalDateTime;

/**
 * Quanto um usuario ja avancou em uma missao (RF10), equivalente a
 * TB_PROGRESSO_MISSAO do modelo fisico.
 *
 * <p>Ha no maximo uma linha por par (usuario, missao): o progresso e acumulado nela.</p>
 */
@Entity
@Table(name = "tb_progresso_missao",
        uniqueConstraints = @UniqueConstraint(name = "uk_progresso_usuario_missao",
                columnNames = {"id_usuario", "id_missao"}))
public class ProgressoMissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_missao", nullable = false)
    private Missao missao;

    @Column(name = "progresso_atual", nullable = false)
    private double progressoAtual;

    @Column(nullable = false)
    private boolean concluida;

    @Column(name = "data_conclusao")
    private LocalDateTime dataConclusao;

    protected ProgressoMissao() {
        // exigido pelo JPA
    }

    public ProgressoMissao(Usuario usuario, Missao missao) {
        this.usuario = usuario;
        this.missao = missao;
    }

    /**
     * Soma um avanco e marca a missao como concluida ao alcancar a meta.
     *
     * @return true quando esta chamada foi a que concluiu a missao, para o servico
     *         saber se deve creditar os pontos de recompensa
     */
    public boolean somar(double quantidade) {
        this.progressoAtual += quantidade;
        if (!concluida && progressoAtual >= missao.getValorMeta()) {
            concluida = true;
            dataConclusao = LocalDateTime.now();
            return true;
        }
        return false;
    }

    /** Fracao concluida, de 0 a 1, para desenhar a barra de progresso. */
    public double fracaoConcluida() {
        if (missao.getValorMeta() <= 0) {
            return 1d;
        }
        return Math.min(1d, progressoAtual / missao.getValorMeta());
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public Missao getMissao() {
        return missao;
    }

    public double getProgressoAtual() {
        return progressoAtual;
    }

    public boolean isConcluida() {
        return concluida;
    }

    public LocalDateTime getDataConclusao() {
        return dataConclusao;
    }
}
