package com.smartparkuscs.mapbackend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Identificacao da API na pagina de documentacao (/swagger-ui.html).
 */
@Configuration
public class ConfiguracaoOpenApi {

    @Bean
    public OpenAPI documentacaoSmartPark() {
        return new OpenAPI().info(new Info()
                .title("Smart Park API")
                .version("0.1.0")
                .description("""
                        API do mapa interativo do Parque Espaco Verde Chico Mendes, em Sao Caetano
                        do Sul. Projeto de Extensao do curso de Analise e Desenvolvimento de
                        Sistemas da USCS.

                        Atende os requisitos RF01 a RF08, RF10 e RF11 descritos no relatorio.
                        """)
                .contact(new Contact().name("Equipe Smart Park - USCS"))
                .license(new License().name("Uso academico")));
    }
}
