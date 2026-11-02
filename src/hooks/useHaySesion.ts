import { useEffect, useState } from 'react'
import { SUPABASE_URL } from '../lib/config'

// supabase-js guarda la sesión en localStorage con la clave "sb-<id del proyecto>-auth-token"
const CLAVE_SESION = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

/** ¿Hay una sesión guardada en este navegador? Se mira al instante, sin esperar a cargar supabase-js. */
function sesionGuardada(): boolean {
  try {
    return localStorage.getItem(CLAVE_SESION) !== null
  } catch {
    return false
  }
}

/**
 * ¿Hay alguien con la sesión iniciada? Para proteger el panel.
 *
 * Empieza con lo que dice el navegador (sin esperar a la red: el panel no "parpadea") y después
 * Supabase lo confirma: si la sesión había caducado, o se cierra en esta u otra pestaña, pasa a false.
 */
export function useHaySesion(): boolean {
  const [hay, setHay] = useState(sesionGuardada)

  useEffect(() => {
    let vivo = true
    let dejarDeEscuchar = () => {}
    // Import dinámico: supabase-js se carga aparte, igual que en la sincronización de Ajustes
    void import('../lib/perfil').then((m) => {
      if (!vivo) return
      dejarDeEscuchar = m.alCambiarSesion((_evento, userId) => setHay(userId !== null))
    })
    return () => {
      vivo = false
      dejarDeEscuchar()
    }
  }, [])

  return hay
}
