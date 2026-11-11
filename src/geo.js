// Contas de geometria para acompanhar o visitante ao longo da rota.
//
// Numa área do tamanho de um parque, tratar latitude/longitude como um plano
// (projeção equiretangular) erra por centímetros e deixa as contas simples.

const RAIO_TERRA_METROS = 6_371_000
const rad = (graus) => (graus * Math.PI) / 180

/** Distância real entre dois pontos [lat, lon], em metros (Haversine). */
export function distancia([lat1, lon1], [lat2, lon2]) {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return RAIO_TERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Soma dos trechos de uma linha, em metros. */
export function comprimento(linha) {
  let total = 0
  for (let i = 1; i < linha.length; i++) total += distancia(linha[i - 1], linha[i])
  return total
}

/**
 * Ponto da linha mais próximo da posição.
 *
 * @returns {{ indice: number, ponto: [number, number], afastamento: number }}
 *   indice é o trecho (entre linha[indice] e linha[indice + 1]) onde ele cai, e
 *   afastamento a distância da posição até a linha, em metros
 */
export function maisProximoNaLinha(linha, posicao) {
  const escalaX = Math.cos(rad(posicao[0])) * rad(1) * RAIO_TERRA_METROS
  const escalaY = rad(1) * RAIO_TERRA_METROS
  let melhor = { indice: 0, ponto: linha[0], afastamento: Infinity }

  for (let i = 0; i < linha.length - 1; i++) {
    const ax = (linha[i][1] - posicao[1]) * escalaX
    const ay = (linha[i][0] - posicao[0]) * escalaY
    const dx = (linha[i + 1][1] - linha[i][1]) * escalaX
    const dy = (linha[i + 1][0] - linha[i][0]) * escalaY
    const tamanho2 = dx * dx + dy * dy
    const t = tamanho2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tamanho2))
    const px = ax + t * dx
    const py = ay + t * dy
    const afastamento = Math.hypot(px, py)
    if (afastamento < melhor.afastamento) {
      melhor = {
        indice: i,
        ponto: [
          linha[i][0] + t * (linha[i + 1][0] - linha[i][0]),
          linha[i][1] + t * (linha[i + 1][1] - linha[i][1]),
        ],
        afastamento,
      }
    }
  }
  return melhor
}

/**
 * O que falta da rota a partir da posição atual: do ponto da linha mais perto
 * do visitante até o destino. O trecho já percorrido some do mapa.
 */
export function trechoRestante(linha, posicao) {
  if (linha.length < 2) return { restante: linha, afastamento: 0 }
  const { indice, ponto, afastamento } = maisProximoNaLinha(linha, posicao)
  return { restante: [ponto, ...linha.slice(indice + 1)], afastamento }
}

export function distanciaLegivel(metros) {
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`
}

/** Minutos a pé, a 5 km/h — a mesma velocidade que a API usa. */
export const minutosAPe = (metros) => Math.max(1, Math.ceil(metros / (5000 / 60)))
