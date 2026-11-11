import { useEffect, useRef, useState } from 'react'
import { Logotipo } from '../icones.jsx'

/**
 * Tour de primeiro acesso (heurística 10, ajuda e documentação): três passos
 * curtos sobre o que o app faz. Aparece uma vez; dá para rever em Ajustes.
 */
const PASSOS = [
  {
    titulo: 'O parque na palma da mão',
    texto: 'Banheiros, bebedouros, quadras e lanchonetes no mapa. Toque num ponto e em "Como chegar a pé": a rota segue as trilhas do parque, mesmo sem sinal.',
  },
  {
    titulo: 'Agenda e avisos',
    texto: 'Os eventos dos próximos 30 dias ficam na Agenda. Avisos da administração, como trechos em manutenção, aparecem no topo do Feed.',
  },
  {
    titulo: 'Missões e medalhas',
    texto: 'Ao chegar num ponto, toque em "Registrar visita". Cada visita conta para as missões do dia e da semana, dá XP e libera medalhas. Para isso, é preciso uma conta gratuita.',
  },
]

export default function PrimeiroAcesso({ aoTerminar }) {
  const [passo, setPasso] = useState(0)
  const botao = useRef(null)
  useEffect(() => botao.current?.focus(), [passo])
  const ultimo = passo === PASSOS.length - 1

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-titulo">
      <div className="tour-cartao">
        <Logotipo tamanho={40} />
        <p className="tour-contador">
          {passo + 1} de {PASSOS.length}
        </p>
        <h2 id="tour-titulo">{PASSOS[passo].titulo}</h2>
        <p>{PASSOS[passo].texto}</p>
        <div className="tour-acoes">
          <button type="button" className="botao-discreto" onClick={aoTerminar}>
            Pular
          </button>
          <button
            ref={botao}
            type="button"
            className="botao-principal"
            onClick={() => (ultimo ? aoTerminar() : setPasso((p) => p + 1))}
          >
            {ultimo ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
