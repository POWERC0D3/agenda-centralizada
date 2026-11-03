import { useEffect, useState } from 'react'
import { sonar } from '../lib/sonido'

/** Un mensaje flotante que desaparece solo: a los 2,5 s, o más si es largo (lo que se tarda en leerlo, hasta 6 s). */
export function useAviso() {
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null)

  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(() => setAviso(null), Math.min(6000, Math.max(2500, aviso.texto.length * 55)))
    return () => clearTimeout(t)
  }, [aviso])

  // El id cambia en cada llamada: repetir el mismo texto reinicia el temporizador
  const avisar = (texto: string) => {
    sonar('notification', { volumen: 0.5 })
    setAviso({ texto, id: Date.now() })
  }

  return { aviso, avisar }
}
