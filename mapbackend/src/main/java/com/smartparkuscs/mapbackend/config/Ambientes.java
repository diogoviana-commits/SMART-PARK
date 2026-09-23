package com.smartparkuscs.mapbackend.config;

import org.springframework.core.env.Environment;

/**
 * Responde a uma unica pergunta: esta execucao esta exposta na internet?
 *
 * <p>A resposta decide se a aplicacao aceita subir com o segredo de JWT que esta
 * no repositorio e se o administrador inicial e criado com a senha padrao. Duas
 * decisoes de seguranca, no mesmo criterio.</p>
 *
 * <p>Isto e uma classe, e nao uma condicao repetida nos dois lugares, porque a
 * lista de perfis cresce: quando o perfil {@code postgres} foi criado, a condicao
 * duplicada teria deixado a API publicada aceitando o segredo publico ate alguem
 * reparar. Perfil novo que va para a internet entra aqui, e as duas travas passam
 * a valer nele de uma vez.</p>
 */
public final class Ambientes {

    /**
     * Perfis que rodam expostos na internet.
     *
     * <ul>
     *   <li>{@code prod} - producao com MySQL, o modelo do projeto de extensao;</li>
     *   <li>{@code postgres} - a mesma producao em PostgreSQL, para hospedagem gratuita;</li>
     *   <li>{@code demo} - H2 na memoria, mas publicado: exposto do mesmo jeito.</li>
     * </ul>
     */
    private static final String[] EXPOSTOS = {"prod", "postgres", "demo"};

    private Ambientes() {
    }

    /** True quando o perfil ativo roda publicado, e nao na maquina de quem desenvolve. */
    public static boolean exposto(Environment ambiente) {
        return ambiente.matchesProfiles(EXPOSTOS);
    }
}
