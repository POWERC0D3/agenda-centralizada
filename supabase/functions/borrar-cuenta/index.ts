// POST /functions/v1/borrar-cuenta   (con la sesión del alumno)
// Borra la cuenta del que llama. Todas sus filas (perfil, tareas hechas, entregas, conexiones de Moodle
// con sus tokens…) se van con ella: todas las tablas tienen `on delete cascade` hacia auth.users.
// Hace falta el rol service_role (borrar usuarios), por eso es una Edge Function y no se hace desde el navegador.
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras(req) })
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const userId = await quienLlama(req)
  if (!userId) return responder(req, { error: 'Inicia sesión para borrar tu cuenta' }, 401)

  const { error } = await admin().auth.admin.deleteUser(userId)
  if (error) {
    console.error('borrar-cuenta', error.message)
    return responder(req, { error: 'No se pudo borrar la cuenta. Inténtalo más tarde' }, 500)
  }
  return responder(req, { ok: true })
})
