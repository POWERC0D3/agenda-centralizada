import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { adivinarAsignatura } from './asignaturas.ts'
import { descifrar } from './cifrado.ts'
import { cursos, ErrorMoodle, lineaDeTiempo, limpiarTitulo, SITIOS, type Sitio } from './moodle.ts'

type Conexion = { id: string; user_id: string; sitio: Sitio; moodle_user_id: number | null; token_cifrado: string | null }

/**
 * Trae las entregas pendientes de UNA conexión y deja `entregas` igual que la Línea de tiempo de Moodle:
 * - lo que está en Moodle → upsert (se crea o se actualiza: título, fecha, enlace…)
 * - lo que ya NO está (entregado, o borrado por el profesor) → se borra
 * Devuelve cuántas entregas pendientes hay.
 */
export async function sincronizarConexion(db: SupabaseClient, c: Conexion): Promise<number> {
  const base = SITIOS[c.sitio]
  try {
    if (!c.token_cifrado) throw new ErrorMoodle('sintoken', 'Falta el token: vuelve a conectar')
    const token = await descifrar(c.token_cifrado)

    // 1) Cursos → de qué asignatura es cada uno. Si el alumno corrigió una a mano, se respeta
    const susCursos = c.moodle_user_id ? await cursos(base, token, c.moodle_user_id) : []
    const { data: guardados } = await db.from('cursos_moodle').select('curso_id, asignatura_id').eq('conexion_id', c.id)
    const asignaturaDe = new Map<number, string | null>((guardados ?? []).map((g) => [g.curso_id, g.asignatura_id]))
    const filasCursos = susCursos.map((cu) => ({
      conexion_id: c.id,
      curso_id: cu.id,
      nombre: cu.fullname,
      asignatura_id: asignaturaDe.has(cu.id) ? asignaturaDe.get(cu.id)! : adivinarAsignatura(cu.fullname),
    }))
    if (filasCursos.length) await db.from('cursos_moodle').upsert(filasCursos, { onConflict: 'conexion_id,curso_id' })
    for (const f of filasCursos) asignaturaDe.set(f.curso_id, f.asignatura_id)

    // 2) La Línea de tiempo → entregas
    const eventos = await lineaDeTiempo(base, token)
    const filas = eventos.map((e) => ({
      user_id: c.user_id,
      origen: 'moodle',
      tipo: e.modulename === 'quiz' ? 'examen' : 'entrega', // un cuestionario con fecha cuenta como prueba
      conexion_id: c.id,
      id_externo: String(e.id),
      titulo: limpiarTitulo(e.name).slice(0, 200) || 'Tarea de Moodle',
      curso: e.course?.fullname ?? null,
      asignatura_id: e.course ? (asignaturaDe.get(e.course.id) ?? adivinarAsignatura(e.course.fullname)) : null,
      fecha: new Date(e.timesort * 1000).toISOString(),
      url: e.url || null,
    }))
    if (filas.length) {
      const { error } = await db.from('entregas').upsert(filas, { onConflict: 'user_id,origen,id_externo' })
      if (error) throw error
    }

    // 3) Lo que ya no está en Moodle se quita
    const vigentes = filas.map((f) => f.id_externo)
    let borrar = db.from('entregas').delete().eq('conexion_id', c.id)
    if (vigentes.length) borrar = borrar.not('id_externo', 'in', `(${vigentes.join(',')})`)
    await borrar

    await db.from('conexiones_moodle').update({ ultimo_sync: new Date().toISOString(), ultimo_error: null }).eq('id', c.id)
    return filas.length
  } catch (e) {
    // El error se guarda para enseñarlo en Ajustes. NUNCA el token ni nada sensible: solo el mensaje
    const mensaje =
      e instanceof ErrorMoodle && e.codigo === 'invalidtoken'
        ? 'Moodle ya no acepta la conexión (¿revocaste la clave?): vuelve a conectar'
        : e instanceof Error
          ? e.message
          : 'Error desconocido'
    await db.from('conexiones_moodle').update({ ultimo_error: mensaje.slice(0, 300) }).eq('id', c.id)
    throw e
  }
}
