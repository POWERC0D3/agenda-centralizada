// Cliente mínimo de la API oficial de Moodle (método A, token). Ver docs/INTEGRACIONES.md §3.2.

/** Los Moodle permitidos. El navegador manda el identificador, nunca una URL: así nadie puede usar
 *  la función para que haga peticiones a otras webs (SSRF). */
export const SITIOS = {
  centro: 'https://aula.iesmontenaranco.com', // API oficial (método A, token)
  misaulas: 'https://aulas2.site', // API apagada (método B, sesión web)
} as const
export type Sitio = keyof typeof SITIOS

export class ErrorMoodle extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

/** 1) Usuario y contraseña → token del servicio de la app móvil. La contraseña no se guarda en ningún sitio. */
export async function pedirToken(
  base: string,
  usuario: string,
  clave: string,
): Promise<{ token: string; privatetoken: string | null }> {
  const r = await fetch(`${base}/login/token.php`, {
    method: 'POST',
    body: new URLSearchParams({ username: usuario, password: clave, service: 'moodle_mobile_app' }),
  })
  const datos = await r.json()
  // privatetoken: segunda clave para el inicio de sesión automático en el navegador (solo la da al conectar)
  if (datos.token) return { token: datos.token as string, privatetoken: (datos.privatetoken as string | undefined) ?? null }
  // invalidlogin = usuario o contraseña mal; enablewsdescription = la API está apagada en ese sitio
  throw new ErrorMoodle(datos.errorcode ?? 'desconocido', datos.error ?? 'Moodle no ha dado un token')
}

/** 2) Llamada a una función de la API REST. Un error de Moodle es un OBJETO con `exception`. */
export async function llamar<T>(
  base: string,
  token: string,
  funcion: string,
  parametros: Record<string, string> = {},
): Promise<T> {
  const r = await fetch(`${base}/webservice/rest/server.php`, {
    method: 'POST',
    body: new URLSearchParams({ wstoken: token, wsfunction: funcion, moodlewsrestformat: 'json', ...parametros }),
  })
  const datos = await r.json()
  // Ojo: una LISTA nunca es un error (en PowerShell, `.exception` sobre una lista daba un falso positivo)
  if (datos && !Array.isArray(datos) && datos.exception)
    throw new ErrorMoodle(datos.errorcode ?? 'desconocido', datos.message ?? 'Error de Moodle')
  return datos as T
}

export type InfoSitio = { sitename: string; username: string; userid: number }
export type Curso = { id: number; fullname: string }
export type Evento = {
  id: number
  name: string
  timesort: number // fecha límite (segundos unix)
  url: string
  modulename?: string
  course?: { id: number; fullname: string }
}

export const infoSitio = (base: string, token: string) => llamar<InfoSitio>(base, token, 'core_webservice_get_site_info')

export const cursos = (base: string, token: string, userid: number) =>
  llamar<Curso[]>(base, token, 'core_enrol_get_users_courses', { userid: String(userid) })

/** La "Línea de tiempo": solo lo pendiente (lo entregado desaparece). Desde hace 60 días, para incluir lo vencido. */
export async function lineaDeTiempo(base: string, token: string): Promise<Evento[]> {
  const desde = Math.floor(Date.now() / 1000) - 60 * 24 * 3600
  const r = await llamar<{ events: Evento[] }>(base, token, 'core_calendar_get_action_events_by_timesort', {
    timesortfrom: String(desde),
    limitnum: '50',
  })
  return r.events ?? []
}

