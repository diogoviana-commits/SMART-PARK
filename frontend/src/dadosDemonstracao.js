// ARQUIVO GERADO — não edite à mão.
//
// Cópia dos dados do parque para o site continuar útil quando a API não
// responde: sem isto, o endereço publicado mostraria um mapa vazio sempre que o
// backend estivesse fora do ar, que é o estado normal enquanto ele não tem
// hospedagem fixa.
//
// Para atualizar: suba a API e rode novamente o gerador descrito no README.
// Os eventos guardam o deslocamento em dias, e não a data: datas fixas
// apareceriam vencidas em poucas semanas e a agenda ficaria vazia.

export const CATEGORIAS_DEMO = [
  {
    "id": 3,
    "slug": "alimentacao",
    "nome": "Alimentacao",
    "icone": "alimentacao",
    "cor": "#b4542f"
  },
  {
    "id": 1,
    "slug": "banheiro",
    "nome": "Banheiro",
    "icone": "banheiro",
    "cor": "#3d6c8f"
  },
  {
    "id": 2,
    "slug": "bebedouro",
    "nome": "Bebedouro",
    "icone": "bebedouro",
    "cor": "#3f8a86"
  },
  {
    "id": 7,
    "slug": "entrada",
    "nome": "Entrada e saida",
    "icone": "entrada",
    "cor": "#6b6257"
  },
  {
    "id": 4,
    "slug": "esporte",
    "nome": "Esporte",
    "icone": "esporte",
    "cor": "#4b7f52"
  },
  {
    "id": 5,
    "slug": "lazer",
    "nome": "Lazer e descanso",
    "icone": "lazer",
    "cor": "#7a5b8f"
  },
  {
    "id": 6,
    "slug": "servico",
    "nome": "Servicos e apoio",
    "icone": "servico",
    "cor": "#2f5d3f"
  }
]

