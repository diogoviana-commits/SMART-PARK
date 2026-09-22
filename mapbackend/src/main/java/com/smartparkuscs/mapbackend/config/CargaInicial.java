package com.smartparkuscs.mapbackend.config;

import com.smartparkuscs.mapbackend.dto.UsuarioRequest;
import com.smartparkuscs.mapbackend.model.CategoriaPoi;
import com.smartparkuscs.mapbackend.model.Evento;
import com.smartparkuscs.mapbackend.model.Missao;
import com.smartparkuscs.mapbackend.model.PeriodicidadeMissao;
import com.smartparkuscs.mapbackend.model.Perfil;
import com.smartparkuscs.mapbackend.model.PontoInteresse;
import com.smartparkuscs.mapbackend.model.StatusOperacional;
import com.smartparkuscs.mapbackend.model.TipoMissao;
import com.smartparkuscs.mapbackend.repository.CategoriaPoiRepository;
import com.smartparkuscs.mapbackend.repository.EventoRepository;
import com.smartparkuscs.mapbackend.repository.MissaoRepository;
import com.smartparkuscs.mapbackend.repository.PontoInteresseRepository;
import com.smartparkuscs.mapbackend.repository.UsuarioRepository;
import com.smartparkuscs.mapbackend.service.UsuarioService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Popula o banco na primeira execucao com as categorias, pontos e eventos do
 * Parque Espaco Verde Chico Mendes, para o mapa ter conteudo desde o primeiro run.
 *
 * <p>O centro do parque vem do OpenStreetMap (relacao "Espaco Verde Chico Mendes",
 * bbox aproximada lat -23.63447/-23.63057, lon -46.57575/-46.57068), entao os pontos
 * caem dentro da area correta do parque.</p>
 *
 * <p><strong>Atencao:</strong> a posicao de cada ponto dentro do parque ainda e
 * APROXIMADA: sao deslocamentos em volta do centro, nao medicoes reais. Antes de
 * apresentar, percorra o parque e substitua cada par lat/lon pela leitura do GPS no
 * local. Para mover tudo de uma vez, ajuste {@link #LAT_CENTRO} e {@link #LON_CENTRO}.</p>
 */
@Component
@ConditionalOnProperty(name = "smartpark.carga-inicial", havingValue = "true", matchIfMissing = true)
public class CargaInicial implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaInicial.class);

    static final String EMAIL_ADMIN = "admin@smartpark.uscs";

    /** Senha usada apenas em desenvolvimento; e publica, pois esta no repositorio. */
    static final String SENHA_ADMIN_PADRAO = "smartpark2026";

    /** Centro do parque conforme OpenStreetMap (Av. Fernando Simonsen, 566, Sao Caetano do Sul). */
    private static final double LAT_CENTRO = -23.63253;
    private static final double LON_CENTRO = -46.57307;

    private final CategoriaPoiRepository categoriaRepository;
    private final PontoInteresseRepository poiRepository;
    private final EventoRepository eventoRepository;
    private final MissaoRepository missaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final Environment ambiente;
    private final String senhaAdmin;

    public CargaInicial(CategoriaPoiRepository categoriaRepository,
                        PontoInteresseRepository poiRepository,
                        EventoRepository eventoRepository,
                        MissaoRepository missaoRepository,
                        UsuarioRepository usuarioRepository,
                        UsuarioService usuarioService,
                        Environment ambiente,
                        @Value("${smartpark.admin.senha:" + SENHA_ADMIN_PADRAO + "}") String senhaAdmin) {
        this.categoriaRepository = categoriaRepository;
        this.poiRepository = poiRepository;
        this.eventoRepository = eventoRepository;
        this.missaoRepository = missaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.ambiente = ambiente;
        this.senhaAdmin = senhaAdmin;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (poiRepository.count() > 0) {
            log.info("Banco ja possui pontos de interesse; carga inicial ignorada.");
            return;
        }

        Map<String, CategoriaPoi> categorias = criarCategorias();
        criarPontos(categorias);
        criarEventos();
        criarMissoes();
        criarAdministrador();

        log.info("Carga inicial concluida: {} categorias, {} pontos, {} eventos, {} missoes.",
                categoriaRepository.count(), poiRepository.count(),
                eventoRepository.count(), missaoRepository.count());
    }

    /**
     * As cores nao sao de nenhuma paleta pronta: foram escolhidas a partir do
     * proprio parque (verde de mata, terracota de tijolo, azul acinzentado),
     * e o nome do icone bate com o slug, que e o que o front-end desenha.
     */
    private Map<String, CategoriaPoi> criarCategorias() {
        Map<String, CategoriaPoi> categorias = new LinkedHashMap<>();
        salvar(categorias, new CategoriaPoi("banheiro", "Banheiro", "banheiro", "#3d6c8f"));
        salvar(categorias, new CategoriaPoi("bebedouro", "Bebedouro", "bebedouro", "#3f8a86"));
        salvar(categorias, new CategoriaPoi("alimentacao", "Alimentacao", "alimentacao", "#b4542f"));
        salvar(categorias, new CategoriaPoi("esporte", "Esporte", "esporte", "#4b7f52"));
        salvar(categorias, new CategoriaPoi("lazer", "Lazer e descanso", "lazer", "#7a5b8f"));
        salvar(categorias, new CategoriaPoi("servico", "Servicos e apoio", "servico", "#2f5d3f"));
        salvar(categorias, new CategoriaPoi("entrada", "Entrada e saida", "entrada", "#6b6257"));
        return categorias;
    }

    private void salvar(Map<String, CategoriaPoi> destino, CategoriaPoi categoria) {
        destino.put(categoria.getSlug(), categoriaRepository.save(categoria));
    }

    private void criarPontos(Map<String, CategoriaPoi> cat) {
        criar("Entrada Principal", "Portao principal do parque, com estacionamento ao lado.",
                cat.get("entrada"), 0.0009, -0.0011, true, null, null);
        criar("Entrada Norte", "Acesso secundario, mais proximo do bairro Ceramica.",
                cat.get("entrada"), -0.0012, 0.0007, true, null, null);

        criar("Banheiro Central", "Banheiro masculino e feminino, com cabine adaptada.",
                cat.get("banheiro"), 0.0002, -0.0003, true, LocalTime.of(6, 0), LocalTime.of(22, 0));
        criar("Banheiro da Pista", "Banheiro proximo a pista de corrida.",
                cat.get("banheiro"), -0.0007, 0.0004, false, LocalTime.of(6, 0), LocalTime.of(22, 0));

        criar("Bebedouro da Praca", "Bebedouro com torneira em altura acessivel.",
                cat.get("bebedouro"), 0.0004, 0.0002, true, null, null);
        criar("Bebedouro do Playground", "Bebedouro ao lado da area infantil.",
                cat.get("bebedouro"), -0.0004, -0.0006, true, null, null);

        criar("Lanchonete do Parque", "Salgados, cafe e bebidas geladas.",
                cat.get("alimentacao"), 0.0006, -0.0002, true, LocalTime.of(8, 0), LocalTime.of(18, 0));
        criar("Quiosque da Trilha", "Quiosque com agua de coco e sorvetes.",
                cat.get("alimentacao"), -0.0009, 0.0009, false, LocalTime.of(9, 0), LocalTime.of(17, 0));

        criar("Pista de Corrida", "Circuito de caminhada e corrida ao redor do parque.",
                cat.get("esporte"), 0.0000, 0.0008, true, LocalTime.of(6, 0), LocalTime.of(22, 0));
        criar("Quadra Poliesportiva 1", "Quadra para futsal, volei e basquete.",
                cat.get("esporte"), -0.0005, 0.0011, true, LocalTime.of(8, 0), LocalTime.of(21, 0));
        criar("Academia ao Ar Livre", "Aparelhos de musculacao e alongamento.",
                cat.get("esporte"), 0.0008, 0.0006, true, null, null);

        criar("Playground", "Area infantil com brinquedos e piso emborrachado.",
                cat.get("lazer"), -0.0003, -0.0008, true, LocalTime.of(7, 0), LocalTime.of(19, 0));
        criar("Area de Descanso do Lago", "Bancos e sombra com vista para o lago.",
                cat.get("lazer"), 0.0011, 0.0004, true, null, null);
        criar("Mirante", "Ponto alto com a melhor vista para fotos.",
                cat.get("lazer"), -0.0011, -0.0002, false, null, null);

        criar("Posto de Informacoes", "Apoio ao visitante, achados e perdidos e primeiros socorros.",
                cat.get("servico"), 0.0003, -0.0009, true, LocalTime.of(8, 0), LocalTime.of(18, 0));

        PontoInteresse viveiro = criar("Viveiro de Mudas", "Educacao ambiental e doacao de mudas nativas.",
                cat.get("servico"), -0.0002, 0.0013, true, LocalTime.of(9, 0), LocalTime.of(16, 0));
        viveiro.setStatusOperacional(StatusOperacional.EM_MANUTENCAO);
        poiRepository.save(viveiro);
    }

    private PontoInteresse criar(String nome, String descricao, CategoriaPoi categoria,
                                 double deltaLat, double deltaLon, boolean acessivel,
                                 LocalTime abertura, LocalTime fechamento) {
        PontoInteresse poi = new PontoInteresse(nome, descricao, categoria,
                LAT_CENTRO + deltaLat, LON_CENTRO + deltaLon);
        poi.setAcessivel(acessivel);
        poi.setHorarioAbertura(abertura);
        poi.setHorarioFechamento(fechamento);
        return poiRepository.save(poi);
    }

    private void criarEventos() {
        LocalDate hoje = LocalDate.now();
        PontoInteresse pista = porNome("Pista de Corrida");
        PontoInteresse quadra = porNome("Quadra Poliesportiva 1");
        PontoInteresse viveiro = porNome("Viveiro de Mudas");
        PontoInteresse lago = porNome("Area de Descanso do Lago");

        eventoRepository.save(new Evento("Caminhada Orientada",
                "Caminhada guiada de 3 km com alongamento no inicio e no fim.",
                hoje.plusDays(2).atTime(7, 30), hoje.plusDays(2).atTime(9, 0), pista));

        eventoRepository.save(new Evento("Torneio de Futsal",
                "Torneio aberto para equipes do municipio. Inscricao no posto de informacoes.",
                hoje.plusDays(6).atTime(9, 0), hoje.plusDays(6).atTime(17, 0), quadra));

        eventoRepository.save(new Evento("Oficina de Plantio",
                "Oficina de educacao ambiental com doacao de mudas nativas.",
                hoje.plusDays(9).atTime(10, 0), hoje.plusDays(9).atTime(12, 0), viveiro));

        eventoRepository.save(new Evento("Cinema ao Ar Livre",
                "Sessao de cinema para toda a familia. Traga sua canga.",
                hoje.plusDays(14).atTime(19, 0), hoje.plusDays(14).atTime(21, 30), lago));

        eventoRepository.save(new Evento("Feira de Artesanato",
                "Produtores e artesaos locais expondo no gramado central.",
                hoje.plusDays(20).atTime(10, 0), hoje.plusDays(20).atTime(18, 0), lago));
    }

    private void criarMissoes() {
        missaoRepository.save(new Missao("Primeiros Passos",
                "Caminhe 2,5 km dentro do parque.",
                TipoMissao.DISTANCIA, PeriodicidadeMissao.DIARIA, 2.5, 50));
        missaoRepository.save(new Missao("Turista",
                "Caminhe 5 km dentro do parque.",
                TipoMissao.DISTANCIA, PeriodicidadeMissao.DIARIA, 5, 100));
        missaoRepository.save(new Missao("Explorador do Dia",
                "Visite 3 pontos de interesse diferentes hoje.",
                TipoMissao.CHECKIN, PeriodicidadeMissao.DIARIA, 3, 80));
        missaoRepository.save(new Missao("Andarilho",
                "Complete 20 km ao longo da semana.",
                TipoMissao.DISTANCIA, PeriodicidadeMissao.SEMANAL, 20, 300));
        missaoRepository.save(new Missao("Conhecedor do Parque",
                "Visite 10 pontos de interesse na semana.",
                TipoMissao.CHECKIN, PeriodicidadeMissao.SEMANAL, 10, 250));
        missaoRepository.save(new Missao("Presenca Cultural",
                "Participe de um evento do parque nesta semana.",
                TipoMissao.EVENTO, PeriodicidadeMissao.SEMANAL, 1, 200));
    }

    /**
     * Cria o administrador inicial, para haver como testar a area de gestao.
     *
     * <p>A senha padrao esta no codigo, que e publico. Em uma instancia exposta na
     * internet isso entregaria a administracao a qualquer pessoa que leia o
     * repositorio, entao nos perfis prod e demo o administrador so e criado se
     * SMARTPARK_ADMIN_SENHA vier definida. Localmente a senha padrao continua
     * valendo, para nao atrapalhar quem esta desenvolvendo.</p>
     */
    private void criarAdministrador() {
        if (usuarioRepository.count() > 0) {
            return;
        }

        boolean exposto = ambiente.matchesProfiles("prod", "demo");
        boolean senhaPropria = !SENHA_ADMIN_PADRAO.equals(senhaAdmin);

        if (exposto && !senhaPropria) {
            log.warn("""
                    Administrador inicial NAO criado: este perfil roda exposto e a senha
                    padrao e publica (esta no repositorio). Defina a variavel de ambiente
                    SMARTPARK_ADMIN_SENHA e reinicie para criar a conta de administracao.""");
            return;
        }

        usuarioService.cadastrarComPerfil(new UsuarioRequest("Administracao do Parque",
                EMAIL_ADMIN, senhaAdmin), Perfil.ADMINISTRADOR);

        if (senhaPropria) {
            log.info("Administrador criado: {} (senha definida por variavel de ambiente).", EMAIL_ADMIN);
        } else {
            log.warn("Administrador de demonstracao criado: {} / {}", EMAIL_ADMIN, SENHA_ADMIN_PADRAO);
        }
    }

    private PontoInteresse porNome(String nome) {
        return poiRepository.findByNomeIgnoreCase(nome)
                .orElseThrow(() -> new IllegalStateException("Ponto nao encontrado na carga inicial: " + nome));
    }
}
