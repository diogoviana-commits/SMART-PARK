package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.AvaliacaoRequest;
import com.smartparkuscs.mapbackend.model.Avaliacao;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import com.smartparkuscs.mapbackend.model.Usuario;
import com.smartparkuscs.mapbackend.repository.AvaliacaoRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Avaliacoes dos pontos de interesse (RF11).
 */
@Service
public class AvaliacaoService {

    /** Media e quantidade de estrelas de um ponto. */
    public record Resumo(double media, long total) {
    }

    private final AvaliacaoRepository repository;
    private final PontoInteresseService poiService;
    private final UsuarioService usuarioService;

    public AvaliacaoService(AvaliacaoRepository repository,
                            PontoInteresseService poiService,
                            UsuarioService usuarioService) {
        this.repository = repository;
        this.poiService = poiService;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<Avaliacao> listarDoPoi(Long poiId) {
        poiService.buscarPorId(poiId); // garante 404 quando o ponto nao existe
        return repository.findByPoiIdOrderByDataAvaliacaoDesc(poiId);
    }

    /**
     * Registra a avaliacao. Se a pessoa ja tinha avaliado este ponto, a nota anterior
     * e substituida em vez de somar uma segunda avaliacao.
     */
    @Transactional
    public Avaliacao avaliar(Long poiId, Long usuarioId, AvaliacaoRequest request) {
        PontoInteresse poi = poiService.buscarPorId(poiId);
        Usuario usuario = usuarioService.buscarPorId(usuarioId);

        return repository.findByUsuarioIdAndPoiId(usuario.getId(), poi.getId())
                .map(existente -> {
                    existente.atualizar(request.nota(), request.comentario());
                    return repository.save(existente);
                })
                .orElseGet(() -> repository.save(
                        new Avaliacao(usuario, poi, request.nota(), request.comentario())));
    }

    /**
     * Remove a avaliacao. Sem a checagem de dono, qualquer pessoa logada apagaria a
     * avaliacao de outra apenas trocando o id na URL.
     */
    @Transactional
    public void remover(Long id, Long usuarioId, boolean administrador) {
        Avaliacao avaliacao = repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Avaliacao " + id + " nao encontrada."));

        if (!administrador && !avaliacao.getUsuario().getId().equals(usuarioId)) {
            throw new AccessDeniedException("Voce so pode remover a sua propria avaliacao.");
        }
        repository.delete(avaliacao);
    }

    /**
     * Media e total de avaliacoes de cada ponto, em uma unica consulta, para a
     * listagem do mapa nao disparar uma consulta por ponto.
     */
    @Transactional(readOnly = true)
    public Map<Long, Resumo> resumoPorPoi() {
        Map<Long, Resumo> resumo = new HashMap<>();
        for (Object[] linha : repository.resumoPorPoi()) {
            Long poiId = (Long) linha[0];
            double media = ((Number) linha[1]).doubleValue();
            long total = ((Number) linha[2]).longValue();
            resumo.put(poiId, new Resumo(Math.round(media * 10d) / 10d, total));
        }
        return resumo;
    }
}
