// Desenhos dos marcadores e das legendas, um por categoria.
//
// Ficam como caminhos SVG soltos (e nao como componentes) porque servem a dois
// consumidores: o React, nas listas e chips, e o Leaflet, que monta o marcador a
// partir de uma string de HTML. Uma fonte so evita os dois desenhos divergirem.

const TRACOS = {
  // slug da categoria -> caminho em uma viewBox 24x24
  banheiro:
    'M7 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm-2.6 5h5.2l1.2 5.4H9.3V21H4.7v-7.1H3.2l1.2-5.4Zm12.6-5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM14 21l1.2-5.6h-1.9l1.7-5.1a1.6 1.6 0 0 1 1.5-1.1h1.2c.7 0 1.3.4 1.5 1.1l1.7 5.1h-1.9L21 21h-7Z',
  bebedouro:
    'M12 2.6c3.4 3.8 5.6 6.9 5.6 9.8a5.6 5.6 0 1 1-11.2 0c0-2.9 2.2-6 5.6-9.8Zm0 3.2c-2.2 2.7-3.6 5-3.6 6.6a3.6 3.6 0 0 0 7.2 0c0-1.6-1.4-3.9-3.6-6.6Z',
  alimentacao:
    'M6 2.5v7.2a2.6 2.6 0 0 0 1.8 2.5V21.5h1.9V12.2A2.6 2.6 0 0 0 11.5 9.7V2.5H9.9v5.3H8.6V2.5H7v5.3H5.7V2.5H6Zm11.2 0c-1.9 0-3.2 2.4-3.2 5.6 0 2.4.8 4 2 4.6v8.8h2V2.5h-.8Z',
  esporte:
    'M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm0 2a7.4 7.4 0 0 1 4.6 1.6l-2 2.4-4.3-1.4-.6-2.3A7.3 7.3 0 0 1 12 4.6ZM6.3 7.5l1.7 1.7-1.4 4.3-2.3.7a7.4 7.4 0 0 1 2-6.7Zm11.4 0a7.4 7.4 0 0 1 2 6.7l-2.3-.7-1.4-4.3 1.7-1.7ZM9.4 15h5.2l1.5 3.6a7.4 7.4 0 0 1-8.2 0L9.4 15Z',
  lazer:
    'M12 2.5c3.6 0 6.5 2.7 6.5 6 0 2.4-1.5 4.4-3.7 5.4l2.4 7.6h-2.1L13 14.9c-.3 0-.7.1-1 .1s-.7 0-1-.1l-2.1 6.6H6.8l2.4-7.6C7 12.9 5.5 10.9 5.5 8.5c0-3.3 2.9-6 6.5-6Z',
  servico:
    'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 2a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm-1.1 3.1h2.2v2.2h-2.2V7.6Zm0 3.6h2.2v5.3h-2.2v-5.3Z',
  entrada:
    'M4 3h9.5v2.1H6.1v13.8h7.4V21H4V3Zm11.6 4.1 5 4.9-5 4.9-1.5-1.5 2.4-2.4H9.2v-2.1h7.3l-2.4-2.3 1.5-1.5Z',
}

/** Caminho SVG da categoria, com um circulo neutro como reserva. */
export function tracoDaCategoria(slug) {
  return TRACOS[slug] ?? 'M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z'
}

/** Versao em string, para o marcador que o Leaflet monta como HTML. */
export function svgDaCategoria(slug, cor = 'currentColor', tamanho = 14) {
  return `<svg viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" fill="${cor}" aria-hidden="true"><path d="${tracoDaCategoria(slug)}"/></svg>`
}

/** Versao em React, para listas, chips e o card do ponto. */
export function IconeCategoria({ slug, tamanho = 16, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={tracoDaCategoria(slug)} />
    </svg>
  )
}
