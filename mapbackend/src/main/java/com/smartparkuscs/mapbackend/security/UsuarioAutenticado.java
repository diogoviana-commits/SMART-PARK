package com.smartparkuscs.mapbackend.security;

import com.smartparkuscs.mapbackend.model.Usuario;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Usuario logado, do jeito que o Spring Security espera.
 *
 * <p>Guarda o id junto para os controllers saberem de quem e a requisicao sem
 * precisar consultar o banco de novo.</p>
 */
public class UsuarioAutenticado implements UserDetails {

    private final Long id;
    private final String email;
    private final String senhaHash;
    private final String nome;
    private final List<GrantedAuthority> permissoes;

    public UsuarioAutenticado(Usuario usuario) {
        this.id = usuario.getId();
        this.email = usuario.getEmail();
        this.senhaHash = usuario.getSenhaHash();
        this.nome = usuario.getNome();
        // O Spring Security espera o prefixo ROLE_ para usar hasRole(...)
        this.permissoes = List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name()));
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return permissoes;
    }

    @Override
    public String getPassword() {
        return senhaHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
