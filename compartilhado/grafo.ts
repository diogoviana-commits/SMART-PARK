/**
 * Rede de caminhos a pé do parque e das ruas em volta, com o menor trajeto entre
 * duas posições quaisquer (RF05).
 *
 * Os dados vêm do OpenStreetMap, convertidos em nós e trechos pelo script
 * scripts/gerar-trilhas.py (cerca de 4.200 nós e 4.700 trechos). O cálculo roda
 * no próprio aparelho do visitante, então a rota funciona mesmo sem sinal.
 *
 * Portado de GrafoDeTrilhas.java e RotaService.java, com as mesmas regras.
 */
import { distanciaEmMetros, RAIO_TERRA_METROS } from './distancia.js'

/** Tipos de trecho, na ordem gravada pelo script. */
export const CAMINHO = 0
export const RUA = 1
export const ESCADA = 2

/**
 * Quanto cada tipo de trecho "custa" a mais que a distância real. Faz a rota
 * preferir as trilhas do parque à calçada da avenida quando a diferença de
 * distância é pequena. A distância exibida ao visitante continua sendo a real.
 */
export const PESO = [1.0, 1.3, 1.5] as const

/** Velocidade média de caminhada: 5 km/h, o padrão de aplicativos de rota a pé. */
export const VELOCIDADE_M_POR_MIN = 5_000 / 60

/** A partir desta distância até o caminho mais próximo, o visitante está fora da área mapeada. */
export const LIMITE_FORA_DOS_CAMINHOS_M = 150

/** Ligações mais curtas que isto não viram um ponto a mais na linha. */
const PONTO_REPETIDO_M = 1

export interface DadosDaRede {
  /** [latitude, longitude] de cada nó */
  nos: [number, number][]
  /** [nó de origem, nó de destino, tipo] de cada trecho */
  arestas: [number, number, number][]
}

export interface Coordenada {
  latitude: number
  longitude: number
}

interface Encaixe {
  trecho: number
  fracao: number
  latitude: number
  longitude: number
  distancia: number
}

/** Fila de prioridade mínima (heap binário), para o Dijkstra. */
class Fila {
  private custos: number[] = []
  private nos: number[] = []

  get vazia() {
    return this.custos.length === 0
  }

  inserir(custo: number, no: number) {
    this.custos.push(custo)
    this.nos.push(no)
    let i = this.custos.length - 1
    while (i > 0) {
      const pai = (i - 1) >> 1
      if (this.custos[pai] <= this.custos[i]) break
      this.trocar(i, pai)
      i = pai
    }
  }

  retirar(): [number, number] {
    const topo: [number, number] = [this.custos[0], this.nos[0]]
    const ultimoCusto = this.custos.pop()!
    const ultimoNo = this.nos.pop()!
    if (this.custos.length > 0) {
      this.custos[0] = ultimoCusto
      this.nos[0] = ultimoNo
      let i = 0
      for (;;) {
        const e = 2 * i + 1
        const d = e + 1
        let menor = i
        if (e < this.custos.length && this.custos[e] < this.custos[menor]) menor = e
        if (d < this.custos.length && this.custos[d] < this.custos[menor]) menor = d
        if (menor === i) break
        this.trocar(i, menor)
        i = menor
      }
    }
    return topo
  }

  private trocar(a: number, b: number) {
    ;[this.custos[a], this.custos[b]] = [this.custos[b], this.custos[a]]
    ;[this.nos[a], this.nos[b]] = [this.nos[b], this.nos[a]]
  }
}

export class GrafoDeTrilhas {
  private readonly lat: Float64Array
  private readonly lon: Float64Array
  private readonly origem: Int32Array
  private readonly destino: Int32Array
  private readonly tipo: Uint8Array
  private readonly comprimento: Float64Array
  /** Para cada nó, os índices dos trechos que saem dele. */
  private readonly trechosDoNo: Int32Array[]

