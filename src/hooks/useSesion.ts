import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
  return { sesion, usuario, nombre, cargando }
}

export const cerrarSesion = () => supabase.auth.signOut()
