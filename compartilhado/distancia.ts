/** Raio médio da Terra, em metros. */
export const RAIO_TERRA_METROS = 6_371_000

const rad = (graus: number) => (graus * Math.PI) / 180

/** Distância sobre a superfície da Terra (Haversine), em metros. */
export function distanciaEmMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return RAIO_TERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** NaN ou coordenada fora do globo indicam requisição montada errado, não uma posição. */
export function coordenadaValida(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}
