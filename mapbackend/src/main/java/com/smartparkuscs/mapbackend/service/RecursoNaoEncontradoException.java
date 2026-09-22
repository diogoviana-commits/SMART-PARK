package com.smartparkuscs.mapbackend.service;

/**
 * Lancada quando um recurso pedido pela API nao existe. Vira HTTP 404 no
 * {@link com.smartparkuscs.mapbackend.controller.TratadorDeErros}.
 */
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
