// POST /functions/v1/borrar-cuenta   (con la sesión del alumno)   body: { clave: string }
// Borra la cuenta del que llama. Todas sus filas (perfil, tareas hechas, entregas, conexiones de Moodle
// con sus tokens…) se van con ella: todas las tablas tienen `on delete cascade` hacia auth.users.
// Hace falta el rol service_role (borrar usuarios), por eso es una Edge Function y no se hace desde el navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORREO_DEMO } from '../_shared/demo.ts'
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras(req) })
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const userId = await quienLlama(req)
  if (!userId) return responder(req, { error: 'Inicia sesión para borrar tu cuenta' }, 401)

  const { data: datos } = await admin().auth.admin.getUserById(userId)
  const correo = datos.user?.email
  if (!correo) return responder(req, { error: 'No se pudo borrar la cuenta. Inténtalo más tarde' }, 500)

  // La cuenta de prueba tiene la contraseña publicada en el README: si se pudiera borrar, desaparecería para todos
  if (correo.toLowerCase() === CORREO_DEMO) return responder(req, { error: 'La cuenta de prueba no se puede borrar' }, 403)

  // Reautenticación: el token solo demuestra que hay una sesión abierta (puede ser un ordenador del aula que
  // alguien olvidó cerrar). La contraseña demuestra que es el dueño. Se comprueba AQUÍ, no en el navegador,
  // porque cualquiera con el token podría llamar a esta función saltándose lo que haga la web
  const { clave } = await req.json().catch(() => ({}))
  if (typeof clave !== 'string' || !clave) return responder(req, { error: 'Escribe tu contraseña' }, 400)

  // Con la clave pública (anon), como haría el login. La sesión que crea da igual: se borra con el usuario
  const publico = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
  const { error: errorClave } = await publico.auth.signInWithPassword({ email: correo, password: clave })
  if (errorClave) return responder(req, { error: 'La contraseña no es correcta' }, 403)

  const { error } = await admin().auth.admin.deleteUser(userId)
  if (error) {
    console.error('borrar-cuenta', error.message)
    return responder(req, { error: 'No se pudo borrar la cuenta. Inténtalo más tarde' }, 500)
  }
  return responder(req, { ok: true })
})
