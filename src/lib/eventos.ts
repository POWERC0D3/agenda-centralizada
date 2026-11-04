import type { Evento, EventoConDias } from '../types'
import { URL_CENTRO } from './config'
import { diasEntre, parseFecha } from './fechas'
import type { Excluidas } from './horario'

/** Enlace de una entrega: el suyo propio si lo tiene, si no la web del centro (los exámenes no llevan enlace). */
export const urlDe = (e: Evento) => e.url ?? URL_CENTRO

/** Las pruebas de un grupo ordenadas por fecha, con los días que faltan respecto a `ahora`. */
function eventosConDias(eventos: Evento[], ahora: Date): EventoConDias[] {
  return eventos
    .map((e, i) => {
      const dia = parseFecha(e.fecha)
      // Los del JSON no traen id: se calcula. Los de la cuenta traen el suyo, que no cambia aunque
      // lleguen o se vayan otras entregas (de él depende recordar qué tareas marcaste como hechas)
      return { ...e, id: e.id ?? `${e.fecha}-${e.asignatura ?? 'gen'}-${i}`, dia, dias: diasEntre(ahora, dia) }
    })
    .sort((a, b) => a.dia.getTime() - b.dia.getTime())
}

/** Las pruebas vistas desde `fecha`, sin las de módulos apagados (lo que no cursas no llega a ningún panel). */
export function eventosVisibles(eventos: Evento[], fecha: Date, excluidos: Excluidas): EventoConDias[] {
  return eventosConDias(eventos, fecha).filter((e) => !e.asignatura || !excluidos.has(e.asignatura))
}

const UMBRAL_URGENTE = 3

/** Lo que cae entre hoy y dentro de `umbral` días. */
export function avisos(lista: EventoConDias[], umbral = UMBRAL_URGENTE): EventoConDias[] {
  return lista.filter((e) => e.dias >= 0 && e.dias <= umbral)
}

export function proximoEvento(lista: EventoConDias[]): EventoConDias | undefined {
  return lista.find((e) => e.dias >= 0)
}

/** Agrupa por semana (lunes) para pintar la línea de tiempo. */
export function agruparPorSemana(lista: EventoConDias[]): { lunes: Date; eventos: EventoConDias[] }[] {
  const grupos = new Map<number, EventoConDias[]>()
  for (const e of lista) {
    const lunes = new Date(e.dia)
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
    const clave = lunes.getTime()
    grupos.set(clave, [...(grupos.get(clave) ?? []), e])
  }
  return [...grupos].map(([t, eventos]) => ({ lunes: new Date(t), eventos }))
}
