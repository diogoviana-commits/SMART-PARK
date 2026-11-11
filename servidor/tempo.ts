/**
 * Datas no horário do parque (America/Sao_Paulo).
 *
 * As colunas de data são TIMESTAMP sem fuso, e os horários de evento são de
 * relógio de parede ("19h no parque"). Por isso tudo é gravado no horário de São
 * Paulo, independente do fuso do servidor onde a função roda.
 */
const FUSO = 'America/Sao_Paulo'

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Instante no formato do banco: '2026-11-11 19:30:05'. */
export function noParque(instante: Date = new Date()): string {
  const p = Object.fromEntries(formato.formatToParts(instante).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`
}

/** Dia no parque: '2026-11-11'. */
export const hojeNoParque = (instante: Date = new Date()) => noParque(instante).slice(0, 10)

/** Soma dias a uma data 'AAAA-MM-DD'. */
export function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Semana ISO 8601 de um dia: '2026-W46'. As missões semanais renovam na segunda-feira. */
export function semanaIso(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`)
  const diaDaSemana = (d.getUTCDay() + 6) % 7 // segunda = 0
  d.setUTCDate(d.getUTCDate() - diaDaSemana + 3) // quinta-feira da mesma semana
  const ano = d.getUTCFullYear()
  const primeiraQuinta = new Date(Date.UTC(ano, 0, 4))
  const semana = 1 + Math.round(((d.getTime() - primeiraQuinta.getTime()) / 86_400_000 - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7)
  return `${ano}-W${String(semana).padStart(2, '0')}`
}

/** Segunda-feira da semana de um dia. */
export function inicioDaSemana(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`)
  return somarDias(dia, -((d.getUTCDay() + 6) % 7))
}

/** Converte o texto do banco ('2026-11-11 19:30:05.123') para ISO sem fuso ('2026-11-11T19:30:05'). */
export function paraIso(valor: string | null): string | null {
  if (!valor) return null
  return valor.replace(' ', 'T').replace(/\.\d+$/, '')
}

/** Converte um instante do banco (horário do parque) em milissegundos. */
export function emMilissegundos(valor: string): number {
  // O parque fica em UTC-3 o ano todo (o Brasil não tem horário de verão desde 2019).
  return Date.parse(`${paraIso(valor)}-03:00`)
}
