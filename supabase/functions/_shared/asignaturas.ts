// De qué asignatura de la web (src/data/asignaturas.json) es un curso de Moodle, por su nombre.
// El orden importa: lo más concreto primero ("Programación multimedia" antes que "Programación",
// "Itinerario … II" antes que "Itinerario"). Si no encaja nada → null (el alumno puede corregirlo).

const REGLAS: [RegExp, string][] = [
  [/multimedia|dispositivos m[oó]viles/i, 'PMDM'],
  [/servicios y procesos/i, 'PSP'],
  [/entorno (de )?cliente/i, 'DWEC'],
  [/entorno (de )?servidor/i, 'DWES'],
  [/despliegue/i, 'DESAW'],
  [/dise[ñn]o de interfaces/i, 'DIW'],
  [/desarrollo de interfaces/i, 'DI'],
  [/acceso a datos/i, 'AD'],
  [/gesti[oó]n empresarial/i, 'SGE'],
  [/programaci[oó]n/i, 'PROG'],
  [/bases? de datos/i, 'BADAT'],
  [/entornos de desarrollo/i, 'ENDES'],
  [/lenguajes de marcas/i, 'LMSGI'],
  [/sistemas inform[aá]ticos/i, 'SISIN'],
  [/ingl[eé]s/i, 'IP'],
  [/itinerario.*\bII\b|empleabilidad\s*II\b/i, 'IPEII'],
  [/itinerario|empleabilidad/i, 'IPEI'],
  [/digitalizaci[oó]n/i, 'DASP'],
  [/sostenibilidad/i, 'SASP'],
  [/proyecto/i, 'PIDW'],
]

export function adivinarAsignatura(nombreCurso: string): string | null {
  return REGLAS.find(([re]) => re.test(nombreCurso))?.[1] ?? null
}
