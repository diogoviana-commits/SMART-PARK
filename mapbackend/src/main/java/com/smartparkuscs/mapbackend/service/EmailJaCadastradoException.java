package com.smartparkuscs.mapbackend.service;

/**
 * Cadastro com um e-mail que ja existe. Vira HTTP 409 (conflito) no
 * {@link com.smartparkuscs.mapbackend.controller.TratadorDeErros}.
 */
public class EmailJaCadastradoException extends RuntimeException {

    public EmailJaCadastradoException(String mensagem) {
        super(mensagem);
    }
}
