import { useEffect } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
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

const ICONE_DESTINO = L.divIcon({
  className: 'chegada',
  html: '<div></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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

/**
 * Enquadra a rota inteira, para origem e destino caberem na tela juntos.
 *
 * Só quando uma rota nova chega: recalcular a cada passo do visitante faria o
 * mapa pular sob o dedo de quem está mexendo nele.
 */
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
 * No modo "seguir", o mapa acompanha o visitante a cada nova posição do GPS.
 * Arrastar o mapa desliga o modo: a pessoa quis olhar outra parte.
 */
function SeguirUsuario({ posicao, seguindo, aoPararDeSeguir }) {
  const mapa = useMap()

  useMapEvents({
    dragstart: () => seguindo && aoPararDeSeguir(),
  })

  useEffect(() => {
    if (seguindo && posicao) {
      mapa.setView(posicao.coords, Math.max(mapa.getZoom(), 18), { animate: true })
    }
  }, [seguindo, posicao, mapa])

  return null
}

/**
 * Mapa com OpenStreetMap, os pontos do parque, a posição do visitante e o trecho
 * da rota que ainda falta percorrer (RF03, RF04, RF05).
 */
export default function MapaParque({
  pois,
  poiSelecionado,
  aoSelecionarPoi,
  posicaoUsuario,
  rota,
  trajeto,
  seguindo,
  aoMudarSeguindo,
}) {
  return (
    <>
      <MapContainer center={CENTRO_PARQUE} zoom={17} scrollWheelZoom zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
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

        {trajeto && trajeto.length > 1 && (
          <>
            {/* Duas linhas sobrepostas: a clara por baixo contorna a cor de tijolo,
                que contrasta com o verde do parque e com o cinza das ruas. */}
            <Polyline
              positions={trajeto}
              pathOptions={{ color: '#fbf9f4', weight: 10, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }}
              interactive={false}
            />
            <Polyline
              positions={trajeto}
              pathOptions={{ color: '#b4542f', weight: 5, lineJoin: 'round', lineCap: 'round' }}
              interactive={false}
            />
            <Marker position={trajeto[trajeto.length - 1]} icon={ICONE_DESTINO} interactive={false} />
          </>
        )}

        {posicaoUsuario && (
          <>
            {/* O círculo mostra a margem de erro do GPS: com sinal ruim, a pessoa
                vê que a bolinha azul é uma estimativa, não um ponto exato. */}
            {posicaoUsuario.precisao > 8 && (
              <Circle
                center={posicaoUsuario.coords}
                radius={posicaoUsuario.precisao}
                pathOptions={{ color: '#2f6fd0', weight: 1, fillOpacity: 0.08, opacity: 0.3 }}
                interactive={false}
              />
            )}
            <Marker position={posicaoUsuario.coords} icon={ICONE_USUARIO} alt="Sua posição" zIndexOffset={1000}>
              <Popup>Você está aqui</Popup>
            </Marker>
          </>
        )}

        <CentralizarNoSelecionado poi={poiSelecionado} />
        <EnquadrarRota rota={rota} />
        <SeguirUsuario
          posicao={posicaoUsuario}
          seguindo={seguindo}
          aoPararDeSeguir={() => aoMudarSeguindo(false)}
        />
      </MapContainer>

      {posicaoUsuario && (
        <button
          type="button"
          className="botao-mapa botao-seguir"
          aria-pressed={seguindo}
          aria-label={seguindo ? 'Parar de seguir minha posição' : 'Centralizar e seguir minha posição'}
          title={seguindo ? 'Seguindo sua posição' : 'Seguir minha posição'}
          onClick={() => aoMudarSeguindo(!seguindo)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill={seguindo ? 'currentColor' : 'none'} />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}
    </>
  )
}
