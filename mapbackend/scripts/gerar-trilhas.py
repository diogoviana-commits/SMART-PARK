"""Gera o grafo de caminhos a pe do parque a partir do OpenStreetMap.

Uso:
    python scripts/gerar-trilhas.py

Baixa as trilhas, calcadas e ruas em volta do Espaco Verde Chico Mendes pela
API Overpass e grava src/main/resources/trilhas/chico-mendes.json, que o
RotaService carrega ao subir.

O arquivo fica versionado, e nao baixado a cada inicializacao, por dois motivos:
a API nao depende de um servico de terceiros para subir, e a rota nao muda de
um dia para o outro porque alguem editou o mapa. Para atualizar, rode de novo
e confira o resultado no mapa antes de publicar.

Formato do arquivo:
    {"nos": [[lat, lon], ...], "arestas": [[a, b, tipo], ...]}
    tipo 0 = caminho de pedestre, 1 = rua (calcada), 2 = escada
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

# Retangulo com o parque e alguns quarteiroes em volta, para quem chega de fora
# ser levado ate um portao pelas ruas, e nao atravessando muros em linha reta.
SUL, OESTE, NORTE, LESTE = -23.6385, -46.5800, -23.6255, -46.5645

TIPOS_VIA = ("footway|path|pedestrian|steps|living_street|residential|service|track|"
             "cycleway|unclassified|tertiary|secondary|primary|corridor")

CONSULTA = f"""
[out:json][timeout:60];
(way["highway"~"^({TIPOS_VIA})$"]({SUL},{OESTE},{NORTE},{LESTE}););
(._;>;);
out body;
"""

# O servidor principal recusa pedidos as vezes (406/429); os espelhos servem os
# mesmos dados.
SERVIDORES = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

PEDESTRE = {"footway", "path", "pedestrian", "cycleway", "track", "corridor", "living_street"}

SAIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "src", "main", "resources", "trilhas", "chico-mendes.json")


def baixar():
    corpo = urllib.parse.urlencode({"data": CONSULTA}).encode()
    for url in SERVIDORES:
        try:
            pedido = urllib.request.Request(url, data=corpo, headers={
                "User-Agent": "SmartPark-USCS/1.0 (projeto academico)"})
            with urllib.request.urlopen(pedido, timeout=90) as resposta:
                return json.load(resposta)
        except Exception as erro:  # noqa: BLE001 - tenta o proximo espelho
            print(f"{url} falhou: {erro}", file=sys.stderr)
    sys.exit("Nenhum servidor Overpass respondeu. Tente de novo em alguns minutos.")


def pode_andar(tags):
    """Fora o que e proibido a pe; acesso privado so entra se liberar pedestre."""
    if tags.get("foot") == "no":
        return False
    if tags.get("access") in ("private", "no"):
        return tags.get("foot") in ("yes", "designated", "permissive")
    return True


def tipo_da_via(tags):
    via = tags.get("highway")
    if via == "steps":
        return 2
    return 0 if via in PEDESTRE else 1


def maior_componente(arestas):
    """Guarda so a maior parte conectada do grafo.

    Um trecho solto (uma calcada mapeada sem ligacao com o resto) atrairia o
    ponto mais proximo do visitante e deixaria a rota sem saida.
    """
    vizinhos = defaultdict(list)
    for a, b, _ in arestas:
        vizinhos[a].append(b)
        vizinhos[b].append(a)

    vistos, maior = set(), set()
    for inicio in vizinhos:
        if inicio in vistos:
            continue
        grupo, pilha = {inicio}, [inicio]
        while pilha:
            for proximo in vizinhos[pilha.pop()]:
                if proximo not in grupo:
                    grupo.add(proximo)
                    pilha.append(proximo)
        vistos |= grupo
        if len(grupo) > len(maior):
            maior = grupo
    return maior


def main():
    dados = baixar()["elements"]
    posicao = {e["id"]: (e["lat"], e["lon"]) for e in dados if e["type"] == "node"}

    arestas = {}
    for via in (e for e in dados if e["type"] == "way"):
        tags = via.get("tags", {})
        if not pode_andar(tags):
            continue
        tipo = tipo_da_via(tags)
        for a, b in zip(via["nodes"], via["nodes"][1:]):
            if a != b and a in posicao and b in posicao:
                chave = (min(a, b), max(a, b))
                # Mesmo trecho em duas vias: vale o tipo mais favoravel ao pedestre.
                arestas[chave] = min(tipo, arestas.get(chave, tipo))

    lista = [(a, b, t) for (a, b), t in arestas.items()]
    manter = maior_componente(lista)

    indice = {}
    nos = []
    for id_osm in sorted(manter):
        indice[id_osm] = len(nos)
        lat, lon = posicao[id_osm]
        nos.append([round(lat, 7), round(lon, 7)])

    saida = {
        "fonte": "OpenStreetMap (ODbL) - https://www.openstreetmap.org/copyright",
        "nos": nos,
        "arestas": [[indice[a], indice[b], t] for a, b, t in lista if a in manter],
    }

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, separators=(",", ":"))

    descartadas = len(lista) - len(saida["arestas"])
    print(f"{len(nos)} nos, {len(saida['arestas'])} trechos "
          f"({descartadas} descartados por estarem desconectados) -> {SAIDA}")


if __name__ == "__main__":
    main()
