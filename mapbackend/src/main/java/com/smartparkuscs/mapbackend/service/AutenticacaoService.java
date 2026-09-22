package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.LoginRequest;
import com.smartparkuscs.mapbackend.dto.TokenResponse;
import com.smartparkuscs.mapbackend.dto.UsuarioResponse;
import com.smartparkuscs.mapbackend.model.Usuario;
import com.smartparkuscs.mapbackend.repository.UsuarioRepository;
import com.smartparkuscs.mapbackend.security.ControleDeTentativas;
import com.smartparkuscs.mapbackend.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Login: confere as credenciais e emite o token JWT (RF02).
 */
@Service
public class AutenticacaoService {

    private final AuthenticationManager gerenciador;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final ControleDeTentativas tentativas;

    public AutenticacaoService(AuthenticationManager gerenciador,
                               UsuarioRepository usuarioRepository,
                               JwtService jwtService,
                               ControleDeTentativas tentativas) {
        this.gerenciador = gerenciador;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
        this.tentativas = tentativas;
    }

    @Transactional
    public TokenResponse entrar(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        if (tentativas.bloqueado(email)) {
            throw new CredenciaisInvalidasException(
                    "Muitas tentativas seguidas. Aguarde " + tentativas.minutosDeBloqueio()
                            + " minutos e tente novamente.");
        }

        try {
            gerenciador.authenticate(new UsernamePasswordAuthenticationToken(email, request.senha()));
        } catch (AuthenticationException e) {
            tentativas.registrarFalha(email);
            // Mesma resposta para e-mail inexistente e senha errada: dizer qual dos dois
            // falhou revelaria quais e-mails estao cadastrados.
            throw new CredenciaisInvalidasException("E-mail ou senha incorretos.");
        }

        tentativas.registrarSucesso(email);

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new CredenciaisInvalidasException("E-mail ou senha incorretos."));
        usuario.registrarAcesso();
        usuarioRepository.save(usuario);

        return new TokenResponse(jwtService.gerar(usuario), "Bearer",
                jwtService.expiracao(), UsuarioResponse.de(usuario));
    }
}
