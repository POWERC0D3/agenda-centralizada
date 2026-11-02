import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { AjustesCuenta } from '../lib/perfil'

// El módulo de la base de datos se carga aparte (import dinámico): el panel no espera por supabase-js.
// import() guarda el módulo la primera vez, así que llamarlo varias veces no lo descarga de nuevo
const cargar = () => import('../lib/perfil')

const ESPERA_MS = 600 // agrupa varios clics seguidos en una sola subida (debounce)

/**
 * Mantiene Ajustes (grupo, módulos y sonido) igual en todos los dispositivos de la misma cuenta.
 *
 * - Al iniciar sesión: descarga el perfil y lo aplica (la nube manda). Si aún no hay perfil, sube el local.
 * - Al cambiar algo con sesión: lo sube a la cuenta, agrupando los cambios seguidos.
 * - Al volver a la pestaña: si en la nube hay otra cosa (cambiada desde otro dispositivo), la aplica.
 * - Al cerrar sesión: `reiniciar` (en un ordenador compartido, el siguiente no ve tu configuración).
 * Sin sesión no hace nada: los ajustes siguen guardándose solo en el navegador, como siempre.
 */
export function useAjustesEnLaNube(actuales: AjustesCuenta, aplicar: (a: AjustesCuenta) => void, reiniciar: () => void) {
  const usuario = useRef<string | null>(null) // quién tiene la sesión iniciada
  const enNube = useRef<string | null>(null) // JSON de lo último que sabemos que hay en la cuenta (null: aún no se sabe)
  const pendiente = useRef(false) // hay una subida esperando: no pisarla con una descarga
  const [sincronizado, setSincronizado] = useState(0) // cambia al terminar de descargar: reactiva la subida

  // useEffectEvent: funciones que leen siempre los valores más recientes sin obligar a reinstalar los listeners
  const leerActuales = useEffectEvent(() => actuales)
  const alAplicar = useEffectEvent((a: AjustesCuenta) => aplicar(a))
  const alReiniciar = useEffectEvent(() => reiniciar())

  // ── Descargar: al iniciar sesión y al volver a la pestaña ──
  useEffect(() => {
    let vivo = true
    let dejarDeEscuchar = () => {}

    const traer = async (userId: string) => {
      const m = await cargar()
      const remoto = await m.descargarPerfil(userId)
      if (!vivo || usuario.current !== userId) return // mientras tanto cerró sesión o entró otro
      if (remoto) {
        const json = JSON.stringify(remoto)
        if (json !== JSON.stringify(leerActuales())) alAplicar(remoto)
        enNube.current = json
      } else {
        // Primera vez con esta cuenta: lo que tenga este navegador pasa a ser su perfil
        const local = leerActuales()
        await m.subirPerfil(userId, local)
        enNube.current = JSON.stringify(local)
      }
      setSincronizado((n) => n + 1)
    }

    void cargar().then((m) => {
      if (!vivo) return
      dejarDeEscuchar = m.alCambiarSesion((evento, userId) => {
        if (evento === 'SIGNED_OUT') {
          usuario.current = null
          enNube.current = null
          alReiniciar()
          return
        }
        // INITIAL_SESSION (al cargar), SIGNED_IN (al entrar)… Las renovaciones del token no cambian de usuario
        if (!userId || userId === usuario.current) return
        usuario.current = userId
        enNube.current = null
        traer(userId).catch(() => {
          // sin red: se queda con lo del navegador; se reintenta al volver a la pestaña
        })
      })
    })

    const alVolver = () => {
      const id = usuario.current
      if (document.visibilityState !== 'visible' || !id || pendiente.current) return
      traer(id).catch(() => {})
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vivo = false
      dejarDeEscuchar()
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  // ── Subir: cuando cambia algo y ya sabemos lo que hay en la nube ──
  const json = JSON.stringify(actuales)
  useEffect(() => {
    const id = usuario.current
    if (!id || enNube.current === null || json === enNube.current) return
    pendiente.current = true
    const t = window.setTimeout(() => {
      void cargar()
        .then((m) => m.subirPerfil(id, JSON.parse(json) as AjustesCuenta))
        .then(() => {
          enNube.current = json
        })
        .catch(() => {
          // sin red: el cambio sigue en el navegador; se volverá a intentar con el próximo cambio
        })
        .finally(() => {
          pendiente.current = false
        })
    }, ESPERA_MS)
    return () => {
      clearTimeout(t) // otro cambio antes de tiempo: se reinicia la espera (debounce)
      pendiente.current = false
    }
  }, [json, sincronizado])
}
