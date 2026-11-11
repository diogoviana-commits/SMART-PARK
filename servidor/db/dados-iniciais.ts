/**
 * Conteúdo inicial do parque: o que a API cadastra num banco vazio.
 *
 * As coordenadas e as características dos pontos vêm do OpenStreetMap (relação
 * 6746910, "Espaço Verde Chico Mendes"), levantadas pela Overpass API e
 * conferidas contra o polígono do parque. Não são estimativas do grupo.
 *
 * Ainda não vêm de levantamento a agenda de eventos e a situação operacional de
 * cada ponto: não existe fonte pública desses dois. São conteúdo de exemplo, que
 * a administração do parque substitui pelas rotas de administração.
 */

export const ABRE = '06:00:00'
export const FECHA = '22:00:00'

export interface CategoriaInicial {
  slug: string
  nome: string
  cor: string
}

/** O ícone de cada categoria é desenhado pelo site a partir do slug. */
export const CATEGORIAS: CategoriaInicial[] = [
  { slug: 'banheiro', nome: 'Banheiro', cor: '#3d6c8f' },
  { slug: 'bebedouro', nome: 'Bebedouro', cor: '#3f8a86' },
  { slug: 'alimentacao', nome: 'Alimentação', cor: '#b4542f' },
  { slug: 'esporte', nome: 'Esporte', cor: '#4b7f52' },
  { slug: 'lazer', nome: 'Lazer e descanso', cor: '#7a5b8f' },
  { slug: 'servico', nome: 'Serviços e apoio', cor: '#2f5d3f' },
  { slug: 'entrada', nome: 'Entrada e saída', cor: '#6b6257' },
]

export interface PontoInicial {
  nome: string
  descricao: string
  categoria: string
  latitude: number
  longitude: number
  acessivel: boolean
  abertura: string | null
  fechamento: string | null
  status?: 'EM_FUNCIONAMENTO' | 'EM_MANUTENCAO' | 'FECHADO'
}

const QUADRA = 'Quadra de piso de concreto, iluminada, para futsal, vôlei e basquete.'

/**
 * Os três portões têm horário levantado no OSM (Mo-Su 06:00-22:00) e
 * wheelchair=yes. Os pontos de ônibus não têm tag de acessibilidade, então ficam
 * como não acessíveis: prometer acessibilidade que ninguém conferiu é pior do que
 * omitir, porque alguém planeja a ida contando com ela.
 */