  constructor(dados: DadosDaRede) {
    const n = dados.nos.length
    const t = dados.arestas.length
    this.lat = new Float64Array(n)
    this.lon = new Float64Array(n)
    dados.nos.forEach(([la, lo], i) => {
      this.lat[i] = la
      this.lon[i] = lo
    })
    this.origem = new Int32Array(t)
    this.destino = new Int32Array(t)
    this.tipo = new Uint8Array(t)
    this.comprimento = new Float64Array(t)
    const grau = new Int32Array(n)
    dados.arestas.forEach(([a, b, k], i) => {
      this.origem[i] = a
      this.destino[i] = b
      this.tipo[i] = k
      this.comprimento[i] = distanciaEmMetros(this.lat[a], this.lon[a], this.lat[b], this.lon[b])
      grau[a]++
      grau[b]++
    })
    this.trechosDoNo = Array.from({ length: n }, (_, i) => new Int32Array(grau[i]))
    const preenchido = new Int32Array(n)
    for (let i = 0; i < t; i++) {
      this.trechosDoNo[this.origem[i]][preenchido[this.origem[i]]++] = i
      this.trechosDoNo[this.destino[i]][preenchido[this.destino[i]]++] = i
    }
  }

  get quantidadeDeNos() {
    return this.lat.length
  }

  private custoDoTrecho(trecho: number) {
    return this.comprimento[trecho] * PESO[this.tipo[trecho]]
  }

  /**
   * Projeta a posição sobre o trecho mais próximo. Usa uma projeção plana local
   * (equirretangular): numa área do tamanho de um parque o erro é de centímetros.
   */
  encaixar(latitude: number, longitude: number, evitarEscadas: boolean): Encaixe | null {
    const escalaX = Math.cos((latitude * Math.PI) / 180) * (Math.PI / 180) * RAIO_TERRA_METROS
    const escalaY = (Math.PI / 180) * RAIO_TERRA_METROS
    let melhor: Encaixe | null = null
    let menor2 = Infinity
    for (let t = 0; t < this.origem.length; t++) {
      if (evitarEscadas && this.tipo[t] === ESCADA) continue
      const a = this.origem[t]
      const b = this.destino[t]
      const ax = (this.lon[a] - longitude) * escalaX
      const ay = (this.lat[a] - latitude) * escalaY
      const bx = (this.lon[b] - longitude) * escalaX
      const by = (this.lat[b] - latitude) * escalaY
      const dx = bx - ax
      const dy = by - ay
      const tamanho2 = dx * dx + dy * dy
      // Posição relativa da projeção no trecho, presa entre as duas pontas.
      const fracao = tamanho2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / tamanho2))
      const px = ax + fracao * dx
      const py = ay + fracao * dy
      const d2 = px * px + py * py
      if (d2 < menor2) {
        menor2 = d2
        melhor = {
          trecho: t,
          fracao,
          latitude: this.lat[a] + fracao * (this.lat[b] - this.lat[a]),
          longitude: this.lon[a] + fracao * (this.lon[b] - this.lon[a]),
          distancia: Math.sqrt(d2),
        }
      }
    }
    return melhor
  }

  /**
   * Menor trajeto a pé entre duas posições (Dijkstra).
   *
   * @param evitarEscadas para quem usa cadeira de rodas ou carrinho de bebê
   * @returns null quando não existe caminho (só acontece evitando escadas, se a
   *          única ligação entre os dois lados for uma escada)
   */
  menorCaminho(origem: Coordenada, destino: Coordenada, evitarEscadas: boolean) {
    const inicio = this.encaixar(origem.latitude, origem.longitude, evitarEscadas)
    const fim = this.encaixar(destino.latitude, destino.longitude, evitarEscadas)
    if (!inicio || !fim) return null

    const n = this.lat.length
    const custo = new Float64Array(n).fill(Infinity)
    const anterior = new Int32Array(n).fill(-1)

    // Os dois pontos no mesmo trecho: andar direto por ele pode ser o melhor.
    let melhor = Infinity
    let chegada = -1
    if (inicio.trecho === fim.trecho) {
      melhor = Math.abs(inicio.fracao - fim.fracao) * this.custoDoTrecho(inicio.trecho)
    }

    // A partida fica no meio de um trecho: as duas pontas dele são o começo.
    const fila = new Fila()
    const semear = (no: number, valor: number) => {
      if (valor < custo[no]) {
        custo[no] = valor
        fila.inserir(valor, no)
      }
    }
    semear(this.origem[inicio.trecho], inicio.fracao * this.custoDoTrecho(inicio.trecho))
    semear(this.destino[inicio.trecho], (1 - inicio.fracao) * this.custoDoTrecho(inicio.trecho))

    const pontaA = this.origem[fim.trecho]
    const pontaB = this.destino[fim.trecho]

    while (!fila.vazia) {
      const [custoAtual, no] = fila.retirar()
      if (custoAtual > custo[no]) continue // entrada velha: o nó já foi alcançado por um caminho melhor
      if (custoAtual >= melhor) break // nada que ainda está na fila pode melhorar a rota

      if (no === pontaA) {
        const total = custoAtual + fim.fracao * this.custoDoTrecho(fim.trecho)
        if (total < melhor) {
          melhor = total
          chegada = no
        }
      }
      if (no === pontaB) {
        const total = custoAtual + (1 - fim.fracao) * this.custoDoTrecho(fim.trecho)
        if (total < melhor) {
          melhor = total
          chegada = no
        }
      }

      for (const trecho of this.trechosDoNo[no]) {
        if (evitarEscadas && this.tipo[trecho] === ESCADA) continue
        const vizinho = this.origem[trecho] === no ? this.destino[trecho] : this.origem[trecho]
        const novo = custoAtual + this.custoDoTrecho(trecho)
        if (novo < custo[vizinho]) {
          custo[vizinho] = novo
          anterior[vizinho] = no
          fila.inserir(novo, vizinho)
        }
      }
    }

    if (!Number.isFinite(melhor)) return null

    const pontos: [number, number][] = [[inicio.latitude, inicio.longitude]]
    if (chegada >= 0) {
      const meio: [number, number][] = []
      for (let no = chegada; no >= 0; no = anterior[no]) meio.push([this.lat[no], this.lon[no]])
      meio.reverse()
      pontos.push(...meio)
    }
    pontos.push([fim.latitude, fim.longitude])
    return { pontos, inicio, fim }
  }
}

