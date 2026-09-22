package com.smartparkuscs.mapbackend.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Trava o login depois de varias senhas erradas seguidas, para dificultar quem
 * tenta adivinhar a senha testando uma atras da outra.
 *
 * <p>A contagem fica em memoria: e suficiente para uma instancia so, que e o caso
 * deste projeto. Com mais de uma instancia isso precisaria ir para um lugar
 * compartilhado (Redis, banco), senao cada uma contaria por si.</p>
 */
@Component
public class ControleDeTentativas {

    private record Registro(int falhas, Instant ultimaFalha) {
    }

    private final Map<String, Registro> tentativas = new ConcurrentHashMap<>();
    private final int limite;
    private final Duration janela;

    public ControleDeTentativas(@Value("${smartpark.login.max-tentativas:5}") int limite,
                                @Value("${smartpark.login.bloqueio-minutos:15}") long bloqueioMinutos) {
        this.limite = limite;
        this.janela = Duration.ofMinutes(bloqueioMinutos);
    }

    public boolean bloqueado(String email) {
        Registro registro = tentativas.get(chave(email));
        if (registro == null) {
            return false;
        }
        if (Duration.between(registro.ultimaFalha(), Instant.now()).compareTo(janela) > 0) {
            tentativas.remove(chave(email));
            return false;
        }
        return registro.falhas() >= limite;
    }

    public void registrarFalha(String email) {
        tentativas.compute(chave(email), (k, atual) -> {
            if (atual == null || Duration.between(atual.ultimaFalha(), Instant.now()).compareTo(janela) > 0) {
                return new Registro(1, Instant.now());
            }
            return new Registro(atual.falhas() + 1, Instant.now());
        });
    }

    public void registrarSucesso(String email) {
        tentativas.remove(chave(email));
    }

    public int minutosDeBloqueio() {
        return (int) janela.toMinutes();
    }

    private String chave(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
