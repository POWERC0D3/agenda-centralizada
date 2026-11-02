import type { Evento, Horario } from '../types'
import daw1aExamenes from '../data/grupos/daw1a/examenes.json'
import daw1aHorario from '../data/grupos/daw1a/horario.json'

export const CICLOS = ['DAW', 'DAM'] as const
export const CURSOS = ['1º', '2º'] as const
export const LETRAS = ['A', 'B'] as const

/** Tu grupo: ciclo + curso + letra (p. ej. DAW · 1º · A). */
export type Grupo = { ciclo: (typeof CICLOS)[number]; curso: (typeof CURSOS)[number]; letra: (typeof LETRAS)[number] }

export const GRUPO_INICIAL: Grupo = { ciclo: 'DAW', curso: '1º', letra: 'A' }

type Letra = Grupo['letra']

// Módulos de cada curso (ids de src/data/asignaturas.json). 1º es común a DAW y DAM.
// 2º: módulos técnicos del Real Decreto 405/2023 + Itinerario II y Proyecto intermodular (sin la optativa)
const MODULOS_1 = ['PROG', 'BADAT', 'ENDES', 'PIDW', 'LMSGI', 'SISIN', 'IP', 'IPEI', 'DASP', 'SASP']
const MODULOS_DAW_2 = ['DWEC', 'DWES', 'DESAW', 'DIW', 'IPEII', 'PIDW']
const MODULOS_DAM_2 = ['AD', 'DI', 'PMDM', 'PSP', 'SGE', 'IPEII', 'PIDM']

/**
 * Los grupos que existen de verdad en el centro (A = mañana, B = tarde) y sus módulos.
 * No todas las combinaciones de ciclo × curso × letra existen: DAM 1º solo tiene tarde, 2º solo un grupo por ciclo.
 */
export const GRUPOS: { grupo: Grupo; modulos: string[] }[] = [
  { grupo: { ciclo: 'DAW', curso: '1º', letra: 'A' }, modulos: MODULOS_1 },
  { grupo: { ciclo: 'DAW', curso: '1º', letra: 'B' }, modulos: MODULOS_1 },
  { grupo: { ciclo: 'DAM', curso: '1º', letra: 'B' }, modulos: MODULOS_1 },
  { grupo: { ciclo: 'DAW', curso: '2º', letra: 'A' }, modulos: MODULOS_DAW_2 },
  { grupo: { ciclo: 'DAM', curso: '2º', letra: 'B' }, modulos: MODULOS_DAM_2 },
]

const buscar = (g: Grupo) => GRUPOS.find((x) => x.grupo.ciclo === g.ciclo && x.grupo.curso === g.curso && x.grupo.letra === g.letra)

/** ¿Existe este grupo en el centro? */
export const existeGrupo = (g: Grupo) => buscar(g) !== undefined

/** Los módulos de un grupo (vacío si el grupo no existe). */
export const modulosDeGrupo = (g: Grupo): string[] => buscar(g)?.modulos ?? []

/** Las letras que existen para un ciclo y un curso (p. ej. DAM 1º → solo B). */
export const letrasDe = (ciclo: Grupo['ciclo'], curso: Grupo['curso']): Letra[] =>
  GRUPOS.filter((x) => x.grupo.ciclo === ciclo && x.grupo.curso === curso).map((x) => x.grupo.letra)

/**
 * El grupo si existe; si no, el mismo ciclo y curso con la primera letra que sí exista
 * (al cambiar de ciclo o de curso en Ajustes, o con datos guardados de un grupo que ya no existe).
 */
export function ajustarGrupo(g: Grupo): Grupo {
  if (existeGrupo(g)) return g
  const letra = letrasDe(g.ciclo, g.curso)[0]
  return letra ? { ...g, letra } : GRUPO_INICIAL
}

export const idGrupo = (g: Grupo) => `${g.ciclo}${g.curso.charAt(0)}${g.letra}`.toLowerCase() // "daw1a"
export const nombreGrupo = (g: Grupo) => `${g.ciclo} ${g.curso} ${g.letra}`

export type DatosGrupo = { horario: Horario; eventos: Evento[] }

// De momento los datos viven en el propio proyecto y solo hay los de DAW 1º A.
// TypeScript infiere `tipo: string` en los JSON: por eso el `as`.
const DISPONIBLES: Record<string, DatosGrupo> = {
  daw1a: { horario: daw1aHorario as Horario, eventos: daw1aExamenes as Evento[] },
}

/**
 * Horario y exámenes de un grupo, o null si aún no los tenemos.
 * Es el único punto de acceso a esos datos (como un repositorio en Java): el
 * día que haya backend, esta función hará el `fetch` y el resto de la app no cambia.
 */
export function datosDelGrupo(g: Grupo): DatosGrupo | null {
  return DISPONIBLES[idGrupo(g)] ?? null
}