export const POIS_DEMO = [
  {
    "id": 22,
    "nome": "Academia ao Ar Livre da Alameda",
    "descricao": "Segundo conjunto de aparelhos, no lado oeste do parque.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632351,
    "longitude": -46.573672,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 21,
    "nome": "Academia ao Ar Livre do Bosque",
    "descricao": "Aparelhos de alongamento e musculacao a sombra.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.631817,
    "longitude": -46.572241,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 6,
    "nome": "Banheiro das Quadras",
    "descricao": "Banheiro masculino, gratuito, com cabine adaptada para cadeira de rodas.",
    "categoria": {
      "id": 1,
      "slug": "banheiro",
      "nome": "Banheiro",
      "icone": "banheiro",
      "cor": "#3d6c8f"
    },
    "latitude": -23.63208,
    "longitude": -46.57097,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 7,
    "nome": "Banheiro do Bosque",
    "descricao": "Banheiro feminino, gratuito. Sem cabine adaptada.",
    "categoria": {
      "id": 1,
      "slug": "banheiro",
      "nome": "Banheiro",
      "icone": "banheiro",
      "cor": "#3d6c8f"
    },
    "latitude": -23.631817,
    "longitude": -46.571753,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 9,
    "nome": "Bebedouro da Academia",
    "descricao": "Torneira de agua potavel ao lado dos aparelhos.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.631932,
    "longitude": -46.572252,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 8,
    "nome": "Bebedouro das Quadras",
    "descricao": "Torneira de agua potavel junto as quadras.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.631945,
    "longitude": -46.571553,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 10,
    "nome": "Bebedouro dos Jardins",
    "descricao": "Torneira de agua potavel no meio dos canteiros.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.632153,
    "longitude": -46.572451,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 11,
    "nome": "Bebedouro dos Quiosques",
    "descricao": "Torneira de agua potavel perto das mesas cobertas.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.631468,
    "longitude": -46.572612,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 33,
    "nome": "Bicicletario",
    "descricao": "Trinta vagas gratuitas em suportes de parede, junto a entrada leste.",
    "categoria": {
      "id": 6,
      "slug": "servico",
      "nome": "Servicos e apoio",
      "icone": "servico",
      "cor": "#2f5d3f"
    },
    "latitude": -23.631714,
    "longitude": -46.57195,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 13,
    "nome": "Botequim Cacique",
    "descricao": "Bar e petiscos na Avenida Fernando Simonsen, 503, ao lado do portao principal.",
    "categoria": {
      "id": 3,
      "slug": "alimentacao",
      "nome": "Alimentacao",
      "icone": "alimentacao",
      "cor": "#b4542f"
    },
    "latitude": -23.631423,
    "longitude": -46.572034,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 1,
    "nome": "Entrada da Avenida Fernando Simonsen",
    "descricao": "Portao principal para pedestres, com passagem para cadeira de rodas.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631338,
    "longitude": -46.573411,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 3,
    "nome": "Entrada das Quadras",
    "descricao": "Portao a leste, o mais proximo das quadras e dos banheiros.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631844,
    "longitude": -46.571956,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 2,
    "nome": "Entrada do Bosque",
    "descricao": "Portao de pedestres ao lado da entrada de veiculos.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631224,
    "longitude": -46.573545,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 12,
    "nome": "Gumis Pastelaria",
    "descricao": "Pastelaria na calcada do parque, Avenida Fernando Simonsen, 501. Aceita cartao.",
    "categoria": {
      "id": 3,
      "slug": "alimentacao",
      "nome": "Alimentacao",
      "icone": "alimentacao",
      "cor": "#b4542f"
    },
    "latitude": -23.631397,
    "longitude": -46.572113,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 31,
    "nome": "Lago do Bosque",
    "descricao": "Segundo espelho de agua, na parte arborizada.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631631,
    "longitude": -46.57284,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 30,
    "nome": "Lago Principal",
    "descricao": "Espelho de agua no centro do parque, com caminho ao redor.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.63318,
    "longitude": -46.572287,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 24,
    "nome": "Playground da Alameda",
    "descricao": "Area infantil no lado oeste, perto dos quiosques.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.63139,
    "longitude": -46.572965,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 25,
    "nome": "Playground da Entrada",
    "descricao": "Area infantil logo apos o portao principal.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631527,
    "longitude": -46.573318,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 23,
    "nome": "Playground do Bosque",
    "descricao": "Area infantil aberta ao publico.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631902,
    "longitude": -46.572943,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 4,
    "nome": "Ponto de Onibus da Entrada Principal",
    "descricao": "Parada coberta e iluminada, em frente ao portao da Avenida Fernando Simonsen.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631136,
    "longitude": -46.572882,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 5,
    "nome": "Ponto de Onibus das Quadras",
    "descricao": "Parada coberta e iluminada, junto a entrada leste.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631987,
    "longitude": -46.571005,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 32,
    "nome": "Posto da Guarda Civil Municipal",
    "descricao": "Base da Guarda Civil dentro do parque, ao lado do portao principal.",
    "categoria": {
      "id": 6,
      "slug": "servico",
      "nome": "Servicos e apoio",
      "icone": "servico",
      "cor": "#2f5d3f"
    },
    "latitude": -23.63123,
    "longitude": -46.573455,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 26,
    "nome": "Praca da Agua",
    "descricao": "Area infantil com jatos de agua no piso. Iluminada.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.632497,
    "longitude": -46.572303,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 14,
    "nome": "Quadra Poliesportiva 1",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632163,
    "longitude": -46.571141,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 15,
    "nome": "Quadra Poliesportiva 2",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632216,
    "longitude": -46.571315,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 16,
    "nome": "Quadra Poliesportiva 3",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632083,
    "longitude": -46.571359,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 17,
    "nome": "Quadra Poliesportiva 4",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632349,
    "longitude": -46.571268,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 18,
    "nome": "Quadra Poliesportiva 5",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632079,
    "longitude": -46.571655,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 19,
    "nome": "Quadra Poliesportiva 6",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632268,
    "longitude": -46.57159,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 20,
    "nome": "Quadra Poliesportiva 7",
    "descricao": "Quadra de piso de concreto, iluminada, para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.632456,
    "longitude": -46.571525,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_MANUTENCAO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 29,
    "nome": "Quiosque Coberto da Entrada",
    "descricao": "Mesa com bancos e cobertura, perto do portao principal.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.6315,
    "longitude": -46.573381,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 28,
    "nome": "Quiosque Coberto do Bosque",
    "descricao": "Mesa com bancos e cobertura, sob as arvores.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631896,
    "longitude": -46.57299,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 27,
    "nome": "Quiosque Coberto do Lago",
    "descricao": "Mesa com bancos e cobertura, junto ao lago.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631945,
    "longitude": -46.57259,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  }
]

