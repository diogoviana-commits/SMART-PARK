// Preferências da tela Ajustes, guardadas no próprio aparelho (não exigem conta).

const CHAVE = 'smartpark.ajustes'

export const PADRAO = {
  /** Tamanho do texto, em % do tamanho normal (100 a 150) */
  tamanhoTexto: 100,
  altoContraste: false,
  /** Liga o filtro "Somente pontos acessíveis" ao abrir o mapa, e a rota desvia das escadas */
  soRotasAcessiveis: false,
  /** Mostra o nome da categoria junto de cada ícone, além da cor e do desenho */
  descreverImagens: false,
  avisoEventos: true,
  avisoMissoes: true,
  avisoManutencao: true,
  /** O tour de primeiro acesso já foi visto */
  tourVisto: false,
}

export function lerPreferencias() {
  try {
    return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') }
  } catch {
    return { ...PADRAO }
  }
}

export function gravarPreferencias(p) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch {
    // armazenamento bloqueado: vale só nesta visita
  }
}

/** Aplica na página: o tamanho do texto escala tudo o que é medido em rem. */
export function aplicarPreferencias(p) {
  document.documentElement.style.fontSize = `${p.tamanhoTexto}%`
  document.body.classList.toggle('alto-contraste', p.altoContraste)
  document.body.classList.toggle('descrever-imagens', p.descreverImagens)
}
