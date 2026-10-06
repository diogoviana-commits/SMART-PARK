package com.smartparkuscs.mapbackend.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Responde se a API esta no ar, sem exigir login e sem entregar dado nenhum.
 *
 * <p>Existe porque o resto da API agora exige login: a tela de entrar chama isto
 * para acordar o servidor (que hiberna no plano gratuito da Render) enquanto a
 * pessoa digita a senha, e o fluxo "Manter a API acordada" do GitHub tambem.</p>
 */
@RestController
@RequestMapping("/api/saude")
public class SaudeController {

    @GetMapping
    public Map<String, String> saude() {
        return Map.of("status", "ok");
    }
}
