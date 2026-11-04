import type { EventoConDias, Horario } from '../types'
import { nombreAsignatura } from './datos'
import { clasesDeLaFecha } from './escolar'
import { diaSemana, formatoDiaSemana, horaAMinutos, MESES_CORTOS, minutosDelDia, sumarDias } from './fechas'
import { clasesDelDia, type Excluidas } from './horario'

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

// Varias formas de decir lo mismo en cada tramo de días, para que la Agenda no repita siempre el mismo verbo.
// `n` es el nombre de la asignatura
type Frases = ((n: string) => string)[]
const ENTREGA: Record<'atrasada' | 'hoy' | 'casi' | 'semana' | 'lejos', Frases> = {
  atrasada: [(n) => `Atrasada: ${n}`, (n) => `Recupera la entrega de ${n}`, (n) => `Entrega cuanto antes ${n}`],
  hoy: [(n) => `Entrega hoy ${n}`, (n) => `Último empujón a ${n}`, (n) => `Sube hoy ${n}`],
  casi: [(n) => `Termina ${n}`, (n) => `Remata ${n}`, (n) => `Revisa y entrega ${n}`, (n) => `Cierra ${n}`],
  semana: [(n) => `Avanza ${n}`, (n) => `Sigue con ${n}`, (n) => `Dedica un rato a ${n}`, (n) => `Haz la mitad de ${n}`],
  lejos: [(n) => `Planifica ${n}`, (n) => `Lee el enunciado de ${n}`, (n) => `Organiza ${n}`, (n) => `Apunta las dudas de ${n}`],
}
const EXAMEN: Record<'hoy' | 'manana' | 'cerca' | 'semana' | 'quincena' | 'lejos', Frases> = {
  hoy: [(n) => `Repaso rápido de ${n}`, (n) => `Último vistazo a ${n}`, (n) => `Repasa lo clave de ${n}`],
  manana: [(n) => `Repasa ${n}`, (n) => `Repaso general de ${n}`, (n) => `Repasa tus fichas de ${n}`],
  cerca: [(n) => `Estudia ${n}`, (n) => `Ejercicios de ${n}`, (n) => `Practica ${n}`, (n) => `Examen de prueba de ${n}`],
  semana: [(n) => `Esquema de ${n}`, (n) => `Resume ${n}`, (n) => `Mapa mental de ${n}`, (n) => `Haz fichas de ${n}`],
  quincena: [(n) => `Empieza ${n}`, (n) => `Ponte con ${n}`, (n) => `Lee el temario de ${n}`, (n) => `Primer repaso de ${n}`],
  lejos: [(n) => `Ojea ${n}`, (n) => `Reúne los apuntes de ${n}`, (n) => `Haz un índice de ${n}`, (n) => `Organiza ${n}`],
}

/**
 * Elige una frase con el id de la prueba como "semilla": un número que sale siempre igual para el mismo texto
 * (un hash, como hashCode() en Java). Así cada prueba tiene su frase y no cambia de un render a otro,
 * pero dos pruebas distintas casi nunca coinciden.
 */
function frase(opciones: Frases, id: string, nombre: string) {
  let h = 7
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0 // >>> 0: se queda en entero positivo de 32 bits
  return opciones[h % opciones.length](nombre)
}

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
export const esAtrasada = (e: EventoConDias) => e.dias < 0 && e.tipo === 'entrega' && e.origen === 'moodle'

const motivo = (e: EventoConDias) => {
  const base = esAtrasada(e) ? `Venció ${cuando(e)}` : `${e.tipo === 'entrega' ? 'Entrega' : 'Examen'} ${cuando(e)}`
  return e.detalle ? `${base} · ${e.detalle}` : base
}

/**
 * Lo que toca ESE día: las tareas de las asignaturas que ese día de la semana tienen en el horario,
 * y lo que vence ese mismo día.
 * Manda el HORARIO, no el calendario escolar: un miércoles festivo o no lectivo sigue siendo el día de las
 * asignaturas del miércoles (es lo que se ve bajo la lupa). Sábado y domingo no tienen ninguna: se queda todo.
 */