export const PONTOS: PontoInicial[] = [
  // Portões e chegada
  { nome: 'Entrada da Avenida Fernando Simonsen', descricao: 'Portão principal para pedestres, com passagem para cadeira de rodas.', categoria: 'entrada', latitude: -23.631338, longitude: -46.573411, acessivel: true, abertura: ABRE, fechamento: FECHA },
  { nome: 'Entrada do Bosque', descricao: 'Portão de pedestres ao lado da entrada de veículos.', categoria: 'entrada', latitude: -23.631224, longitude: -46.573545, acessivel: true, abertura: ABRE, fechamento: FECHA },
  { nome: 'Entrada das Quadras', descricao: 'Portão a leste, o mais próximo das quadras e dos banheiros.', categoria: 'entrada', latitude: -23.631844, longitude: -46.571956, acessivel: true, abertura: ABRE, fechamento: FECHA },
  { nome: 'Ponto de Ônibus da Entrada Principal', descricao: 'Parada coberta e iluminada, em frente ao portão da Avenida Fernando Simonsen.', categoria: 'entrada', latitude: -23.631136, longitude: -46.572882, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Ponto de Ônibus das Quadras', descricao: 'Parada coberta e iluminada, junto à entrada leste.', categoria: 'entrada', latitude: -23.631987, longitude: -46.571005, acessivel: false, abertura: null, fechamento: null },

  // Banheiros
  { nome: 'Banheiro das Quadras', descricao: 'Banheiro masculino, gratuito, com cabine adaptada para cadeira de rodas.', categoria: 'banheiro', latitude: -23.63208, longitude: -46.57097, acessivel: true, abertura: ABRE, fechamento: FECHA },
  { nome: 'Banheiro do Bosque', descricao: 'Banheiro feminino, gratuito. Sem cabine adaptada.', categoria: 'banheiro', latitude: -23.631817, longitude: -46.571753, acessivel: false, abertura: ABRE, fechamento: FECHA },

  // Bebedouros: nenhum tem a altura conferida, por isso nenhum entra no filtro de acessibilidade
  { nome: 'Bebedouro das Quadras', descricao: 'Torneira de água potável junto às quadras.', categoria: 'bebedouro', latitude: -23.631945, longitude: -46.571553, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Bebedouro da Academia', descricao: 'Torneira de água potável ao lado dos aparelhos.', categoria: 'bebedouro', latitude: -23.631932, longitude: -46.572252, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Bebedouro dos Jardins', descricao: 'Torneira de água potável no meio dos canteiros.', categoria: 'bebedouro', latitude: -23.632153, longitude: -46.572451, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Bebedouro dos Quiosques', descricao: 'Torneira de água potável perto das mesas cobertas.', categoria: 'bebedouro', latitude: -23.631468, longitude: -46.572612, acessivel: false, abertura: null, fechamento: null },

  // Alimentação: o horário não está levantado no OSM, então fica em branco em vez de inventado
  { nome: 'Gumis Pastelaria', descricao: 'Pastelaria na calçada do parque, Avenida Fernando Simonsen, 501. Aceita cartão.', categoria: 'alimentacao', latitude: -23.631397, longitude: -46.572113, acessivel: true, abertura: null, fechamento: null },
  { nome: 'Botequim Cacique', descricao: 'Bar e petiscos na Avenida Fernando Simonsen, 503, ao lado do portão principal.', categoria: 'alimentacao', latitude: -23.631423, longitude: -46.572034, acessivel: true, abertura: null, fechamento: null },

  // Esporte: sete quadras iluminadas, em duas fileiras no lado leste
  { nome: 'Quadra Poliesportiva 1', descricao: QUADRA, categoria: 'esporte', latitude: -23.632163, longitude: -46.571141, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quadra Poliesportiva 2', descricao: QUADRA, categoria: 'esporte', latitude: -23.632216, longitude: -46.571315, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quadra Poliesportiva 3', descricao: QUADRA, categoria: 'esporte', latitude: -23.632083, longitude: -46.571359, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quadra Poliesportiva 4', descricao: QUADRA, categoria: 'esporte', latitude: -23.632349, longitude: -46.571268, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quadra Poliesportiva 5', descricao: QUADRA, categoria: 'esporte', latitude: -23.632079, longitude: -46.571655, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quadra Poliesportiva 6', descricao: QUADRA, categoria: 'esporte', latitude: -23.632268, longitude: -46.57159, acessivel: false, abertura: ABRE, fechamento: FECHA },
  // Exemplo de ponto fora de operação, para a tela mostrar esse estado
  { nome: 'Quadra Poliesportiva 7', descricao: QUADRA, categoria: 'esporte', latitude: -23.632456, longitude: -46.571525, acessivel: false, abertura: ABRE, fechamento: FECHA, status: 'EM_MANUTENCAO' },
  { nome: 'Academia ao Ar Livre do Bosque', descricao: 'Aparelhos de alongamento e musculação à sombra.', categoria: 'esporte', latitude: -23.631817, longitude: -46.572241, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Academia ao Ar Livre da Alameda', descricao: 'Segundo conjunto de aparelhos, no lado oeste do parque.', categoria: 'esporte', latitude: -23.632351, longitude: -46.573672, acessivel: false, abertura: null, fechamento: null },

  // Lazer e descanso
  { nome: 'Playground do Bosque', descricao: 'Área infantil aberta ao público.', categoria: 'lazer', latitude: -23.631902, longitude: -46.572943, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Playground da Alameda', descricao: 'Área infantil no lado oeste, perto dos quiosques.', categoria: 'lazer', latitude: -23.63139, longitude: -46.572965, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Playground da Entrada', descricao: 'Área infantil logo após o portão principal.', categoria: 'lazer', latitude: -23.631527, longitude: -46.573318, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Praça da Água', descricao: 'Área infantil com jatos de água no piso. Iluminada.', categoria: 'lazer', latitude: -23.632497, longitude: -46.572303, acessivel: false, abertura: ABRE, fechamento: FECHA },
  { nome: 'Quiosque Coberto do Lago', descricao: 'Mesa com bancos e cobertura, junto ao lago.', categoria: 'lazer', latitude: -23.631945, longitude: -46.57259, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Quiosque Coberto do Bosque', descricao: 'Mesa com bancos e cobertura, sob as árvores.', categoria: 'lazer', latitude: -23.631896, longitude: -46.57299, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Quiosque Coberto da Entrada', descricao: 'Mesa com bancos e cobertura, perto do portão principal.', categoria: 'lazer', latitude: -23.6315, longitude: -46.573381, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Lago Principal', descricao: 'Espelho d’água no centro do parque, com caminho ao redor.', categoria: 'lazer', latitude: -23.63318, longitude: -46.572287, acessivel: false, abertura: null, fechamento: null },
  { nome: 'Lago do Bosque', descricao: 'Segundo espelho d’água, na parte arborizada.', categoria: 'lazer', latitude: -23.631631, longitude: -46.57284, acessivel: false, abertura: null, fechamento: null },

  // Serviços
  { nome: 'Posto da Guarda Civil Municipal', descricao: 'Base da Guarda Civil dentro do parque, ao lado do portão principal.', categoria: 'servico', latitude: -23.63123, longitude: -46.573455, acessivel: true, abertura: null, fechamento: null },
  { nome: 'Bicicletário', descricao: 'Trinta vagas gratuitas em suportes de parede, junto à entrada leste.', categoria: 'servico', latitude: -23.631714, longitude: -46.57195, acessivel: true, abertura: null, fechamento: null },
]

export interface EventoInicial {
  nome: string
  descricao: string
  /** Dias a partir da data da carga */
  emDias: number
  inicio: string
  fim: string
  local: string
}

/**
 * Agenda de exemplo: o parque não publica calendário legível por máquina. Cada
 * evento é ancorado num ponto que existe de verdade, para o mapa levar ao lugar.
 */
export const EVENTOS: EventoInicial[] = [
  { nome: 'Caminhada Orientada', descricao: 'Caminhada guiada de 3 km, com saída no portão principal.', emDias: 2, inicio: '07:30', fim: '09:00', local: 'Entrada da Avenida Fernando Simonsen' },
  { nome: 'Torneio de Futsal', descricao: 'Torneio aberto para equipes do município. Inscrição no local.', emDias: 6, inicio: '09:00', fim: '17:00', local: 'Quadra Poliesportiva 1' },
  { nome: 'Oficina de Plantio', descricao: 'Oficina de educação ambiental com doação de mudas nativas.', emDias: 9, inicio: '10:00', fim: '12:00', local: 'Lago do Bosque' },
  { nome: 'Cinema ao Ar Livre', descricao: 'Sessão de cinema para toda a família. Traga sua canga.', emDias: 14, inicio: '19:00', fim: '21:30', local: 'Lago Principal' },
  { nome: 'Feira de Artesanato', descricao: 'Produtores e artesãos locais expondo em volta da Praça da Água.', emDias: 20, inicio: '10:00', fim: '18:00', local: 'Praça da Água' },
]

export interface MissaoInicial {
  nome: string
  descricao: string
  tipo: 'DISTANCIA' | 'CHECKIN' | 'EVENTO'
  periodicidade: 'DIARIA' | 'SEMANAL'
  meta: number
  pontos: number
}

export const MISSOES: MissaoInicial[] = [
  { nome: 'Primeiros Passos', descricao: 'Caminhe 2,5 km dentro do parque.', tipo: 'DISTANCIA', periodicidade: 'DIARIA', meta: 2.5, pontos: 50 },
  { nome: 'Turista', descricao: 'Caminhe 5 km dentro do parque.', tipo: 'DISTANCIA', periodicidade: 'DIARIA', meta: 5, pontos: 100 },
  { nome: 'Explorador do Dia', descricao: 'Visite 3 pontos de interesse diferentes hoje.', tipo: 'CHECKIN', periodicidade: 'DIARIA', meta: 3, pontos: 80 },
  { nome: 'Andarilho', descricao: 'Complete 20 km ao longo da semana.', tipo: 'DISTANCIA', periodicidade: 'SEMANAL', meta: 20, pontos: 300 },
  { nome: 'Conhecedor do Parque', descricao: 'Visite 10 pontos de interesse na semana.', tipo: 'CHECKIN', periodicidade: 'SEMANAL', meta: 10, pontos: 250 },
  { nome: 'Presença Cultural', descricao: 'Participe de um evento do parque nesta semana.', tipo: 'EVENTO', periodicidade: 'SEMANAL', meta: 1, pontos: 200 },
]

/**
 * Textos gravados sem acento pela versão em Java. A migração V4 troca cada um
 * pelo texto acentuado acima; a lista existe para o banco já publicado, que não
 * passa pela carga inicial de novo.
 */
export const SEM_ACENTO = {
  categorias: { alimentacao: 'Alimentacao', servico: 'Servicos e apoio', entrada: 'Entrada e saida' },
  pontos: {
    'Ponto de Onibus da Entrada Principal': 'Ponto de Ônibus da Entrada Principal',
    'Ponto de Onibus das Quadras': 'Ponto de Ônibus das Quadras',
    'Praca da Agua': 'Praça da Água',
    Bicicletario: 'Bicicletário',
  },
  missoes: { 'Presenca Cultural': 'Presença Cultural' },
} as const
