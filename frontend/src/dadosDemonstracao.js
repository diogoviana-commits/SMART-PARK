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
    "id": 11,
    "nome": "Academia ao Ar Livre",
    "descricao": "Aparelhos de musculacao e alongamento.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.631729999999997,
    "longitude": -46.57247,
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
    "nome": "Area de Descanso do Lago",
    "descricao": "Bancos e sombra com vista para o lago.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.631429999999998,
    "longitude": -46.57267,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 3,
    "nome": "Banheiro Central",
    "descricao": "Banheiro masculino e feminino, com cabine adaptada.",
    "categoria": {
      "id": 1,
      "slug": "banheiro",
      "nome": "Banheiro",
      "icone": "banheiro",
      "cor": "#3d6c8f"
    },
    "latitude": -23.63233,
    "longitude": -46.573370000000004,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 4,
    "nome": "Banheiro da Pista",
    "descricao": "Banheiro proximo a pista de corrida.",
    "categoria": {
      "id": 1,
      "slug": "banheiro",
      "nome": "Banheiro",
      "icone": "banheiro",
      "cor": "#3d6c8f"
    },
    "latitude": -23.633229999999998,
    "longitude": -46.57267,
    "horarioAbertura": "06:00:00",
    "horarioFechamento": "22:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 5,
    "nome": "Bebedouro da Praca",
    "descricao": "Bebedouro com torneira em altura acessivel.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.63213,
    "longitude": -46.57287,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 6,
    "nome": "Bebedouro do Playground",
    "descricao": "Bebedouro ao lado da area infantil.",
    "categoria": {
      "id": 2,
      "slug": "bebedouro",
      "nome": "Bebedouro",
      "icone": "bebedouro",
      "cor": "#3f8a86"
    },
    "latitude": -23.632929999999998,
    "longitude": -46.57367,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 2,
    "nome": "Entrada Norte",
    "descricao": "Acesso secundario, mais proximo do bairro Ceramica.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.63373,
    "longitude": -46.57237,
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
    "nome": "Entrada Principal",
    "descricao": "Portao principal do parque, com estacionamento ao lado.",
    "categoria": {
      "id": 7,
      "slug": "entrada",
      "nome": "Entrada e saida",
      "icone": "entrada",
      "cor": "#6b6257"
    },
    "latitude": -23.631629999999998,
    "longitude": -46.57417,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 7,
    "nome": "Lanchonete do Parque",
    "descricao": "Salgados, cafe e bebidas geladas.",
    "categoria": {
      "id": 3,
      "slug": "alimentacao",
      "nome": "Alimentacao",
      "icone": "alimentacao",
      "cor": "#b4542f"
    },
    "latitude": -23.63193,
    "longitude": -46.57327,
    "horarioAbertura": "08:00:00",
    "horarioFechamento": "18:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 14,
    "nome": "Mirante",
    "descricao": "Ponto alto com a melhor vista para fotos.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.63363,
    "longitude": -46.57327,
    "horarioAbertura": null,
    "horarioFechamento": null,
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 9,
    "nome": "Pista de Corrida",
    "descricao": "Circuito de caminhada e corrida ao redor do parque.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.63253,
    "longitude": -46.57227,
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
    "nome": "Playground",
    "descricao": "Area infantil com brinquedos e piso emborrachado.",
    "categoria": {
      "id": 5,
      "slug": "lazer",
      "nome": "Lazer e descanso",
      "icone": "lazer",
      "cor": "#7a5b8f"
    },
    "latitude": -23.63283,
    "longitude": -46.57387,
    "horarioAbertura": "07:00:00",
    "horarioFechamento": "19:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 15,
    "nome": "Posto de Informacoes",
    "descricao": "Apoio ao visitante, achados e perdidos e primeiros socorros.",
    "categoria": {
      "id": 6,
      "slug": "servico",
      "nome": "Servicos e apoio",
      "icone": "servico",
      "cor": "#2f5d3f"
    },
    "latitude": -23.63223,
    "longitude": -46.57397,
    "horarioAbertura": "08:00:00",
    "horarioFechamento": "18:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 10,
    "nome": "Quadra Poliesportiva 1",
    "descricao": "Quadra para futsal, volei e basquete.",
    "categoria": {
      "id": 4,
      "slug": "esporte",
      "nome": "Esporte",
      "icone": "esporte",
      "cor": "#4b7f52"
    },
    "latitude": -23.633029999999998,
    "longitude": -46.57197,
    "horarioAbertura": "08:00:00",
    "horarioFechamento": "21:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 8,
    "nome": "Quiosque da Trilha",
    "descricao": "Quiosque com agua de coco e sorvetes.",
    "categoria": {
      "id": 3,
      "slug": "alimentacao",
      "nome": "Alimentacao",
      "icone": "alimentacao",
      "cor": "#b4542f"
    },
    "latitude": -23.63343,
    "longitude": -46.57217,
    "horarioAbertura": "09:00:00",
    "horarioFechamento": "17:00:00",
    "statusOperacional": "EM_FUNCIONAMENTO",
    "acessivel": false,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  },
  {
    "id": 16,
    "nome": "Viveiro de Mudas",
    "descricao": "Educacao ambiental e doacao de mudas nativas.",
    "categoria": {
      "id": 6,
      "slug": "servico",
      "nome": "Servicos e apoio",
      "icone": "servico",
      "cor": "#2f5d3f"
    },
    "latitude": -23.63273,
    "longitude": -46.57177,
    "horarioAbertura": "09:00:00",
    "horarioFechamento": "16:00:00",
    "statusOperacional": "EM_MANUTENCAO",
    "acessivel": true,
    "fotoUrl": null,
    "notaMedia": null,
    "totalAvaliacoes": 0
  }
]

