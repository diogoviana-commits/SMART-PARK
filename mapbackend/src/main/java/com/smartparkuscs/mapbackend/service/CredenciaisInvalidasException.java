package com.smartparkuscs.mapbackend.service;

/**
 * E-mail ou senha incorretos. Vira HTTP 401 no
 * {@link com.smartparkuscs.mapbackend.controller.TratadorDeErros}.
 */
public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException(String mensagem) {
        super(mensagem);
    }
}
