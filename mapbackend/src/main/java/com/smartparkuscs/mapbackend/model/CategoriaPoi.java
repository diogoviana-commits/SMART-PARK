package com.smartparkuscs.mapbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

/**
 * Categoria usada para filtrar os pontos de interesse no mapa (RF06).
 * Ex.: banheiro, lanchonete, quadra, bebedouro.
 */
@Entity
@Table(name = "tb_categoria_poi")
public class CategoriaPoi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador estavel usado pelo front-end (ex.: "banheiro"). */
    @NotBlank
    @Column(nullable = false, unique = true, length = 40)
    private String slug;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String nome;

    /** Nome do icone que o front-end desenha no marcador. */
    @Column(length = 40)
    private String icone;

    /** Cor do marcador no mapa, em hexadecimal. */
    @Column(length = 7)
    private String cor;

    protected CategoriaPoi() {
        // exigido pelo JPA
    }

    public CategoriaPoi(String slug, String nome, String icone, String cor) {
        this.slug = slug;
        this.nome = nome;
        this.icone = icone;
        this.cor = cor;
    }

    public Long getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getIcone() {
        return icone;
    }

    public void setIcone(String icone) {
        this.icone = icone;
    }

    public String getCor() {
        return cor;
    }

    public void setCor(String cor) {
        this.cor = cor;
    }
}
