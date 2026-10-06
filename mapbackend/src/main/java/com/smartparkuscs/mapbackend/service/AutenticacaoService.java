package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.dto.LoginRequest;
import com.smartparkuscs.mapbackend.dto.SessaoResponse;
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
 * Login e logout: confere as credenciais, emite o token JWT e encerra sessoes (RF02).
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

    /**
     * Resultado do login.
     *
     * @param token  vai para o cookie HttpOnly, nunca para o corpo da resposta
     * @param sessao o que a tela recebe
     */
    public record Login(String token, SessaoResponse sessao) {
    }

    @Transactional
    public Login entrar(LoginRequest request) {
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

        return new Login(jwtService.gerar(usuario),
                new SessaoResponse(jwtService.expiracao(), UsuarioResponse.de(usuario)));
    }

    /**
     * Encerra todas as sessoes da conta, em qualquer aparelho.
     *
     * <p>Apagar o cookie so tira o token deste navegador. Mudar a versao da conta e o
     * que garante que uma copia do token (roubada, ou num computador emprestado)
     * pare de funcionar no mesmo instante.</p>
     */
    @Transactional
    public void sair(Long usuarioId) {
        usuarioRepository.findById(usuarioId).ifPresent(usuario -> {
            usuario.encerrarSessoes();
            usuarioRepository.save(usuario);
        });
    }
}
