// POST /functions/v1/conectar-moodle   { sitio: 'centro', usuario, clave }   (con la sesión del alumno)
//
// 1. Pide a Moodle un token con el usuario y la contraseña (la contraseña se usa AQUÍ y se olvida).
// 2. Comprueba el token y averigua el id del alumno en Moodle.
// 3. Guarda la conexión con el token CIFRADO.
// 4. Sincroniza por primera vez.
import { cifrar } from '../_shared/cifrado.ts'
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'
import { ErrorMoodle, infoSitio, pedirToken, SITIOS, type Sitio } from '../_shared/moodle.ts'
import { sincronizarConexion } from '../_shared/sincronizar.ts'

// Mensajes para el alumno según el código de error de Moodle
const MENSAJES: Record<string, string> = {
  invalidlogin: 'Usuario o contraseña de Moodle incorrectos',
  enablewsdescription: 'Este Moodle tiene la API apagada: aún no se puede conectar',
  usernotconfirmed: 'Tu cuenta de Moodle no está confirmada',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras(req) }) // "preflight" de CORS
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const userId = await quienLlama(req)
  if (!userId) return responder(req, { error: 'Inicia sesión para conectar Moodle' }, 401)

  let cuerpo: { sitio?: string; usuario?: string; clave?: string }
  try {
    cuerpo = await req.json()
  } catch {
    return responder(req, { error: 'Petición mal formada' }, 400)
  }
  const sitio = cuerpo.sitio as Sitio
  if (!(sitio in SITIOS)) return responder(req, { error: 'Ese Moodle no está permitido' }, 400)
  const usuario = String(cuerpo.usuario ?? '').trim()
  const clave = String(cuerpo.clave ?? '')
  if (!usuario || !clave) return responder(req, { error: 'Faltan el usuario o la contraseña' }, 400)

  const base = SITIOS[sitio]
  try {
    const token = await pedirToken(base, usuario, clave)
    const info = await infoSitio(base, token)

    const db = admin()
    const { data: conexion, error } = await db
      .from('conexiones_moodle')
      .upsert(
        {
          user_id: userId,
          sitio,
          nombre: info.sitename,
          usuario: info.username,
          moodle_user_id: info.userid,
          metodo: 'token',
          token_cifrado: await cifrar(token),
          ultimo_error: null,
        },
        { onConflict: 'user_id,sitio' }, // volver a conectar sustituye la conexión anterior
      )
      .select('id, user_id, sitio, moodle_user_id, token_cifrado')
      .single()
    if (error) throw error

    const pendientes = await sincronizarConexion(db, conexion)
    return responder(req, { ok: true, nombre: info.sitename, pendientes })
  } catch (e) {
    if (e instanceof ErrorMoodle) return responder(req, { error: MENSAJES[e.codigo] ?? `Moodle: ${e.message}` }, 400)
    console.error('conectar-moodle', e instanceof Error ? e.message : e) // sin datos sensibles
    return responder(req, { error: 'No se pudo conectar con Moodle. Inténtalo más tarde' }, 502)
  }
})
