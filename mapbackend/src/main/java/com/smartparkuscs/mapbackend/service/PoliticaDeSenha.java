package com.smartparkuscs.mapbackend.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

/**
 * Regras para uma senha nova, seguindo a orientacao atual do NIST (SP 800-63B):
 * comprimento minimo e bloqueio de senhas conhecidas, em vez de exigir simbolos e
 * maiusculas - regras que levam a "Senha@123", facil de adivinhar e dificil de lembrar.
 */
final class PoliticaDeSenha {

    static final int MINIMO = 8;

    /**
     * O BCrypt so considera os primeiros 72 bytes da senha e ignora o resto em
     * silencio. Aceitar mais daria a falsa impressao de uma senha mais forte.
     */
    static final int MAXIMO_BYTES = 72;

    /** As mais usadas em vazamentos publicos: as primeiras que um atacante testa. */
    private static final Set<String> CONHECIDAS = Set.of(
            "12345678", "123456789", "1234567890", "12345678910", "87654321", "11111111",
            "00000000", "123123123", "11223344", "12341234", "123456abc", "abc12345",
            "abcd1234", "password", "password1", "senha123", "senha1234", "senhasenha",
            "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "iloveyou", "princesa",
            "brasil123", "flamengo", "corinthians", "palmeiras", "saopaulo", "santos123",
            "mudar123", "admin123", "administrador", "smartpark", "smartpark123",
            "chicomendes", "parque123", "minhasenha", "trocar123", "aaaaaaaa");

    private PoliticaDeSenha() {
    }

    /**
     * @throws IllegalArgumentException com a explicacao para a pessoa, se a senha nao servir
     */
    static void validar(String senha, String email, String nome) {
        if (senha == null || senha.length() < MINIMO) {
            throw new IllegalArgumentException("A senha precisa ter pelo menos " + MINIMO + " caracteres.");
        }
        if (senha.getBytes(StandardCharsets.UTF_8).length > MAXIMO_BYTES) {
            throw new IllegalArgumentException("A senha pode ter no maximo " + MAXIMO_BYTES + " caracteres.");
        }

        String normalizada = senha.toLowerCase(Locale.ROOT);
        if (CONHECIDAS.contains(normalizada) || normalizada.chars().distinct().count() <= 2) {
            throw new IllegalArgumentException(
                    "Essa senha e muito comum e seria adivinhada rapido. Escolha outra.");
        }

        String usuarioDoEmail = email == null ? "" : email.split("@")[0].toLowerCase(Locale.ROOT);
        String nomeSemEspaco = nome == null ? "" : nome.replaceAll("\s+", "").toLowerCase(Locale.ROOT);
        if ((usuarioDoEmail.length() >= 4 && normalizada.contains(usuarioDoEmail))
                || (nomeSemEspaco.length() >= 4 && normalizada.contains(nomeSemEspaco))) {
            throw new IllegalArgumentException("A senha nao pode conter o seu nome ou o seu e-mail.");
        }
    }
}
