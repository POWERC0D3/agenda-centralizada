import { createClient, FunctionsHttpError, isAuthApiError } from '@supabase/supabase-js'
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from './config'

/**
 * El único cliente de Supabase de la web (como un bean singleton en Spring).
 * Guarda la sesión en localStorage y renueva el token solo: al recargar, sigues dentro.
 *
 * Solo se importa desde páginas que se cargan aparte (landing, ajustes): así supabase-js
 * no engorda el JavaScript inicial del panel.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA)

// Los errores de Auth llegan con un `code` estable (no con el texto, que puede cambiar): se traducen aquí
const MENSAJES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos',
  user_already_exists: 'Ya existe una cuenta con ese correo',
  email_exists: 'Ya existe una cuenta con ese correo',
  weak_password: 'La contraseña es demasiado débil: usa al menos 6 caracteres',
  email_address_invalid: 'Ese correo no es válido',
  email_not_confirmed: 'Tienes que confirmar tu correo antes de entrar',
  over_request_rate_limit: 'Demasiados intentos seguidos: espera un momento',
  over_email_send_rate_limit: 'Demasiados intentos seguidos: espera un momento',
  signup_disabled: 'El registro está desactivado ahora mismo',
}

/** Un error de Supabase (o de red) convertido en una frase para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (isAuthApiError(error) && error.code && MENSAJES[error.code]) return MENSAJES[error.code]
  if (error instanceof TypeError) return 'No hay conexión: comprueba tu internet' // fetch falla con TypeError
  return 'Algo ha fallado. Inténtalo de nuevo'
}

/** El mensaje de error que devuelve una Edge Function ({ error: "…" }), o uno genérico. */
export async function mensajeDe(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await error.context.json()) as { error?: string }
      if (cuerpo.error) return cuerpo.error
    } catch {
      // sin cuerpo JSON
    }
  }
  return 'No se pudo completar. Comprueba tu conexión e inténtalo de nuevo'
}
