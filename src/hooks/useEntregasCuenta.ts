import { useEffect, useState } from 'react'
import { isoLocal } from '../lib/fechas'
import type { Evento } from '../types'

/**
 * Las entregas de la cuenta (las de Moodle, y más adelante las añadidas a mano) convertidas en `Evento`,
 * para mezclarlas con las del JSON en la Agenda y el Calendario.
 * Se vuelven a leer al cambiar la sesión, al volver a la pestaña y cuando Ajustes avisa de un cambio
 * (conectar, sincronizar, desconectar).
 */
export function useEntregasCuenta(): Evento[] {
  const [eventos, setEventos] = useState<Evento[]>([])

  useEffect(() => {
    let vivo = true
    const traer = async () => {
      const m = await import('../lib/moodle')
      const entregas = await m.misEntregas()
      if (!vivo) return
      setEventos(
        entregas.map((e) => ({
          id: `cuenta-${e.id}`, // id estable: de él depende recordar si la tarea está hecha
          fecha: isoLocal(new Date(e.fecha)),
          asignatura: e.asignatura_id,
          tipo: e.tipo,
          detalle: e.titulo,
          url: e.url ?? undefined,
          fuente: e.fuente,
          origen: e.origen,
        })),
      )
    }
    const intentar = () => {
      traer().catch(() => {
        // sin red o sin sesión: se queda con lo que tenía
      })
    }
    // Al cambiar la sesión (entrar, salir, otra cuenta) también: la App está montada desde antes del login
    let dejarDeEscuchar = () => {}
    void import('../lib/perfil').then((m) => {
      if (vivo) dejarDeEscuchar = m.alCambiarSesion(() => intentar())
    })
    const alVolver = () => document.visibilityState === 'visible' && intentar()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('agenda:entregas', intentar)
    return () => {
      vivo = false
      dejarDeEscuchar()
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('agenda:entregas', intentar)
    }
  }, [])

  return eventos
}
