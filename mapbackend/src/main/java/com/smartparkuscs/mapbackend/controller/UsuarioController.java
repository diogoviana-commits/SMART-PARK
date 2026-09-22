package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.dto.LoginRequest;
import com.smartparkuscs.mapbackend.dto.TokenResponse;
import com.smartparkuscs.mapbackend.dto.UsuarioRequest;
import com.smartparkuscs.mapbackend.dto.UsuarioResponse;
import com.smartparkuscs.mapbackend.model.Usuario;
import com.smartparkuscs.mapbackend.security.UsuarioAutenticado;
import com.smartparkuscs.mapbackend.service.AutenticacaoService;
import com.smartparkuscs.mapbackend.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cadastro e autenticacao (RF01, RF02).
 */
@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuarios", description = "Cadastro, login e administracao de contas")
public class UsuarioController {

    private final UsuarioService service;
    private final AutenticacaoService autenticacaoService;

    public UsuarioController(UsuarioService service, AutenticacaoService autenticacaoService) {
        this.service = service;
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping
    @Operation(summary = "Cria uma conta de visitante",
            description = """
                    Aberto a qualquer pessoa. A conta criada e sempre VISITANTE: o perfil
                    nao pode ser escolhido aqui. Contas de administrador sao criadas no
                    endpoint /api/usuarios/administradores, por quem ja e administrador.
                    """)
    public ResponseEntity<UsuarioResponse> cadastrar(@RequestBody @Valid UsuarioRequest request) {
        Usuario criado = service.cadastrar(request);
        return ResponseEntity.created(URI.create("/api/usuarios/" + criado.getId()))
                .body(UsuarioResponse.de(criado));
    }

    @PostMapping("/administradores")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Cria uma conta de administrador (exige perfil de administrador)")
    public ResponseEntity<UsuarioResponse> cadastrarAdministrador(
            @RequestBody @Valid UsuarioRequest request) {
        Usuario criado = service.cadastrarComPerfil(request,
                com.smartparkuscs.mapbackend.model.Perfil.ADMINISTRADOR);
        return ResponseEntity.created(URI.create("/api/usuarios/" + criado.getId()))
                .body(UsuarioResponse.de(criado));
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica e devolve o token JWT",
            description = "Envie o token nas demais chamadas no cabecalho Authorization: Bearer <token>.")
    public TokenResponse entrar(@RequestBody @Valid LoginRequest request) {
        return autenticacaoService.entrar(request);
    }

    @GetMapping("/eu")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Dados da conta autenticada")
    public UsuarioResponse eu(@AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return UsuarioResponse.de(service.buscarPorId(autenticado.getId()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Lista as contas (exige perfil de administrador)")
    public List<UsuarioResponse> listar() {
        return service.listar().stream().map(UsuarioResponse::de).toList();
    }

    @GetMapping("/{id}")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Dados de uma conta",
            description = "Cada pessoa so consulta a propria conta; administradores consultam qualquer uma.")
    public UsuarioResponse porId(@PathVariable Long id,
                                 @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        exigirDonoOuAdministrador(id, autenticado);
        return UsuarioResponse.de(service.buscarPorId(id));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = "bearer")
    @Operation(summary = "Remove uma conta",
            description = "Cada pessoa so remove a propria conta; administradores removem qualquer uma.")
    public ResponseEntity<Void> remover(@PathVariable Long id,
                                        @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        exigirDonoOuAdministrador(id, autenticado);
        service.remover(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Sem esta checagem, qualquer pessoa logada leria ou apagaria a conta de outra
     * so trocando o id na URL.
     */
    private void exigirDonoOuAdministrador(Long id, UsuarioAutenticado autenticado) {
        boolean administrador = autenticado.getAuthorities().stream()
                .anyMatch(p -> p.getAuthority().equals("ROLE_ADMINISTRADOR"));
        if (!administrador && !autenticado.getId().equals(id)) {
            throw new AccessDeniedException("Voce so pode acessar a sua propria conta.");
        }
    }
}
