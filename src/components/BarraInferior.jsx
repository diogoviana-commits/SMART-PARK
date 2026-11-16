/**
 * Barra inferior: os mesmos cinco destinos, na mesma ordem, em todas as telas
 * (heurística 4, consistência). Missões fica no centro, em destaque, como no
 * protótipo. O destino ativo fica preenchido em lima.
 */
const DESTINOS = [
  {
    id: 'mapa',
    rotulo: 'Mapa',
    icone: <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />,
  },
  {
    id: 'agenda',
    rotulo: 'Agenda',
    icone: <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Zm2 2v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Zm-8 4v2h2v-2H7Zm4 0v2h2v-2h-2Z" />,
  },
  {
    id: 'missoes',
    rotulo: 'Missões',
    centro: true,
    icone: <path d="M12 2 7 9h3l-4 6h4.5L8 20h8l-2.5-5H18l-4-6h3l-5-7Zm-1 18v2h2v-2h-2Z" />,
  },
  {
    id: 'feed',
    rotulo: 'Feed',
    icone: <path d="M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7.5 1a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM9 14c-3.9 0-7 2-7 4.5V20h14v-1.5C16 16 12.9 14 9 14Zm7.6.1A5.6 5.6 0 0 1 18 18.5V20h4v-1.5c0-2.2-2.4-4-5.4-4.4Z" />,
  },
  {
    id: 'perfil',
    rotulo: 'Perfil',
    icone: <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 12c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z" />,
  },
]

export default function BarraInferior({ tela, irPara }) {
  const ativa = tela === 'ajustes' || tela === 'admin' ? 'perfil' : tela
  return (
    <nav className="barra-inferior" aria-label="Navegação principal">
      {DESTINOS.map((d) => (
        <button
          key={d.id}
          type="button"
          className={`destino${d.centro ? ' destino-centro' : ''}`}
          aria-current={ativa === d.id ? 'page' : undefined}
          onClick={() => irPara(d.id)}
        >
          <span className="destino-icone">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {d.icone}
            </svg>
          </span>
          <span className="destino-rotulo">{d.rotulo}</span>
        </button>
      ))}
    </nav>
  )
}