const EVENTOS_DEMO = [
  {
    "id": 1,
    "nome": "Caminhada Orientada",
    "descricao": "Caminhada guiada de 3 km com alongamento no inicio e no fim.",
    "emDias": 2,
    "horaInicio": "07:30",
    "horaFim": "09:00",
    "local": "Pista de Corrida",
    "poiId": 9,
    "latitude": -23.63253,
    "longitude": -46.57227,
    "linkMaisInfo": null
  },
  {
    "id": 2,
    "nome": "Torneio de Futsal",
    "descricao": "Torneio aberto para equipes do municipio. Inscricao no posto de informacoes.",
    "emDias": 6,
    "horaInicio": "09:00",
    "horaFim": "17:00",
    "local": "Quadra Poliesportiva 1",
    "poiId": 10,
    "latitude": -23.633029999999998,
    "longitude": -46.57197,
    "linkMaisInfo": null
  },
  {
    "id": 3,
    "nome": "Oficina de Plantio",
    "descricao": "Oficina de educacao ambiental com doacao de mudas nativas.",
    "emDias": 9,
    "horaInicio": "10:00",
    "horaFim": "12:00",
    "local": "Viveiro de Mudas",
    "poiId": 16,
    "latitude": -23.63273,
    "longitude": -46.57177,
    "linkMaisInfo": null
  },
  {
    "id": 4,
    "nome": "Cinema ao Ar Livre",
    "descricao": "Sessao de cinema para toda a familia. Traga sua canga.",
    "emDias": 14,
    "horaInicio": "19:00",
    "horaFim": "21:30",
    "local": "Area de Descanso do Lago",
    "poiId": 13,
    "latitude": -23.631429999999998,
    "longitude": -46.57267,
    "linkMaisInfo": null
  },
  {
    "id": 5,
    "nome": "Feira de Artesanato",
    "descricao": "Produtores e artesaos locais expondo no gramado central.",
    "emDias": 20,
    "horaInicio": "10:00",
    "horaFim": "18:00",
    "local": "Area de Descanso do Lago",
    "poiId": 13,
    "latitude": -23.631429999999998,
    "longitude": -46.57267,
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
