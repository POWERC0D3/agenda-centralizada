import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Moodle y las entregas de la cuenta, desde la web. Se importa con import() dinámico: supabase-js no
// entra en el JavaScript inicial del panel. El trabajo de verdad lo hacen las Edge Functions
// (supabase/functions/): aquí solo se las llama y se leen las tablas que el RLS deja ver.

export type ConexionMoodle = {
  id: string
  sitio: 'centro' | 'misaulas'
  nombre: string
  usuario: string
  ultimo_sync: string | null
  ultimo_error: string | null
}

export type EntregaCuenta = {
  id: string
  tipo: 'entrega' | 'examen'
  titulo: string
  fecha: string // ISO con hora
  url: string | null
  asignatura_id: string | null
}

/** Avisa al panel de que han cambiado las entregas (conectar, sincronizar, desconectar…). */
export const avisarCambioEntregas = () => window.dispatchEvent(new Event('agenda:entregas'))

/** El mensaje de error que devuelve una Edge Function ({ error: "…" }), o uno genérico. */
async function mensajeDe(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await error.context.json()) as { error?: string }
      if (cuerpo.error) return cuerpo.error
    } catch {
      // sin cuerpo JSON
    }
  }
  return 'No se pudo completar. Comprueba tu conexión e inténtalo de nuevo'
}

export async function misConexiones(): Promise<ConexionMoodle[]> {
  // Solo las columnas permitidas: el token cifrado ni siquiera se puede pedir
  const { data, error } = await supabase.from('conexiones_moodle').select('id, sitio, nombre, usuario, ultimo_sync, ultimo_error')
  if (error) throw error
  return data as ConexionMoodle[]
}

/** Conecta el Moodle del centro. La contraseña viaja solo a la Edge Function, que la usa una vez y la olvida. */
export async function conectarMoodle(usuario: string, clave: string): Promise<{ nombre: string; pendientes: number }> {
  const { data, error } = await supabase.functions.invoke('conectar-moodle', { body: { sitio: 'centro', usuario, clave } })
  if (error) throw new Error(await mensajeDe(error))
  avisarCambioEntregas()
  return data as { nombre: string; pendientes: number }
}

export async function sincronizarAhora(): Promise<{ pendientes: number; fallos: number }> {
  const { data, error } = await supabase.functions.invoke('sincronizar', { body: {} })
  if (error) throw new Error(await mensajeDe(error))
  avisarCambioEntregas()
  return data as { pendientes: number; fallos: number }
}

/** Desconectar = borrar la conexión (con ella se van su token, sus cursos y sus entregas de Moodle). */
export async function desconectarMoodle(id: string): Promise<void> {
  const { error } = await supabase.from('conexiones_moodle').delete().eq('id', id)
  if (error) throw error
  avisarCambioEntregas()
}

/** Las entregas guardadas en la cuenta (de Moodle y, más adelante, las añadidas a mano). Sin sesión, ninguna. */
export async function misEntregas(): Promise<EntregaCuenta[]> {
  const { data: sesion } = await supabase.auth.getSession()
  if (!sesion.session) return []
  const { data, error } = await supabase.from('entregas').select('id, tipo, titulo, fecha, url, asignatura_id').order('fecha')
  if (error) throw error
  return data as EntregaCuenta[]
}
