package com.smartparkuscs.mapbackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/**
 * Escreve erros dos filtros de seguranca no mesmo formato do TratadorDeErros.
 *
 * <p>Os filtros rodam antes dos controllers, entao o TratadorDeErros nao os
 * alcanca. Sem isto, um 401 sairia num formato e um 400 em outro, e o front-end
 * teria que entender os dois.</p>
 */
@Component
public class RespostaDeErro {

    private final ObjectMapper json;

    public RespostaDeErro(ObjectMapper json) {
        this.json = json;
    }

    public void escrever(HttpServletResponse resposta, int status, String mensagem) throws IOException {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("momento", LocalDateTime.now().toString());
        corpo.put("status", status);
        corpo.put("erro", HttpStatus.valueOf(status).getReasonPhrase());
        corpo.put("mensagem", mensagem);

        resposta.setStatus(status);
        resposta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resposta.setCharacterEncoding("UTF-8");
        resposta.getWriter().write(json.writeValueAsString(corpo));
    }
}
