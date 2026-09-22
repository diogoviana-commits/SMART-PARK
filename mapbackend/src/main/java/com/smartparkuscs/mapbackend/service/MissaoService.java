package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.ProgressoRequest;
import com.smartparkuscs.mapbackend.model.Missao;
import com.smartparkuscs.mapbackend.model.PeriodicidadeMissao;
import com.smartparkuscs.mapbackend.model.ProgressoMissao;
import com.smartparkuscs.mapbackend.model.Usuario;
import com.smartparkuscs.mapbackend.repository.MissaoRepository;
import com.smartparkuscs.mapbackend.repository.ProgressoMissaoRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Missoes e progresso do visitante (RF10).
 */
@Service
public class MissaoService {

    private final MissaoRepository missaoRepository;
    private final ProgressoMissaoRepository progressoRepository;
    private final UsuarioService usuarioService;

    public MissaoService(MissaoRepository missaoRepository,
                         ProgressoMissaoRepository progressoRepository,
                         UsuarioService usuarioService) {
        this.missaoRepository = missaoRepository;
        this.progressoRepository = progressoRepository;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<Missao> listar(PeriodicidadeMissao periodicidade) {
        return periodicidade == null
                ? missaoRepository.findAllByOrderByPeriodicidadeAscValorMetaAsc()
                : missaoRepository.findByPeriodicidadeOrderByValorMetaAsc(periodicidade);
    }

    @Transactional(readOnly = true)
    public Missao buscarPorId(Long id) {
        return missaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Missao " + id + " nao encontrada."));
    }

    /**
     * Missoes com o progresso do usuario. Missoes que ele ainda nao comecou aparecem
     * zeradas, para a tela conseguir listar todas de uma vez.
     */
    @Transactional(readOnly = true)
    public List<ProgressoOuMissao> listarComProgresso(Long usuarioId, PeriodicidadeMissao periodicidade) {
        usuarioService.buscarPorId(usuarioId);
        Map<Long, ProgressoMissao> porMissao = progressoRepository.findByUsuarioId(usuarioId).stream()
                .collect(Collectors.toMap(p -> p.getMissao().getId(), Function.identity()));

        return listar(periodicidade).stream()
                .map(missao -> {
                    ProgressoMissao progresso = porMissao.get(missao.getId());
                    return progresso == null
                            ? new ProgressoOuMissao(missao, null)
                            : new ProgressoOuMissao(missao, progresso);
                })
                .toList();
    }

    /**
     * Soma um avanco do usuario na missao e devolve o progresso atualizado.
     */
    @Transactional
    public ProgressoMissao registrarProgresso(Long missaoId, Long usuarioId, ProgressoRequest request) {
        Missao missao = buscarPorId(missaoId);
        Usuario usuario = usuarioService.buscarPorId(usuarioId);

        ProgressoMissao progresso = progressoRepository
                .findByUsuarioIdAndMissaoId(usuario.getId(), missao.getId())
                .orElseGet(() -> new ProgressoMissao(usuario, missao));

        progresso.somar(request.quantidade());
        return progressoRepository.save(progresso);
    }

    /** Total de pontos ganhos nas missoes concluidas, usado para o nivel do perfil. */
    @Transactional(readOnly = true)
    public int pontosDoUsuario(Long usuarioId) {
        usuarioService.buscarPorId(usuarioId);
        return progressoRepository.findByUsuarioId(usuarioId).stream()
                .filter(ProgressoMissao::isConcluida)
                .mapToInt(p -> p.getMissao().getPontosRecompensa())
                .sum();
    }

    /** Par missao + progresso, que pode ser nulo quando o usuario ainda nao comecou. */
    public record ProgressoOuMissao(Missao missao, ProgressoMissao progresso) {
    }
}
