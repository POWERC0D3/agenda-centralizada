import { supabase } from './supabase'

// Las tareas hechas en la cuenta (tabla `tareas_hechas`). Se importa con import() dinámico desde
// useHechas: supabase-js no entra en el JavaScript inicial del panel.

/** El id del usuario con sesión, o null. Lee la sesión guardada: no hace falta ir a la red. */
export async function usuarioActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Los ids de las tareas marcadas ese día ("2026-11-12"). */
export async function descargarHechas(userId: string, dia: string): Promise<string[]> {
  const { data, error } = await supabase.from('tareas_hechas').select('tarea_id').eq('user_id', userId).eq('dia', dia)
  if (error) throw error
  return data.map((f) => f.tarea_id as string)
}

/** Marcar (insertar la fila) o desmarcar (borrarla). */
export async function guardarHecha(userId: string, dia: string, tareaId: string, hecha: boolean): Promise<void> {
  const { error } = hecha
    ? // upsert con ignoreDuplicates: marcar algo ya marcado (dos pestañas a la vez) no da error
      await supabase
        .from('tareas_hechas')
        .upsert({ user_id: userId, dia, tarea_id: tareaId }, { onConflict: 'user_id,dia,tarea_id', ignoreDuplicates: true })
    : await supabase.from('tareas_hechas').delete().eq('user_id', userId).eq('dia', dia).eq('tarea_id', tareaId)
  if (error) throw error
}
