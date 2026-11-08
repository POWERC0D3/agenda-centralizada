import { mensajeDe, supabase } from './supabase'

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

// Nombre corto de cada web para la etiqueta de las tareas
const FUENTES: Record<string, string> = { centro: 'Aula virtual', misaulas: 'Mis Aulas' }

export type EntregaCuenta = {
  id: string
  origen: 'moodle' | 'manual'
  fuente: string // "Aula virtual", "Mis Aulas", "Teams"…
  tipo: 'entrega' | 'examen'
  titulo: string
  fecha: string // ISO con hora
  url: string | null
  asignatura_id: string | null
}

/** Avisa al panel de que han cambiado las entregas (conectar, sincronizar, desconectar…). */
const avisarCambioEntregas = () => window.dispatchEvent(new Event('agenda:entregas'))

export async function misConexiones(): Promise<ConexionMoodle[]> {
  // Solo las columnas permitidas: el token cifrado ni siquiera se puede pedir
  const { data, error } = await supabase.from('conexiones_moodle').select('id, sitio, nombre, usuario, ultimo_sync, ultimo_error')
  if (error) throw error
  return data as ConexionMoodle[]
}

/**
 * Conecta un Moodle. La contraseña viaja solo a la Edge Function: en el del centro (con API) se usa una vez
 * para pedir un token y se olvida; en Mis Aulas (sin API) se guarda cifrada para volver a entrar al sincronizar.
 */
export async function conectarMoodle(
  sitio: ConexionMoodle['sitio'],
  usuario: string,
  clave: string,
): Promise<{ nombre: string; pendientes: number }> {
  const { data, error } = await supabase.functions.invoke('conectar-moodle', { body: { sitio, usuario, clave } })
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
  const { data, error } = await supabase
    .from('entregas')
    .select('id, tipo, titulo, fecha, url, asignatura_id, origen, plataforma, conexiones_moodle(sitio)')
    .order('fecha')
  if (error) throw error
  return data.map(({ conexiones_moodle: c, plataforma, ...e }) => {
    const sitio = (Array.isArray(c) ? c[0] : c)?.sitio as string | undefined
    const fuente = e.origen === 'manual' ? (plataforma ?? 'A mano') : ((sitio && FUENTES[sitio]) ?? 'Moodle')
    return { ...e, fuente } as EntregaCuenta
  })
}

type RespuestaAbrir = { url: string; autologin?: { base: string; token: string; privatetoken: string; userid: number } }

/**
 * El enlace para abrir una entrega. Si es del Moodle del centro, con inicio de sesión automático:
 * este navegador pide a Moodle una clave de un solo uso (Moodle la ata a la IP de quien la pide, así que tiene
 * que ser el mismo navegador que la va a usar) y abre autologin.php, que deja dentro y lleva a la tarea.
 * Si algo falla (Moodle solo da una clave cada ~6 min), el enlace normal.
 * Las claves solo viven en esta función: no se guardan en ningún sitio.
 */
export async function enlaceDeTarea(entregaId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('abrir-tarea', { body: { entrega: entregaId } })
  if (error || !data?.url) throw new Error('No se pudo obtener el enlace')
  const { url, autologin } = data as RespuestaAbrir
  // Diagnóstico en la consola del navegador (F12): por qué no hay inicio de sesión automático. Nunca las claves
  const aviso = (motivo: string) => console.info('[Agenda] Sin inicio de sesión automático:', motivo)
  if (!autologin) {
    aviso('esta conexión no tiene las claves necesarias (¿es Mis Aulas, o falta desconectar y volver a conectar el Aula virtual?)')
    return url
  }
  try {
    const r = await fetch(`${autologin.base}/webservice/rest/server.php`, {
      method: 'POST',
      body: new URLSearchParams({
        wstoken: autologin.token,
        wsfunction: 'tool_mobile_get_autologin_key',
        moodlewsrestformat: 'json',
        privatetoken: autologin.privatetoken,
      }),
    })
    const clave = (await r.json()) as { key?: string; autologinurl?: string; errorcode?: string; message?: string }
    if (!clave.key || !clave.autologinurl) {
      // p. ej. autologinkeygenerationlockout = se pidió otra hace menos de 6 minutos
      aviso(`Moodle respondió ${clave.errorcode ?? 'sin clave'}: ${clave.message ?? ''}`)
      return url
    }
    console.info('[Agenda] Inicio de sesión automático: clave obtenida, abriendo la tarea')
    const destino = new URL(clave.autologinurl)
    destino.search = new URLSearchParams({ userid: String(autologin.userid), key: clave.key, urltogo: url }).toString()
    return destino.toString()
  } catch (e) {
    aviso(`no se pudo hablar con Moodle (${e instanceof Error ? e.message : 'error'})`)
    return url
  }
}

// ── Cursos de una conexión: de qué asignatura es cada uno (se puede corregir en Ajustes) ──

export type CursoMoodle = { curso_id: number; nombre: string; asignatura_id: string | null }

export async function misCursos(conexionId: string): Promise<CursoMoodle[]> {
  const { data, error } = await supabase
    .from('cursos_moodle')
    .select('curso_id, nombre, asignatura_id')
    .eq('conexion_id', conexionId)
    .order('nombre')
  if (error) throw error
  return data as CursoMoodle[]
}

/** Cambia la asignatura de un curso y, al momento, la de sus entregas (la sincronización respetará la elección). */
export async function cambiarAsignaturaCurso(conexionId: string, curso: CursoMoodle, asignaturaId: string | null) {
  const { error } = await supabase
    .from('cursos_moodle')
    .update({ asignatura_id: asignaturaId })
    .eq('conexion_id', conexionId)
    .eq('curso_id', curso.curso_id)
  if (error) throw error
  // Las entregas guardan el nombre del curso (no su id): se actualizan las de ese nombre en esa conexión
  await supabase.from('entregas').update({ asignatura_id: asignaturaId }).eq('conexion_id', conexionId).eq('curso', curso.nombre)
  avisarCambioEntregas()
}

// ── Tareas añadidas a mano (Teams, que no se puede conectar) ──

export type TareaManual = { id: string; titulo: string; fecha: string; asignatura_id: string | null; url: string | null; tipo: 'entrega' | 'examen' }

export async function misTareasManuales(): Promise<TareaManual[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select('id, titulo, fecha, asignatura_id, url, tipo')
    .eq('origen', 'manual')
    .order('fecha')
  if (error) throw error
  return data as TareaManual[]
}

/** user_id no se envía: lo pone la base de datos (default auth.uid()) y el RLS comprueba que es el tuyo. */
export async function anadirTareaManual(t: Omit<TareaManual, 'id'> & { plataforma: string }) {
  const { error } = await supabase.from('entregas').insert({ ...t, origen: 'manual' })
  if (error) throw error
  avisarCambioEntregas()
}

export async function borrarTareaManual(id: string) {
  const { error } = await supabase.from('entregas').delete().eq('id', id).eq('origen', 'manual')
  if (error) throw error
  avisarCambioEntregas()
}
