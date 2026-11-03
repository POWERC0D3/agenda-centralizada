import type { EventoConDias, Horario } from '../types'
import { nombreAsignatura } from './datos'
import { clasesDeLaFecha } from './escolar'
import { formatoDiaSemana, horaAMinutos, MESES_CORTOS, minutosDelDia, sumarDias } from './fechas'
import type { Excluidas } from './horario'

/** Cuánto importa hacerlo HOY. */
export type Prioridad = 'prioritario' | 'importante' | 'opcional'

/** Una línea de la libreta: qué hacer (corto, un verbo) y por qué (aún más corto). */
export type Tarea = {
  id: string // estable entre recargas: así se recuerda si la marcaste como hecha
  texto: string
  motivo: string
  prioridad: Prioridad
  asignatura?: string | null
  dias: number // días hasta la prueba que la origina (para ordenar por urgencia)
  fuente?: string // de qué web viene (si viene de fuera)
  url?: string // la tarea en su web
  entregaId?: string // id en la tabla entregas (para abrirla con inicio de sesión automático)
}

const ORDEN: Record<Prioridad, number> = { prioritario: 0, importante: 1, opcional: 2 }

// "hoy" · "mañana" · "el vie 13": cuándo es la prueba, lo más corto posible
const cuando = (e: EventoConDias) =>
  e.dias === 0
    ? 'hoy'
    : e.dias === 1
      ? 'mañana'
      : // Hace más de una semana: con el mes, que "el lun 5" ya no basta para saber cuál
        `el ${formatoDiaSemana(e.dia)} ${e.dia.getDate()}${e.dias < -6 ? ` ${MESES_CORTOS[e.dia.getMonth()]}` : ''}`
// El motivo es un dato, no una frase: "Examen mañana · Leer & Escribir"
/** Una entrega de las webs que ya venció y sigue en su Línea de tiempo: no se entregó. Lo más urgente de todo */
export const esAtrasada = (e: EventoConDias) => e.dias < 0 && e.tipo === 'entrega' && !!e.fuente

const motivo = (e: EventoConDias) => {
  const base = esAtrasada(e) ? `Venció ${cuando(e)}` : `${e.tipo === 'entrega' ? 'Entrega' : 'Examen'} ${cuando(e)}`
  return e.detalle ? `${base} · ${e.detalle}` : base
}

/**
 * Las tareas del día, deducidas de tus pruebas y tu horario (no un resumen: una guía).
 * Cada regla es un `if` sencillo; el resultado va ordenado por prioridad y urgencia.
 */
export function tareasDelDia(
  horario: Horario,
  ahora: Date,
  lista: EventoConDias[],
  excluir: Excluidas,
  /** Solo tareas de lo que viene de fuera (las webs del instituto): sin repasos, dudas ni hábitos del horario */
  soloDeFuera = false,
): Tarea[] {
  const tareas: Tarea[] = []
  // Sin límite de fechas: cuantas más tareas haya, más se puede llenar la libreta (la Agenda muestra las que caben)
  // Lo que queda por llegar, y lo atrasado de las webs (lo pasado del JSON ya no tiene remedio: fuera)
  const proximas = lista.filter((e) => (e.dias >= 0 || esAtrasada(e)) && e.tipo !== 'evaluacion' && (!soloDeFuera || e.fuente))

  for (const e of proximas) {
    const nombre = nombreAsignatura(e.asignatura)
    const base = { id: `${e.tipo}-${e.id}`, asignatura: e.asignatura, dias: e.dias, motivo: motivo(e), fuente: e.fuente, url: e.url, entregaId: e.id.startsWith('cuenta-') ? e.id.slice(7) : undefined }

    if (e.tipo === 'entrega') {
      tareas.push(
        e.dias < 0
          ? { ...base, prioridad: 'prioritario', texto: `Atrasada: ${nombre}` } // dias negativo: queda la primera al ordenar
          : e.dias <= 2
          ? { ...base, prioridad: 'prioritario', texto: `Termina ${nombre}` }
          : e.dias <= 7
            ? { ...base, prioridad: 'importante', texto: `Avanza ${nombre}` }
            : { ...base, prioridad: 'opcional', texto: `Planifica ${nombre}` },
      )
      continue
    }
    // Exámenes: cuanto más cerca, más prioridad
    if (e.dias === 0) tareas.push({ ...base, prioridad: 'prioritario', texto: `Repaso rápido de ${nombre}` })
    else if (e.dias === 1) tareas.push({ ...base, prioridad: 'prioritario', texto: `Repasa ${nombre}` })
    else if (e.dias <= 4) tareas.push({ ...base, prioridad: 'importante', texto: `Estudia ${nombre}` })
    else if (e.dias <= 7) tareas.push({ ...base, prioridad: 'opcional', texto: `Esquema de ${nombre}` })
    else tareas.push({ ...base, prioridad: 'opcional', texto: `Empieza ${nombre}` })
  }

  // Lo demás se deduce del horario y de los exámenes, no viene de fuera
  if (soloDeFuera) return tareas.sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad] || a.dias - b.dias)

  // Dos o más pruebas el mismo día: repartir el repaso
  const porDia = new Map<string, EventoConDias[]>()
  for (const e of proximas) if (e.dias >= 2) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e])
  for (const [fecha, grupo] of porDia) {
    if (grupo.length < 2) continue
    tareas.push({
      id: `reparto-${fecha}`,
      prioridad: 'importante',
      dias: grupo[0].dias,
      texto: 'Reparte el repaso',
      motivo: `${grupo.length} pruebas ${cuando(grupo[0])}`,
    })
  }

  // Clases de hoy de asignaturas con examen cerca: aprovechar para preguntar dudas
  const min = minutosDelDia(ahora)
  for (const c of clasesDeLaFecha(horario, ahora, excluir)) {
    const examen = proximas.find((e) => e.tipo === 'examen' && e.asignatura === c.asignatura && e.dias >= 1 && e.dias <= 14)
    if (!examen || horaAMinutos(c.fin) <= min) continue
    if (tareas.some((t) => t.id === `dudas-${c.asignatura}`)) continue // una vez por asignatura aunque tenga dos clases
    tareas.push({
      id: `dudas-${c.asignatura}`,
      asignatura: c.asignatura,
      prioridad: 'opcional',
      dias: examen.dias,
      texto: `Dudas de ${nombreAsignatura(c.asignatura)}`,
      motivo: `Clase a las ${c.inicio}`,
    })
  }

  // ── Relleno con sentido: hábitos diarios (van al final; solo se ven si queda sitio) ──
  const RELLENO = 99
  for (const c of clasesDeLaFecha(horario, ahora, excluir)) {
    const id = `repaso-${c.asignatura}`
    if (tareas.some((t) => t.id === id || (t.asignatura === c.asignatura && t.id.startsWith('dudas')))) continue
    tareas.push({
      id,
      asignatura: c.asignatura,
      prioridad: 'opcional',
      dias: RELLENO,
      texto: `Repasa la clase de ${nombreAsignatura(c.asignatura)}`,
      motivo: `Hoy a las ${c.inicio}`,
    })
  }
  const manana = clasesDeLaFecha(horario, sumarDias(ahora, 1), excluir)
  if (manana.length) {
    tareas.push({
      id: 'material-manana',
      prioridad: 'opcional',
      dias: RELLENO,
      texto: 'Prepara el material',
      motivo: `${new Set(manana.map((c) => c.asignatura)).size} asignaturas mañana`,
    })
  }

  return tareas.sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad] || a.dias - b.dias)
}
