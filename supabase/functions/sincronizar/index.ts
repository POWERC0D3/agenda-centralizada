// POST /functions/v1/sincronizar   (con la sesión del alumno)
// Vuelve a leer la Línea de tiempo de todos los Moodle del alumno y actualiza sus entregas.
// (Más adelante, pg_cron llamará a una variante que recorra a todos los alumnos.)
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'
import { sincronizarConexion } from '../_shared/sincronizar.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras(req) })
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const userId = await quienLlama(req)
  if (!userId) return responder(req, { error: 'Inicia sesión para sincronizar' }, 401)

  const db = admin()
  const { data: conexiones, error } = await db
    .from('conexiones_moodle')
    .select('id, user_id, sitio, moodle_user_id, token_cifrado')
    .eq('user_id', userId)
  if (error) return responder(req, { error: 'No se pudieron leer tus conexiones' }, 500)

  // Cada conexión por separado: si una falla (token revocado…), las demás siguen
  const resultados = await Promise.allSettled(conexiones.map((c) => sincronizarConexion(db, c)))
  const pendientes = resultados.reduce((n, r) => n + (r.status === 'fulfilled' ? r.value : 0), 0)
  const fallos = resultados.filter((r) => r.status === 'rejected').length
  return responder(req, { ok: fallos === 0, pendientes, fallos })
})