const EVENTOS_DEMO = [
  {
    "id": 1,
    "nome": "Caminhada Orientada",
    "descricao": "Caminhada guiada de 3 km, com saida no portao principal.",
    "emDias": 2,
    "horaInicio": "07:30",
    "horaFim": "09:00",
    "local": "Entrada da Avenida Fernando Simonsen",
    "poiId": 1,
    "latitude": -23.631338,
    "longitude": -46.573411,
    "linkMaisInfo": null
  },
  {
    "id": 2,
    "nome": "Torneio de Futsal",
    "descricao": "Torneio aberto para equipes do municipio. Inscricao no local.",
    "emDias": 6,
    "horaInicio": "09:00",
    "horaFim": "17:00",
    "local": "Quadra Poliesportiva 1",
    "poiId": 14,
    "latitude": -23.632163,
    "longitude": -46.571141,
    "linkMaisInfo": null
  },
  {
    "id": 3,
    "nome": "Oficina de Plantio",
    "descricao": "Oficina de educacao ambiental com doacao de mudas nativas.",
    "emDias": 9,
    "horaInicio": "10:00",
    "horaFim": "12:00",
    "local": "Lago do Bosque",
    "poiId": 31,
    "latitude": -23.631631,
    "longitude": -46.57284,
    "linkMaisInfo": null
  },
  {
    "id": 4,
    "nome": "Cinema ao Ar Livre",
    "descricao": "Sessao de cinema para toda a familia. Traga sua canga.",
    "emDias": 14,
    "horaInicio": "19:00",
    "horaFim": "21:30",
    "local": "Lago Principal",
    "poiId": 30,
    "latitude": -23.63318,
    "longitude": -46.572287,
    "linkMaisInfo": null
  },
  {
    "id": 5,
    "nome": "Feira de Artesanato",
    "descricao": "Produtores e artesaos locais expondo em volta da praca da agua.",
    "emDias": 20,
    "horaInicio": "10:00",
    "horaFim": "18:00",
    "local": "Praca da Agua",
    "poiId": 26,
    "latitude": -23.632497,
    "longitude": -46.572303,
    "linkMaisInfo": null
  }
]

/** Reconstrói a agenda a partir de hoje, no mesmo formato que a API devolve. */
export function eventosDemo() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return EVENTOS_DEMO.map((evento) => {
    const dia = new Date(hoje)
    dia.setDate(dia.getDate() + evento.emDias)

    const com = (hora) => {
      if (!hora) return null
      const [h, m] = hora.split(':')
      const d = new Date(dia)
      d.setHours(Number(h), Number(m), 0, 0)
      // Formato local sem fuso, igual ao que o backend envia.
      const p = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
        `T${p(d.getHours())}:${p(d.getMinutes())}:00`
    }

    return {
      id: evento.id,
      nome: evento.nome,
      descricao: evento.descricao,
      dataHoraInicio: com(evento.horaInicio),
      dataHoraFim: com(evento.horaFim),
      local: evento.local,
      poiId: evento.poiId,
      latitude: evento.latitude,
      longitude: evento.longitude,
      linkMaisInfo: evento.linkMaisInfo,
    }
  }).sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))
}

/** Aplica os mesmos filtros que o endpoint /api/pois aplica no banco. */
export function poisDemo({ busca, categoria, acessivel } = {}) {
  const termo = (busca ?? '').trim().toLowerCase()

  return POIS_DEMO.filter((poi) => {
    if (categoria && poi.categoria.slug !== categoria) return false
    if (acessivel && !poi.acessivel) return false
    if (!termo) return true
    return (
      poi.nome.toLowerCase().includes(termo) ||
      (poi.descricao ?? '').toLowerCase().includes(termo)
    )
  })
}
