package com.smartparkuscs.mapbackend.model;

/**
 * Papel do usuario no sistema (RNF03).
 *
 * <p>No backend que veio do repositorio isto era uma entidade com tabela propria.
 * Virou enum porque o modelo fisico do relatorio guarda o papel como o campo
 * {@code tipo_perfil} dentro de TB_USUARIO, sem tabela separada, e porque sao
 * apenas dois valores fixos: nao ha o que cadastrar em tempo de execucao.</p>
 */
public enum Perfil {

    /** Visitante do parque: consulta mapa, eventos e avalia pontos. */
    VISITANTE,

    /** Administracao do parque: mantem pontos de interesse e eventos. */
    ADMINISTRADOR
}
