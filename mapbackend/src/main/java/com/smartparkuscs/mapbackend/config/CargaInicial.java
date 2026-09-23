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
 * <p><strong>De onde vem cada coordenada.</strong> Todas as posicoes abaixo sao as
 * do OpenStreetMap para a relacao 6746910 ("Espaco Verde Chico Mendes"), consultadas
 * pela Overpass API. Nao sao estimativas nossas: sao os objetos que colaboradores do
 * OSM levantaram em campo - os dois banheiros, os quatro bebedouros, as sete quadras,
 * os playgrounds, os quiosques cobertos, os portoes e seus horarios. Cada ponto foi
 * conferido contra o poligono do parque, e o que caiu fora (a Prefeitura, o complexo
 * de piscinas vizinho, a sede da GCM) ficou de fora.</p>
 *
 * <p>Ficam de fora tambem os 74 bancos, as 12 lixeiras e as arvores mapeadas: sao
 * mobiliario, nao destino de navegacao, e poluiriam o mapa.</p>
 *
 * <p><strong>O que ainda nao e levantamento:</strong> a agenda de eventos e exemplo,
 * e o {@link StatusOperacional} de cada ponto tambem - nao existe fonte publica de
 * "esta quadra esta em manutencao". Os nomes em portugues sao rotulos nossos, exceto
 * os de estabelecimentos, que vem do proprio OSM. Para conferir um ponto no mapa:
 * https://www.openstreetmap.org/#map=18/-23.63196/-46.57236</p>
 */