/** "Vencimiento de Práctica 03" / "Práctica 03 vence" → "Práctica 03". */
export function limpiarTitulo(nombre: string): string {
  return nombre
    .replace(/^(vencimiento de|fecha de entrega de|cierre de|se cierra)\s+/i, '')
    .replace(/\s+(vence|se cierra|cierra|está pendiente|debe entregarse|is due|closes)\.?$/i, '')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Método B: la vía interna de la web (cuando la API está apagada). Ver docs/INTEGRACIONES.md §3.3.
// Se hace lo mismo que un navegador: pedir la página de login, enviar el formulario con la cookie,
// y llamar a lib/ajax/service.php como hace la propia web para pintar la Línea de tiempo.
// ─────────────────────────────────────────────────────────────────────────────

export type SesionWeb = { base: string; cookies: Map<string, string>; sesskey: string }

const NAVEGADOR = { 'User-Agent': 'MonteNarancoAgenda/1.0 (+https://agenda.alvaro.cloud)' }

/** Guarda las cookies de una respuesta (Set-Cookie) en el "bote" de cookies, como un navegador. */
function guardarCookies(r: Response, bote: Map<string, string>) {
  for (const c of r.headers.getSetCookie()) {
    const [par] = c.split(';')
    const i = par.indexOf('=')
    bote.set(par.slice(0, i).trim(), par.slice(i + 1))
  }
}
const cabeceraCookie = (bote: Map<string, string>) => [...bote].map(([k, v]) => `${k}=${v}`).join('; ')

/** Una petición con las cookies, siguiendo las redirecciones a mano (para no perder ninguna cookie por el camino). */
async function pedir(base: string, ruta: string, bote: Map<string, string>, init: RequestInit = {}): Promise<Response> {
  let url = new URL(ruta, base)
  let r = await fetch(url, {
    ...init,
    redirect: 'manual',
    headers: { ...NAVEGADOR, ...init.headers, Cookie: cabeceraCookie(bote) },
  })
  guardarCookies(r, bote)
  for (let saltos = 0; r.status >= 300 && r.status < 400 && saltos < 6; saltos++) {
    url = new URL(r.headers.get('location') ?? '/', url)
    if (url.origin !== new URL(base).origin) break // nunca seguir a otra web
    r = await fetch(url, { redirect: 'manual', headers: { ...NAVEGADOR, Cookie: cabeceraCookie(bote) } })
    guardarCookies(r, bote)
  }
  return r
}

/** Nombre del sitio, sin iniciar sesión (configuración pública que usa la app móvil). */
export async function nombreSitio(base: string): Promise<string | null> {
  try {
    const r = await fetch(`${base}/lib/ajax/service-nologin.php?info=tool_mobile_get_public_config`, {
      method: 'POST',
      headers: { ...NAVEGADOR, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ index: 0, methodname: 'tool_mobile_get_public_config', args: {} }]),
    })
    const [res] = await r.json()
    return res?.data?.sitename ?? null
  } catch {
    return null
  }
}

/** Inicia sesión como lo haría un navegador. Lanza ErrorMoodle('invalidlogin') si el usuario o la contraseña no valen. */
export async function abrirSesionWeb(base: string, usuario: string, clave: string): Promise<SesionWeb> {
  const cookies = new Map<string, string>()
  const portada = await (await pedir(base, '/login/index.php', cookies)).text()
  const logintoken = portada.match(/name="logintoken" value="([^"]+)"/)?.[1]
  if (!logintoken) throw new ErrorMoodle('sinformulario', 'No se encontró el formulario de inicio de sesión')

  const html = await (
    await pedir(base, '/login/index.php', cookies, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: usuario, password: clave, logintoken, anchor: '' }),
    })
  ).text()

  // OJO: la página de login fallido TAMBIÉN tiene sesskey. Lo que solo aparece con sesión es el enlace de salir
  const sesskey = html.match(/"sesskey":"(\w+)"/)?.[1]
  if (!sesskey || !html.includes('login/logout.php')) throw new ErrorMoodle('invalidlogin', 'Usuario o contraseña incorrectos')
  return { base, cookies, sesskey }
}

/** Llama a una función AJAX de Moodle con la sesión (lo mismo que hace su web). */
export async function ajax<T>(s: SesionWeb, metodo: string, args: Record<string, unknown>): Promise<T> {
  const r = await pedir(s.base, `/lib/ajax/service.php?sesskey=${s.sesskey}&info=${metodo}`, s.cookies, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ index: 0, methodname: metodo, args }]),
  })
  const [res] = await r.json()
  if (!res || res.error) throw new ErrorMoodle(res?.exception?.errorcode ?? 'ajax', res?.exception?.message ?? 'Error de Moodle')
  return res.data as T
}

export async function cerrarSesionWeb(s: SesionWeb) {
  await pedir(s.base, `/login/logout.php?sesskey=${s.sesskey}`, s.cookies).catch(() => {})
}

/** Cursos y Línea de tiempo por la vía web (mismas formas que en el método A). */
export async function cursosWeb(s: SesionWeb): Promise<Curso[]> {
  const r = await ajax<{ courses: Curso[] }>(s, 'core_course_get_enrolled_courses_by_timeline_classification', {
    offset: 0,
    limit: 0,
    classification: 'all',
    sort: 'fullname',
  })
  return r.courses ?? []
}

export async function lineaDeTiempoWeb(s: SesionWeb): Promise<Evento[]> {
  const desde = Math.floor(Date.now() / 1000) - 60 * 24 * 3600
  const r = await ajax<{ events: Evento[] }>(s, 'core_calendar_get_action_events_by_timesort', {
    timesortfrom: desde,
    limitnum: 50,
  })
  return r.events ?? []
}
