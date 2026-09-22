package com.smartparkuscs.mapbackend.dto;

import com.smartparkuscs.mapbackend.model.Missao;
import com.smartparkuscs.mapbackend.model.ProgressoMissao;
import java.time.LocalDateTime;

/**
 * Missao com o progresso do usuario, quando ele foi informado (RF10).
 * E o que a tela de missoes do prototipo precisa para desenhar a barra.
 *
 * @param fracaoConcluida de 0 a 1, para a largura da barra de progresso
 */
public record MissaoResponse(Long id,
                             String nome,
                             String descricao,
                             String tipo,
                             String periodicidade,
                             double valorMeta,
                             int pontosRecompensa,
                             double progressoAtual,
                             double fracaoConcluida,
                             boolean concluida,
                             LocalDateTime dataConclusao) {

    /** Missao sem progresso: usada quando nenhum usuario foi informado. */
    public static MissaoResponse de(Missao missao) {
        return new MissaoResponse(missao.getId(), missao.getNome(), missao.getDescricao(),
                missao.getTipo().name(), missao.getPeriodicidade().name(), missao.getValorMeta(),
                missao.getPontosRecompensa(), 0d, 0d, false, null);
    }

    public static MissaoResponse de(ProgressoMissao progresso) {
        Missao missao = progresso.getMissao();
        return new MissaoResponse(missao.getId(), missao.getNome(), missao.getDescricao(),
                missao.getTipo().name(), missao.getPeriodicidade().name(), missao.getValorMeta(),
                missao.getPontosRecompensa(), progresso.getProgressoAtual(),
                progresso.fracaoConcluida(), progresso.isConcluida(), progresso.getDataConclusao());
    }
}
