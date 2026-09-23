import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { svgDaCategoria } from '../icones.jsx'

// Centro do Espaco Verde Chico Mendes segundo o OpenStreetMap.
// Centro do retangulo que contem os pontos do parque, nao o centroide do
// poligono: o lado oeste do Espaco Verde e area da Prefeitura, sem pontos
// mapeados, e centrar nele deixaria metade da tela vazia.
export const CENTRO_PARQUE = [-23.63216, -46.5723]

/**
 * Marcador em forma de alfinete com o ícone da categoria dentro.
 *
 * A cor sozinha não basta: quem não distingue bem as cores continuaria sem saber
 * o que é cada ponto. O desenho dentro do alfinete resolve isso.
 */
function alfinete(poi, selecionado) {
  const lado = selecionado ? 36 : 28
  return L.divIcon({
    className: 'pino',
    html: `<div data-ativo="${selecionado}" style="background:${poi.categoria.cor}">${svgDaCategoria(
      poi.categoria.slug,
      '#fbf9f4',
      selecionado ? 17 : 13,
    )}</div>`,
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado],
    popupAnchor: [0, -lado + 4],
  })
}

const ICONE_USUARIO = L.divIcon({
  className: 'eu-aqui',
  html: '<div></div>',
  iconSize: [15, 15],
  iconAnchor: [7.5, 7.5],
})

/** Move o mapa quando um ponto é escolhido na lista, na agenda ou na busca. */
function CentralizarNoSelecionado({ poi }) {
  const mapa = useMap()

  useEffect(() => {
    if (poi) {
      mapa.flyTo([poi.latitude, poi.longitude], Math.max(mapa.getZoom(), 18), { duration: 0.6 })
    }
  }, [poi, mapa])

  return null
}

/** Enquadra a rota inteira, para origem e destino caberem na tela juntos. */
function EnquadrarRota({ rota }) {
  const mapa = useMap()

  useEffect(() => {
    if (!rota) return
    const limites = L.latLngBounds(rota.pontos.map((p) => [p.latitude, p.longitude]))
    mapa.fitBounds(limites, { padding: [56, 56], maxZoom: 18 })
  }, [rota, mapa])

  return null
}

/**
 * Mapa com OpenStreetMap, os pontos do parque, a posição do visitante e a linha
 * da rota calculada (RF03, RF04, RF05).
 */
export default function MapaParque({ pois, poiSelecionado, aoSelecionarPoi, posicaoUsuario, rota }) {
  return (
    <MapContainer center={CENTRO_PARQUE} zoom={17} scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Canto inferior direito fica ao alcance do polegar; no celular o CSS
          esconde o controle, porque ali o gesto de pinca ja resolve. */}
      <ZoomControl position="bottomright" />

      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.latitude, poi.longitude]}
          icon={alfinete(poi, poiSelecionado?.id === poi.id)}
          eventHandlers={{ click: () => aoSelecionarPoi(poi) }}
          alt={poi.nome}
        >
          <Popup>
            <strong>{poi.nome}</strong>
            <br />
            {poi.categoria.nome}
          </Popup>
        </Marker>
      ))}

      {posicaoUsuario && (
        <Marker position={posicaoUsuario} icon={ICONE_USUARIO} alt="Sua posição">
          <Popup>Você está aqui</Popup>
        </Marker>
      )}

      {rota && (
        <>
          {/* Duas linhas sobrepostas: uma escura por baixo dá contorno à verde,
              para o trajeto não sumir sobre o verde do mapa. */}
          <Polyline
            positions={rota.pontos.map((ponto) => [ponto.latitude, ponto.longitude])}
            pathOptions={{ color: '#20402f', weight: 8, opacity: 0.35 }}
          />
          <Polyline
            positions={rota.pontos.map((ponto) => [ponto.latitude, ponto.longitude])}
            pathOptions={{ color: '#f2ece1', weight: 4, dashArray: '1 9', lineCap: 'round' }}
          />
        </>
      )}

      <CentralizarNoSelecionado poi={poiSelecionado} />
      <EnquadrarRota rota={rota} />
    </MapContainer>
  )
}