export interface Rota {
  /** Do visitante ao destino, já sobre os caminhos */
  pontos: Coordenada[]
  distanciaMetros: number
  duracaoMinutos: number
  /** O visitante está longe dos caminhos mapeados: o começo do trajeto é em linha reta */
  foraDosCaminhos: boolean
}

/** Monta a rota a pé da posição informada até o destino. */
export function calcularRota(grafo: GrafoDeTrilhas, origem: Coordenada, destino: Coordenada, evitarEscadas = false): Rota {
  const brutos: [number, number][] = [[origem.latitude, origem.longitude]]
  const trajeto = grafo.menorCaminho(origem, destino, evitarEscadas)
  const foraDosCaminhos = !trajeto || trajeto.inicio.distancia > LIMITE_FORA_DOS_CAMINHOS_M
  if (trajeto) brutos.push(...trajeto.pontos)
  brutos.push([destino.latitude, destino.longitude])

  const pontos: Coordenada[] = []
  let ultimo: [number, number] | null = null
  brutos.forEach((ponto, i) => {
    const extremo = i === 0 || i === brutos.length - 1
    if (ultimo && !extremo && distanciaEmMetros(ultimo[0], ultimo[1], ponto[0], ponto[1]) < PONTO_REPETIDO_M) return
    pontos.push({ latitude: ponto[0], longitude: ponto[1] })
    ultimo = ponto
  })

  let distancia = 0
  for (let i = 1; i < pontos.length; i++) {
    distancia += distanciaEmMetros(pontos[i - 1].latitude, pontos[i - 1].longitude, pontos[i].latitude, pontos[i].longitude)
  }
  return {
    pontos,
    distanciaMetros: Math.round(distancia * 10) / 10,
    duracaoMinutos: Math.max(1, Math.ceil(distancia / VELOCIDADE_M_POR_MIN)),
    foraDosCaminhos,
  }
}
