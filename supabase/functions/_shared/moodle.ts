// Cliente mínimo de la API oficial de Moodle (método A, token). Ver docs/INTEGRACIONES.md §3.2.

/** Los Moodle permitidos. El navegador manda el identificador, nunca una URL: así nadie puede usar
 *  la función para que haga peticiones a otras webs (SSRF). */
export const SITIOS = {
  centro: 'https://aula.iesmontenaranco.com',
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
export async function pedirToken(base: string, usuario: string, clave: string): Promise<string> {
  const r = await fetch(`${base}/login/token.php`, {
    method: 'POST',
    body: new URLSearchParams({ username: usuario, password: clave, service: 'moodle_mobile_app' }),
  })
  const datos = await r.json()
  if (datos.token) return datos.token as string
  // invalidlogin = usuario o contraseña mal; enablewsdescription = la API está apagada en ese sitio
  throw new ErrorMoodle(datos.errorcode ?? 'desconocido', datos.error ?? 'Moodle no ha dado un token')
}

/** 2) Llamada a una función de la API REST. Un error de Moodle es un OBJETO con `exception`. */
export async function llamar<T>(base: string, token: string, funcion: string, parametros: Record<string, string> = {}): Promise<T> {
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
