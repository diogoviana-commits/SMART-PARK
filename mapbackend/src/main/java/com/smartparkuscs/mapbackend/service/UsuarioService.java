package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.UsuarioRequest;
import com.smartparkuscs.mapbackend.model.Perfil;
import com.smartparkuscs.mapbackend.model.Usuario;
import com.smartparkuscs.mapbackend.repository.UsuarioRepository;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cadastro e manutencao de usuarios (RF01).
 *
 * <p>A autenticacao em si fica no {@link AutenticacaoService}.</p>
 */
@Service
public class UsuarioService {

    private final UsuarioRepository repository;
    private final PasswordEncoder codificador;

    public UsuarioService(UsuarioRepository repository, PasswordEncoder codificador) {
        this.repository = repository;
        this.codificador = codificador;
    }

    /**
     * Cadastro publico: o usuario criado e sempre VISITANTE.
     *
     * <p>O perfil nao vem do corpo da requisicao de proposito. Se viesse, qualquer
     * pessoa viraria administradora mandando "perfil":"ADMINISTRADOR" no cadastro.
     * Administradores sao criados por {@link #cadastrarComPerfil}, que so e alcancavel
     * por quem ja e administrador.</p>
     */
    @Transactional
    public Usuario cadastrar(UsuarioRequest request) {
        return cadastrarComPerfil(request, Perfil.VISITANTE);
    }

    @Transactional
    public Usuario cadastrarComPerfil(UsuarioRequest request, Perfil perfil) {
        String email = request.email().trim().toLowerCase();
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new EmailJaCadastradoException(
                    "E-mail ja cadastrado. Use a opcao de entrar ou recuperar a senha.");
        }
        Usuario usuario = new Usuario(request.nome().trim(), email,
                codificador.encode(request.senha()), perfil);
        return repository.save(usuario);
    }

    @Transactional(readOnly = true)
    public Usuario buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario " + id + " nao encontrado."));
    }

    @Transactional(readOnly = true)
    public Usuario buscarPorEmail(String email) {
        return repository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario nao encontrado."));
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar() {
        return repository.findAll();
    }

    @Transactional
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Usuario " + id + " nao encontrado.");
        }
        repository.deleteById(id);
    }
}
