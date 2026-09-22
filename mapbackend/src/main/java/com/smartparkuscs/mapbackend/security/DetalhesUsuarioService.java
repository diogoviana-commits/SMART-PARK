package com.smartparkuscs.mapbackend.security;

import com.smartparkuscs.mapbackend.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Carrega o usuario a partir do e-mail, para o Spring Security conferir a senha
 * e descobrir o perfil.
 */
@Service
public class DetalhesUsuarioService implements UserDetailsService {

    private final UsuarioRepository repository;

    public DetalhesUsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return repository.findByEmailIgnoreCase(email)
                .map(UsuarioAutenticado::new)
                // Mensagem generica de proposito: dizer que o e-mail nao existe
                // entregaria quais e-mails estao cadastrados.
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais invalidas."));
    }
}
