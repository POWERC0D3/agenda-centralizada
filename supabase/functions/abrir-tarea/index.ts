// POST /functions/v1/abrir-tarea   { entrega: "<uuid>" }   (con la sesión del alumno)
//
// Devuelve el enlace para abrir una entrega de Moodle en el navegador:
// - Siempre, el enlace normal de la tarea.
// - Moodle del centro (método A, con privatetoken): además, las claves para que el NAVEGADOR pida a Moodle una clave
//   de un solo uso y entre ya dentro (Moodle exige que la pida la misma IP que la va a usar).
// Se pide el id de una entrega DEL ALUMNO, nunca una URL: la función no abre direcciones arbitrarias.
import { descifrar } from '../_shared/cifrado.ts'
import { admin, cabeceras, quienLlama, responder } from '../_shared/http.ts'
import { SITIOS, type Sitio } from '../_shared/moodle.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabeceras(req) })
  if (req.method !== 'POST') return responder(req, { error: 'Método no permitido' }, 405)

  const userId = await quienLlama(req)
  if (!userId) return responder(req, { error: 'Inicia sesión para abrir la tarea' }, 401)

  let entregaId: string
  try {
    entregaId = String((await req.json()).entrega ?? '')
  } catch {
    return responder(req, { error: 'Petición mal formada' }, 400)
  }

  const db = admin()
  const { data: e } = await db
    .from('entregas')
    .select('url, conexion_id, user_id')
    .eq('id', entregaId)
    .eq('user_id', userId) // solo entregas del que llama (service_role se salta el RLS: hay que filtrar a mano)
    .maybeSingle()
  if (!e?.url) return responder(req, { error: 'Esa tarea no existe' }, 404)

  // Por defecto, el enlace normal. Solo se mejora si todo lo necesario está disponible
  // El enlace normal, siempre. Y, si se puede, lo necesario para el inicio de sesión automático
  const respuesta: { url: string; autologin?: { base: string; token: string; privatetoken: string; userid: number } } = {
    url: e.url,
  }
  if (e.conexion_id) {
    const { data: c } = await db
      .from('conexiones_moodle')
      .select('sitio, metodo, moodle_user_id, token_cifrado, privatetoken_cifrado')
      .eq('id', e.conexion_id)
      .maybeSingle()
    const base = c ? SITIOS[c.sitio as Sitio] : null
    // El destino tiene que ser de ese mismo Moodle (no se usa el inicio de sesión para ir a otra web)
    const mismoSitio = base && new URL(e.url).origin === new URL(base).origin
    if (c && base && mismoSitio && c.metodo === 'token' && c.token_cifrado && c.privatetoken_cifrado && c.moodle_user_id) {
      // Moodle ata la clave de un solo uso a la IP de quien la pide: si la pidiera este servidor, el navegador
      // (otra IP) no podría usarla. Por eso se devuelven al DUEÑO sus claves y la pide su navegador.
      // Solo al pulsar una tarea, solo al dueño (filtrado por user_id arriba) y sin caché (no-store, abajo)
      respuesta.autologin = {
        base,
        token: await descifrar(c.token_cifrado),
        privatetoken: await descifrar(c.privatetoken_cifrado),
        userid: c.moodle_user_id,
      }
    }
  }
  const r = responder(req, respuesta)
  r.headers.set('Cache-Control', 'no-store') // ni el navegador ni ningún intermediario guardan esta respuesta
  return r
})