@Component
@ConditionalOnProperty(name = "smartpark.carga-inicial", havingValue = "true", matchIfMissing = true)
public class CargaInicial implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaInicial.class);

    static final String EMAIL_ADMIN = "admin@smartpark.uscs";

    /** Senha usada apenas em desenvolvimento; e publica, pois esta no repositorio. */
    static final String SENHA_ADMIN_PADRAO = "smartpark2026";

    /** Horario de funcionamento do parque, conforme os portoes no OSM (Mo-Su 06:00-22:00). */
    private static final LocalTime ABRE = LocalTime.of(6, 0);
    private static final LocalTime FECHA = LocalTime.of(22, 0);

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
        // --- Portoes e chegada ------------------------------------------------
        // Os tres portoes tem horario levantado no OSM (Mo-Su 06:00-22:00) e
        // wheelchair=yes. Os pontos de onibus nao tem tag de acessibilidade, entao
        // ficam como nao acessiveis: prometer acessibilidade que ninguem conferiu e
        // pior do que omitir, porque alguem planeja a ida contando com ela.
        criar("Entrada da Avenida Fernando Simonsen",
                "Portao principal para pedestres, com passagem para cadeira de rodas.",
                cat.get("entrada"), -23.631338, -46.573411, true, ABRE, FECHA);
        criar("Entrada do Bosque",
                "Portao de pedestres ao lado da entrada de veiculos.",
                cat.get("entrada"), -23.631224, -46.573545, true, ABRE, FECHA);
        criar("Entrada das Quadras",
                "Portao a leste, o mais proximo das quadras e dos banheiros.",
                cat.get("entrada"), -23.631844, -46.571956, true, ABRE, FECHA);
        criar("Ponto de Onibus da Entrada Principal",
                "Parada coberta e iluminada, em frente ao portao da Avenida Fernando Simonsen.",
                cat.get("entrada"), -23.631136, -46.572882, false, null, null);
        criar("Ponto de Onibus das Quadras",
                "Parada coberta e iluminada, junto a entrada leste.",
                cat.get("entrada"), -23.631987, -46.571005, false, null, null);

        // --- Banheiros --------------------------------------------------------
        criar("Banheiro das Quadras",
                "Banheiro masculino, gratuito, com cabine adaptada para cadeira de rodas.",
                cat.get("banheiro"), -23.632080, -46.570970, true, ABRE, FECHA);
        criar("Banheiro do Bosque",
                "Banheiro feminino, gratuito. Sem cabine adaptada.",
                cat.get("banheiro"), -23.631817, -46.571753, false, ABRE, FECHA);

        // --- Bebedouros -------------------------------------------------------
        // Quatro torneiras de agua potavel. Nenhuma tem a altura conferida, por isso
        // nenhuma aparece no filtro de acessibilidade.
        criar("Bebedouro das Quadras", "Torneira de agua potavel junto as quadras.",
                cat.get("bebedouro"), -23.631945, -46.571553, false, null, null);
        criar("Bebedouro da Academia", "Torneira de agua potavel ao lado dos aparelhos.",
                cat.get("bebedouro"), -23.631932, -46.572252, false, null, null);
        criar("Bebedouro dos Jardins", "Torneira de agua potavel no meio dos canteiros.",
                cat.get("bebedouro"), -23.632153, -46.572451, false, null, null);
        criar("Bebedouro dos Quiosques", "Torneira de agua potavel perto das mesas cobertas.",
                cat.get("bebedouro"), -23.631468, -46.572612, false, null, null);

        // --- Alimentacao ------------------------------------------------------
        // Os dois estabelecimentos existem, tem nome proprio e ficam na calcada da
        // Avenida Fernando Simonsen, na altura do portao principal. O horario nao
        // esta levantado no OSM, entao fica em branco em vez de inventado.
        criar("Gumis Pastelaria",
                "Pastelaria na calcada do parque, Avenida Fernando Simonsen, 501. Aceita cartao.",
                cat.get("alimentacao"), -23.631397, -46.572113, true, null, null);
        criar("Botequim Cacique",
                "Bar e petiscos na Avenida Fernando Simonsen, 503, ao lado do portao principal.",
                cat.get("alimentacao"), -23.631423, -46.572034, true, null, null);

        // --- Esporte ----------------------------------------------------------
        // Sete quadras de piso de concreto, todas iluminadas, em duas fileiras no
        // lado leste do parque.
        criar("Quadra Poliesportiva 1", QUADRA, cat.get("esporte"), -23.632163, -46.571141, false, ABRE, FECHA);
        criar("Quadra Poliesportiva 2", QUADRA, cat.get("esporte"), -23.632216, -46.571315, false, ABRE, FECHA);
        criar("Quadra Poliesportiva 3", QUADRA, cat.get("esporte"), -23.632083, -46.571359, false, ABRE, FECHA);
        criar("Quadra Poliesportiva 4", QUADRA, cat.get("esporte"), -23.632349, -46.571268, false, ABRE, FECHA);
        criar("Quadra Poliesportiva 5", QUADRA, cat.get("esporte"), -23.632079, -46.571655, false, ABRE, FECHA);
        criar("Quadra Poliesportiva 6", QUADRA, cat.get("esporte"), -23.632268, -46.571590, false, ABRE, FECHA);

        PontoInteresse quadraSete = criar("Quadra Poliesportiva 7", QUADRA,
                cat.get("esporte"), -23.632456, -46.571525, false, ABRE, FECHA);
        // Exemplo de ponto fora de operacao, para a tela mostrar esse estado. Nao ha
        // fonte publica de manutencao: quem administra o parque atualiza pela API.
        quadraSete.setStatusOperacional(StatusOperacional.EM_MANUTENCAO);
        poiRepository.save(quadraSete);

        criar("Academia ao Ar Livre do Bosque",
                "Aparelhos de alongamento e musculacao a sombra.",
                cat.get("esporte"), -23.631817, -46.572241, false, null, null);
        criar("Academia ao Ar Livre da Alameda",
                "Segundo conjunto de aparelhos, no lado oeste do parque.",
                cat.get("esporte"), -23.632351, -46.573672, false, null, null);

        // --- Lazer e descanso -------------------------------------------------
        criar("Playground do Bosque", "Area infantil aberta ao publico.",
                cat.get("lazer"), -23.631902, -46.572943, false, ABRE, FECHA);
        criar("Playground da Alameda", "Area infantil no lado oeste, perto dos quiosques.",
                cat.get("lazer"), -23.631390, -46.572965, false, ABRE, FECHA);
        criar("Playground da Entrada", "Area infantil logo apos o portao principal.",
                cat.get("lazer"), -23.631527, -46.573318, false, ABRE, FECHA);
        criar("Praca da Agua",
                "Area infantil com jatos de agua no piso. Iluminada.",
                cat.get("lazer"), -23.632497, -46.572303, false, ABRE, FECHA);
        criar("Quiosque Coberto do Lago", "Mesa com bancos e cobertura, junto ao lago.",
                cat.get("lazer"), -23.631945, -46.572590, false, null, null);
        criar("Quiosque Coberto do Bosque", "Mesa com bancos e cobertura, sob as arvores.",
                cat.get("lazer"), -23.631896, -46.572990, false, null, null);
        criar("Quiosque Coberto da Entrada", "Mesa com bancos e cobertura, perto do portao principal.",
                cat.get("lazer"), -23.631500, -46.573381, false, null, null);
        criar("Lago Principal", "Espelho de agua no centro do parque, com caminho ao redor.",
                cat.get("lazer"), -23.633180, -46.572287, false, null, null);
        criar("Lago do Bosque", "Segundo espelho de agua, na parte arborizada.",
                cat.get("lazer"), -23.631631, -46.572840, false, null, null);

        // --- Servicos ---------------------------------------------------------
        criar("Posto da Guarda Civil Municipal",
                "Base da Guarda Civil dentro do parque, ao lado do portao principal.",
                cat.get("servico"), -23.631230, -46.573455, true, null, null);
        criar("Bicicletario",
                "Trinta vagas gratuitas em suportes de parede, junto a entrada leste.",
                cat.get("servico"), -23.631714, -46.571950, true, null, null);
    }

    /** Descricao comum as sete quadras: todas tem o mesmo piso e a mesma iluminacao. */
    private static final String QUADRA =
            "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.";

    private PontoInteresse criar(String nome, String descricao, CategoriaPoi categoria,
                                 double latitude, double longitude, boolean acessivel,
                                 LocalTime abertura, LocalTime fechamento) {
        PontoInteresse poi = new PontoInteresse(nome, descricao, categoria, latitude, longitude);
        poi.setAcessivel(acessivel);
        poi.setHorarioAbertura(abertura);
        poi.setHorarioFechamento(fechamento);
        return poiRepository.save(poi);
    }

    private void criarEventos() {
        LocalDate hoje = LocalDate.now();
        // Agenda de exemplo: o parque nao publica calendario legivel por maquina, entao
        // estes cinco eventos servem para a tela de agenda ter conteudo. Cada um e
        // ancorado em um ponto que existe de verdade, para o mapa levar ao lugar certo.
        PontoInteresse portao = porNome("Entrada da Avenida Fernando Simonsen");
        PontoInteresse quadra = porNome("Quadra Poliesportiva 1");
        PontoInteresse bosque = porNome("Lago do Bosque");
        PontoInteresse lago = porNome("Lago Principal");
        PontoInteresse praca = porNome("Praca da Agua");

        eventoRepository.save(new Evento("Caminhada Orientada",
                "Caminhada guiada de 3 km, com saida no portao principal.",
                hoje.plusDays(2).atTime(7, 30), hoje.plusDays(2).atTime(9, 0), portao));

        eventoRepository.save(new Evento("Torneio de Futsal",
                "Torneio aberto para equipes do municipio. Inscricao no local.",
                hoje.plusDays(6).atTime(9, 0), hoje.plusDays(6).atTime(17, 0), quadra));

        eventoRepository.save(new Evento("Oficina de Plantio",
                "Oficina de educacao ambiental com doacao de mudas nativas.",
                hoje.plusDays(9).atTime(10, 0), hoje.plusDays(9).atTime(12, 0), bosque));

        eventoRepository.save(new Evento("Cinema ao Ar Livre",
                "Sessao de cinema para toda a familia. Traga sua canga.",
                hoje.plusDays(14).atTime(19, 0), hoje.plusDays(14).atTime(21, 30), lago));

        eventoRepository.save(new Evento("Feira de Artesanato",
                "Produtores e artesaos locais expondo em volta da praca da agua.",
                hoje.plusDays(20).atTime(10, 0), hoje.plusDays(20).atTime(18, 0), praca));
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

        boolean exposto = Ambientes.exposto(ambiente);
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
