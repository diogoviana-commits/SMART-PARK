"""Gera frontend/src/dadosDemonstracao.js a partir de uma API em execucao.

Uso:
    python scripts/gerar-dados-demo.py                  # usa http://localhost:8080
    python scripts/gerar-dados-demo.py http://localhost:9099
"""
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, date

# O endereco vem por argumento para dar para gerar a partir de qualquer
# instancia - a local em 8080, uma em outra porta, ou a publicada.
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
SAIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "dadosDemonstracao.js")


def buscar(caminho):
    with urllib.request.urlopen(BASE + caminho, timeout=15) as r:
        return json.load(r)


categorias = buscar("/api/categorias")
pois = buscar("/api/pois")
eventos = buscar("/api/eventos")

# As datas dos eventos viram deslocamentos em dias a partir de hoje. Datas fixas
# ficariam no passado em poucas semanas e a agenda apareceria vazia.
hoje = date.today()
eventos_relativos = []
for e in eventos:
    inicio = datetime.fromisoformat(e["dataHoraInicio"])
    fim = datetime.fromisoformat(e["dataHoraFim"]) if e.get("dataHoraFim") else None
    eventos_relativos.append({
        "id": e["id"],
        "nome": e["nome"],
        "descricao": e["descricao"],
        "emDias": (inicio.date() - hoje).days,
        "horaInicio": inicio.strftime("%H:%M"),
        "horaFim": fim.strftime("%H:%M") if fim else None,
        "local": e["local"],
        "poiId": e["poiId"],
        "latitude": e["latitude"],
        "longitude": e["longitude"],
        "linkMaisInfo": e["linkMaisInfo"],
    })


def js(valor, indent=2):
    return json.dumps(valor, ensure_ascii=False, indent=indent)


conteudo = f"""// ARQUIVO GERADO — não edite à mão.
//
// Cópia dos dados do parque para o site continuar útil quando a API não
// responde: sem isto, o endereço publicado mostraria um mapa vazio sempre que o
// backend estivesse fora do ar, que é o estado normal enquanto ele não tem
// hospedagem fixa.
//
// Para atualizar: suba a API e rode novamente o gerador descrito no README.
// Os eventos guardam o deslocamento em dias, e não a data: datas fixas
// apareceriam vencidas em poucas semanas e a agenda ficaria vazia.

export const CATEGORIAS_DEMO = {js(categorias)}

export const POIS_DEMO = {js(pois)}

const EVENTOS_DEMO = {js(eventos_relativos)}

/** Reconstrói a agenda a partir de hoje, no mesmo formato que a API devolve. */
export function eventosDemo() {{
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return EVENTOS_DEMO.map((evento) => {{
    const dia = new Date(hoje)
    dia.setDate(dia.getDate() + evento.emDias)

    const com = (hora) => {{
      if (!hora) return null
      const [h, m] = hora.split(':')
      const d = new Date(dia)
      d.setHours(Number(h), Number(m), 0, 0)
      // Formato local sem fuso, igual ao que o backend envia.
      const p = (n) => String(n).padStart(2, '0')
      return `${{d.getFullYear()}}-${{p(d.getMonth() + 1)}}-${{p(d.getDate())}}` +
        `T${{p(d.getHours())}}:${{p(d.getMinutes())}}:00`
    }}

    return {{
      id: evento.id,
      nome: evento.nome,
      descricao: evento.descricao,
      dataHoraInicio: com(evento.horaInicio),
      dataHoraFim: com(evento.horaFim),
      local: evento.local,
      poiId: evento.poiId,
      latitude: evento.latitude,
      longitude: evento.longitude,
      linkMaisInfo: evento.linkMaisInfo,
    }}
  }}).sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))
}}

/** Aplica os mesmos filtros que o endpoint /api/pois aplica no banco. */
export function poisDemo({{ busca, categoria, acessivel }} = {{}}) {{
  const termo = (busca ?? '').trim().toLowerCase()

  return POIS_DEMO.filter((poi) => {{
    if (categoria && poi.categoria.slug !== categoria) return false
    if (acessivel && !poi.acessivel) return false
    if (!termo) return true
    return (
      poi.nome.toLowerCase().includes(termo) ||
      (poi.descricao ?? '').toLowerCase().includes(termo)
    )
  }})
}}
"""

with io.open(SAIDA, "w", encoding="utf-8", newline="\n") as f:
    f.write(conteudo)

print(f"  gerado: {len(categorias)} categorias, {len(pois)} pontos, {len(eventos_relativos)} eventos")
