/**
 * Chips de filtro por categoria e por acessibilidade (RF06, RF12).
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
      <div className="secao-titulo">Filtrar por categoria</div>
      <div className="filtros">
        <button
          type="button"
          className="chip"
          aria-pressed={categoriaAtiva === null}
          style={categoriaAtiva === null ? { background: '#14532d' } : undefined}
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
              className="chip"
              aria-pressed={ativa}
              style={ativa ? { background: categoria.cor } : undefined}
              onClick={() => aoTrocarCategoria(ativa ? null : categoria.slug)}
            >
              <span className="bolinha" style={{ background: categoria.cor }} />
              {categoria.nome}
            </button>
          )
        })}
      </div>

      <label className="chip" style={{ cursor: 'pointer' }}>
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
