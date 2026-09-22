import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

// Centro do Espaco Verde Chico Mendes segundo o OpenStreetMap.
// Mantenha igual ao LAT_CENTRO/LON_CENTRO da carga inicial do backend.
export const CENTRO_PARQUE = [-23.63253, -46.57307]

function iconeDoPoi(poi, selecionado) {
  return L.divIcon({
    className: `marcador-poi ${selecionado ? 'selecionado' : ''}`,
    html: `<div class="pino" style="background:${poi.categoria.cor}"></div>`,
    iconSize: selecionado ? [30, 30] : [22, 22],
    iconAnchor: selecionado ? [15, 30] : [11, 22],
    popupAnchor: [0, -20],
  })
}

const ICONE_USUARIO = L.divIcon({
  className: 'marcador-usuario',
  html: '<div class="ponto"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/** Move o mapa quando um ponto e escolhido na lista, na agenda ou na busca. */
function CentralizarNoSelecionado({ poi }) {
  const mapa = useMap()

  useEffect(() => {
    if (poi) {
      mapa.flyTo([poi.latitude, poi.longitude], Math.max(mapa.getZoom(), 18), { duration: 0.6 })
    }
  }, [poi, mapa])

  return null
}

/**
 * Mapa interativo com OpenStreetMap, marcadores dos pontos, posicao do
 * visitante e a linha da rota calculada (RF03, RF04, RF05).
 */
export default function MapaParque({ pois, poiSelecionado, aoSelecionarPoi, posicaoUsuario, rota }) {
  return (
    <MapContainer center={CENTRO_PARQUE} zoom={17} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.latitude, poi.longitude]}
          icon={iconeDoPoi(poi, poiSelecionado?.id === poi.id)}
          eventHandlers={{ click: () => aoSelecionarPoi(poi) }}
        >
          <Popup>
            <strong>{poi.nome}</strong>
            <br />
            {poi.categoria.nome}
          </Popup>
        </Marker>
      ))}

      {posicaoUsuario && (
        <Marker position={posicaoUsuario} icon={ICONE_USUARIO}>
          <Popup>Você está aqui</Popup>
        </Marker>
      )}

      {rota && (
        <Polyline
          positions={rota.pontos.map((ponto) => [ponto.latitude, ponto.longitude])}
          pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.85, dashArray: '8 8' }}
        />
      )}

      <CentralizarNoSelecionado poi={poiSelecionado} />
    </MapContainer>
  )
}
