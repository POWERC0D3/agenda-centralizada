// POST /functions/v1/sincronizar-todo   (solo pg_cron, cada 30 minutos)
//
// Recorre las conexiones de Moodle de TODOS los alumnos y actualiza sus entregas.
// No la llama ningún navegador: exige la cabecera x-cron-secreto, que solo conoce la base de datos (Vault).
//
// Cortesía con las webs del instituto:
// - De 3 en 3, no todas a la vez.
// - Mis Aulas (método B) inicia sesión cada vez: se sincroniza como mucho cada 2 horas, no cada 30 minutos.
// - Si Moodle ya rechazó la contraseña o el token, no se insiste (muchos intentos fallidos pueden bloquear la
//   cuenta del alumno): se espera a que vuelva a conectar, lo que borra el error.
import { admin, responder } from '../_shared/http.ts'
import { COLUMNAS_CONEXION, sincronizarConexion, type Conexion } from '../_shared/sincronizar.ts'

const A_LA_VEZ = 3
const MIN_ENTRE_SESIONES_MS = 2 * 60 * 60 * 1000
const ERRORES_DE_CREDENCIALES = ['Moodle no acepta tu contraseña', 'Moodle ya no acepta la conexión']

/** Comparación en tiempo constante: no deja adivinar el secreto midiendo cuánto tarda en fallar. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const db = admin()
  const { data: secreto } = await db.rpc('secreto_cron')
  if (typeof secreto !== 'string' || !iguales(req.headers.get('x-cron-secreto') ?? '', secreto))
    return responder(req, { error: 'No autorizado' }, 401)

  const { data, error } = await db.from('conexiones_moodle').select(`${COLUMNAS_CONEXION}, ultimo_sync, ultimo_error`)
  if (error) return responder(req, { error: 'No se pudieron leer las conexiones' }, 500)

  const ahora = Date.now()
  const conexiones = (data as (Conexion & { ultimo_sync: string | null; ultimo_error: string | null })[]).filter((c) => {
    if (c.ultimo_error && ERRORES_DE_CREDENCIALES.some((m) => c.ultimo_error!.startsWith(m))) return false
    if (c.metodo === 'sesion' && c.ultimo_sync && ahora - new Date(c.ultimo_sync).getTime() < MIN_ENTRE_SESIONES_MS) return false
    return true
  })

  let correctas = 0
  let fallos = 0
  for (let i = 0; i < conexiones.length; i += A_LA_VEZ) {
    const tanda = await Promise.allSettled(conexiones.slice(i, i + A_LA_VEZ).map((c) => sincronizarConexion(db, c)))
    correctas += tanda.filter((r) => r.status === 'fulfilled').length
    fallos += tanda.filter((r) => r.status === 'rejected').length
  }
  return responder(req, { revisadas: conexiones.length, saltadas: data.length - conexiones.length, correctas, fallos })
})
