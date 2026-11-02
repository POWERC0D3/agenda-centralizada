import { useEffect, useRef, useState } from 'react'
import { diasEntre, parseFecha } from '../lib/fechas'

const PREFIJO = 'agenda:hechas:'
const CONSERVAR_DIAS = 14

// El módulo de la base de datos se carga aparte (import dinámico): el panel no espera por supabase-js
const cargar = () => import('../lib/hechas')

function leer(dia: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PREFIJO + dia) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Borra las marcas guardadas en este navegador (al cerrar sesión: el siguiente no ve las tuyas). */
export function borrarHechasLocales() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const clave = localStorage.key(i)
      if (clave?.startsWith(PREFIJO)) localStorage.removeItem(clave)
    }
  } catch {
    // sin almacenamiento: no hay nada guardado
  }
}

/**
 * Las tareas marcadas como hechas, POR DÍA: cada día tiene su hoja limpia.
 * - Con sesión: la cuenta manda (tabla `tareas_hechas`). Se descargan al abrir el día y al volver a la
 *   pestaña, y cada marca se guarda al momento: lo marcado en el móvil aparece en el ordenador.
 * - Sin sesión: solo en este navegador ("agenda:hechas:2026-11-12"), como antes.
 * En el navegador se guarda siempre una copia: así el día se pinta al instante, antes de oír a la red.
 */
export function useHechas(dia: string) {
  const [hechas, setHechas] = useState<ReadonlySet<string>>(() => leer(dia))
  const [diaLeido, setDiaLeido] = useState(dia)
  const usuario = useRef<string | null>(null)

  // Ha cambiado el día (medianoche con la web abierta): se lee la lista del día nuevo.
  // Es "ajustar el estado durante el render", el patrón que recomienda React para esto.
  if (diaLeido !== dia) {
    setDiaLeido(dia)
    setHechas(leer(dia))
  }

  // Copia en el navegador (y limpieza de los días viejos)
  useEffect(() => {
    try {
      localStorage.setItem(PREFIJO + dia, JSON.stringify([...hechas]))
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const clave = localStorage.key(i)
        if (!clave?.startsWith(PREFIJO)) continue
        if (Math.abs(diasEntre(parseFecha(clave.slice(PREFIJO.length)), parseFecha(dia))) > CONSERVAR_DIAS)
          localStorage.removeItem(clave)
      }
    } catch {
      // sin almacenamiento: se recuerda solo mientras la página esté abierta
    }
  }, [dia, hechas])

  // La cuenta: al abrir el día y al volver a la pestaña
  useEffect(() => {
    let vivo = true
    const traer = async () => {
      const m = await cargar()
      const id = await m.usuarioActual()
      usuario.current = id
      if (!id) return // sin sesión: se queda con lo del navegador
      const nube = await m.descargarHechas(id, dia)
      if (vivo) setHechas(new Set(nube))
    }
    traer().catch(() => {
      // sin red: se queda con la copia del navegador
    })
    const alVolver = () => {
      if (document.visibilityState === 'visible') traer().catch(() => {})
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [dia])

  const alternar = (id: string) => {
    const hecha = !hechas.has(id)
    // Al instante en pantalla (actualización optimista); a la cuenta, en segundo plano
    setHechas((prev) => {
      const nuevo = new Set(prev)
      if (hecha) nuevo.add(id)
      else nuevo.delete(id)
      return nuevo
    })
    const u = usuario.current
    if (u)
      cargar()
        .then((m) => m.guardarHecha(u, dia, id, hecha))
        .catch(() => {
          // sin red: la marca queda en este navegador; al volver a la pestaña manda otra vez la cuenta
        })
  }

  return { hechas, alternar }
}
