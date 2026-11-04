import { useEffect, useState } from 'react'

const CLAVE = 'daw1a:modulos-excluidos'

function leer(): Set<string> {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return new Set(guardado ? (JSON.parse(guardado) as string[]) : [])
  } catch {
    return new Set() // modo privado o datos corruptos: empezamos con todos activos
  }
}

/** Devuelve un Set nuevo con `id` puesto o quitado (React detecta cambios por referencia). */
function conmutar(prev: ReadonlySet<string>, id: string): Set<string> {
  const nuevo = new Set(prev)
  if (nuevo.has(id)) nuevo.delete(id)
  else nuevo.add(id)
  return nuevo
}

/**
 * Los módulos que NO cursas (convalidados): se eligen en Ajustes y se guardan en localStorage
 * (el almacenamiento del navegador, parecido a un Map<String,String> persistente) y en la cuenta.
 * Lo que se elige con un clic en el horario es otra cosa (la asignatura en foco) y vive en App.
 */
export function useModulos() {
  const [excluidos, setExcluidos] = useState<ReadonlySet<string>>(leer)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify([...excluidos]))
    } catch {
      // sin almacenamiento disponible: funciona igual, solo que no se recuerda
    }
  }, [excluidos])

  const alternar = (id: string) => setExcluidos((prev) => conmutar(prev, id))
  const restablecer = () => setExcluidos(new Set())
  // Sustituye la lista entera (al traer los ajustes de la cuenta desde otro dispositivo)
  const establecer = (ids: readonly string[]) => setExcluidos(new Set(ids))

  return { excluidos, alternar, restablecer, establecer }
}
