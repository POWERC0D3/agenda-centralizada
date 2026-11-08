// POST /functions/v1/conectar-moodle   { sitio: 'centro', usuario, clave }   (con la sesión del alumno)
//
// Método A (sitio con API, 'centro'): pide un token con el usuario y la contraseña, y guarda SOLO el token
//   cifrado. La contraseña se usa aquí y se olvida.
// Método B (sitio con la API apagada, 'misaulas'): no hay token posible. Se comprueba que el usuario y la
//   contraseña inician sesión en la web, y se guarda la CONTRASEÑA CIFRADA (cada sincronización vuelve a entrar).
// Después, en los dos casos, la primera sincronización.
import { cifrar } from '../_shared/cifrado.ts'
import { esCuentaDemo } from '../_shared/demo.ts'
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'
import {
  abrirSesionWeb,
  cerrarSesionWeb,
  ErrorMoodle,
  infoSitio,
  nombreSitio,
  pedirToken,
  SITIOS,
  type Sitio,
} from '../_shared/moodle.ts'
import { COLUMNAS_CONEXION, sincronizarConexion } from '../_shared/sincronizar.ts'

// Qué método usa cada sitio (lo averiguó la investigación: docs/INTEGRACIONES.md §3.5)
const METODO: Record<Sitio, 'token' | 'sesion'> = { centro: 'token', misaulas: 'sesion' }

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
  // Cuenta de prueba (contraseña pública): nadie debe dejar ahí sus credenciales para el siguiente visitante
  if (await esCuentaDemo(userId)) return responder(req, { error: 'En la cuenta de prueba no se pueden conectar plataformas' }, 403)

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
    let fila: Record<string, unknown>
    if (METODO[sitio] === 'token') {
      const { token, privatetoken } = await pedirToken(base, usuario, clave)
      const info = await infoSitio(base, token)
      fila = {
        nombre: info.sitename,
        usuario: info.username,
        moodle_user_id: info.userid,
        metodo: 'token',
        token_cifrado: await cifrar(token),
        privatetoken_cifrado: privatetoken ? await cifrar(privatetoken) : null,
        password_cifrada: null,
      }
    } else {
      // Probar que la contraseña vale (y cerrar enseguida esa sesión) antes de guardarla
      const sesion = await abrirSesionWeb(base, usuario, clave)
      await cerrarSesionWeb(sesion)
      fila = {
        nombre: (await nombreSitio(base)) ?? 'Mis Aulas',
        usuario,
        moodle_user_id: null,
        metodo: 'sesion',
        token_cifrado: null,
        privatetoken_cifrado: null,
        password_cifrada: await cifrar(clave),
      }
    }

    const db = admin()
    const { data: conexion, error } = await db
      .from('conexiones_moodle')
      .upsert({ user_id: userId, sitio, ...fila, ultimo_error: null }, { onConflict: 'user_id,sitio' }) // reconectar sustituye la anterior
      .select(COLUMNAS_CONEXION)
      .single()
    if (error) throw error

    const pendientes = await sincronizarConexion(db, conexion)
    return responder(req, { ok: true, nombre: fila.nombre, pendientes })
  } catch (e) {
    if (e instanceof ErrorMoodle) return responder(req, { error: MENSAJES[e.codigo] ?? `Moodle: ${e.message}` }, 400)
    console.error('conectar-moodle', e instanceof Error ? e.message : e) // sin datos sensibles
    return responder(req, { error: 'No se pudo conectar con Moodle. Inténtalo más tarde' }, 502)
  }
})
