import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mensajeDe, supabase } from '../lib/supabase'

/**
 * Quién ha iniciado sesión (o null) y si aún se está comprobando.
 *
 * `onAuthStateChange` es un observador (patrón Observer, como un listener en Java): Supabase avisa
 * al entrar, al salir y al renovar el token, también si cambia en otra pestaña.
 */
export function useSesion() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva)
      setCargando(false)
    })
    return () => data.subscription.unsubscribe() // limpieza al desmontar
  }, [])

  const usuario = sesion?.user ?? null
  // El nombre se guarda al registrarse en los metadatos del usuario (user_metadata)
  const nombre = (usuario?.user_metadata?.nombre as string | undefined) ?? null
  const bienvenidaPendiente = usuario?.user_metadata?.repetir_bienvenida === true
  return { sesion, usuario, nombre, bienvenidaPendiente, cargando }
}

/**
 * Cierra la sesión. Si el servidor no responde (sin red), Supabase devuelve un error y NO la borra:
 * en ese caso se olvida al menos en este navegador (scope local), porque quien pulsa "Cerrar sesión" espera salir.
 */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) await supabase.auth.signOut({ scope: 'local' })
}

/**
 * Marca (o desmarca) la cuenta para que el próximo inicio de sesión repita la configuración guiada y el tutorial.
 * Va en los metadatos del usuario, como el nombre: es de la cuenta (vale en cualquier dispositivo) y no
 * necesita tabla. Con `null` Supabase borra la clave en vez de guardar `false`.
 */
export async function repetirBienvenida(si: boolean): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { repetir_bienvenida: si || null } })
  if (error) throw new Error('No se pudo guardar. Inténtalo de nuevo')
}

/**
 * Borra la cuenta y todos sus datos (Edge Function borrar-cuenta) y cierra la sesión.
 * La contraseña la comprueba la función, en el servidor: si no es correcta, lanza su mensaje ("La contraseña no es correcta").
 */
export async function borrarCuenta(clave: string): Promise<void> {
  const { error } = await supabase.functions.invoke('borrar-cuenta', { body: { clave } })
  if (error) throw new Error(await mensajeDe(error))
  // scope local: el usuario ya no existe en el servidor; basta con olvidar la sesión en este navegador
  await supabase.auth.signOut({ scope: 'local' })
}
