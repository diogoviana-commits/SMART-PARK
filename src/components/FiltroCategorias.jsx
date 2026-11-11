import { IconeCategoria } from '../icones.jsx'

/**
 * Filtros por categoria e por acessibilidade (RF06, RF12).
 *
 * No celular a fila rola na horizontal em vez de empilhar: é o padrão dos apps
 * de mapa e mantém a lista de pontos visível sem precisar rolar a tela.
 */
export default function FiltroCategorias({
  categorias,
  categoriaAtiva,
  aoTrocarCategoria,
  somenteAcessiveis,
  aoTrocarAcessibilidade,
}) {
  return (
    <>
      <div className="filtros" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          className="filtro"
          data-todos="true"
          aria-pressed={categoriaAtiva === null}
          onClick={() => aoTrocarCategoria(null)}
        >
          Todos
        </button>

        {categorias.map((categoria) => {
          const ativa = categoriaAtiva === categoria.slug
          return (
            <button
              key={categoria.slug}
              type="button"
              className="filtro"
              aria-pressed={ativa}
              style={ativa ? { background: categoria.cor } : { color: categoria.cor }}
              onClick={() => aoTrocarCategoria(ativa ? null : categoria.slug)}
            >
              <IconeCategoria slug={categoria.slug} tamanho={15} />
              <span style={ativa ? undefined : { color: 'var(--tinta)' }}>{categoria.nome}</span>
            </button>
          )
        })}
      </div>

      <label className="alternador">
        <input
          type="checkbox"
          checked={somenteAcessiveis}
          onChange={(evento) => aoTrocarAcessibilidade(evento.target.checked)}
        />
        Somente pontos acessíveis
      </label>
    </>
  )
}