export function deLasClasesDelDia(tareas: Tarea[], horario: Horario, fecha: Date, excluir: Excluidas): Tarea[] {
  const asignaturas = new Set(clasesDelDia(horario, diaSemana(fecha), excluir).map((c) => c.asignatura))
  if (asignaturas.size === 0) return tareas
  return tareas.filter((t) => t.dias === 0 || (t.asignatura != null && asignaturas.has(t.asignatura)))
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
  /** Solo exámenes (del grupo) y entregas (de las webs y las añadidas a mano): sin repasos, dudas ni hábitos del horario */
  soloPruebas = false,
): Tarea[] {
  const tareas: Tarea[] = []
  // Sin límite de fechas: cuantas más tareas haya, más se puede llenar la libreta (la Agenda muestra las que caben)
  // Lo que queda por llegar, y lo atrasado de las webs (lo pasado del JSON ya no tiene remedio: fuera).
  // Las entregas solo cuentan si vienen de la cuenta (fuente): las del JSON no son reales
  const proximas = lista.filter(
    (e) => (e.dias >= 0 || esAtrasada(e)) && (e.tipo === 'examen' || (e.tipo === 'entrega' && (!soloPruebas || e.fuente))),
  )

  for (const e of proximas) {
    // Sin asignatura (una tarea de Teams apuntada sin ella): "la tarea", mejor que "General"
    const nombre = e.asignatura ? nombreAsignatura(e.asignatura) : 'la tarea'
    const base = { id: `${e.tipo}-${e.id}`, asignatura: e.asignatura, dias: e.dias, motivo: motivo(e), fuente: e.fuente }
    const texto = (opciones: Frases) => frase(opciones, e.id, nombre)

    if (e.tipo === 'entrega') {
      // Solo las entregas llevan enlace: se abren en la web donde se entregan
      const enlace = { url: e.url, entregaId: e.id.startsWith('cuenta-') ? e.id.slice(7) : undefined }
      tareas.push(
        e.dias < 0
          ? { ...base, ...enlace, prioridad: 'prioritario', texto: texto(ENTREGA.atrasada) } // dias negativo: queda la primera al ordenar
          : e.dias === 0
            ? { ...base, ...enlace, prioridad: 'prioritario', texto: texto(ENTREGA.hoy) }
            : e.dias <= 2
              ? { ...base, ...enlace, prioridad: 'prioritario', texto: texto(ENTREGA.casi) }
              : e.dias <= 7
                ? { ...base, ...enlace, prioridad: 'importante', texto: texto(ENTREGA.semana) }
                : { ...base, ...enlace, prioridad: 'opcional', texto: texto(ENTREGA.lejos) },
      )
      continue
    }
    // Exámenes (sin enlace: no hay web donde abrirlos). Cuanto más cerca, más prioridad
    if (e.dias === 0) tareas.push({ ...base, prioridad: 'prioritario', texto: texto(EXAMEN.hoy) })
    else if (e.dias === 1) tareas.push({ ...base, prioridad: 'prioritario', texto: texto(EXAMEN.manana) })
    else if (e.dias <= 4) tareas.push({ ...base, prioridad: 'importante', texto: texto(EXAMEN.cerca) })
    else if (e.dias <= 7) tareas.push({ ...base, prioridad: 'opcional', texto: texto(EXAMEN.semana) })
    else if (e.dias <= 14) tareas.push({ ...base, prioridad: 'opcional', texto: texto(EXAMEN.quincena) })
    else tareas.push({ ...base, prioridad: 'opcional', texto: texto(EXAMEN.lejos) })
  }

  // Lo demás se deduce del horario y de los exámenes
  if (soloPruebas) return tareas.sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad] || a.dias - b.dias)

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
