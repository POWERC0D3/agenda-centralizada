import type { AuthChangeEvent } from '@supabase/supabase-js'
import { ajustarGrupo, CICLOS, CURSOS, LETRAS, type Grupo } from './grupos'
import { supabase } from './supabase'

/**
 * Lo que se guarda de Ajustes en la cuenta (tabla `perfiles`), en la forma que usa la web.
 * Este archivo solo se importa con import() dinámico: así supabase-js no entra en el JS inicial del panel.
 */
export type AjustesCuenta = {
  grupo: Grupo
  modulos: string[] // ordenados: así dos listas iguales dan el mismo JSON
  sonido: { activo: boolean; volumen: number } // volumen 0..1, como en lib/sonido
}

type FilaPerfil = {
  ciclo: string
  curso: string
  letra: string
  modulos_excluidos: string[]
  sonido_activo: boolean
  volumen: number // 0..100
}

/** De la fila de la base de datos a la forma de la web (validando: un valor raro → no se aplica). */
function desdeFila(f: FilaPerfil): AjustesCuenta | null {
  const ciclo = CICLOS.find((c) => c === f.ciclo)
  const curso = CURSOS.find((c) => c === f.curso)
  const letra = LETRAS.find((l) => l === f.letra)
  if (!ciclo || !curso || !letra) return null
  return {
    grupo: ajustarGrupo({ ciclo, curso, letra }), // un grupo que ya no existe → el más parecido que sí
    modulos: [...f.modulos_excluidos].sort(),
    sonido: { activo: f.sonido_activo, volumen: f.volumen / 100 },
  }
}

/** El perfil guardado de un usuario, o null si aún no tiene (su primera vez). Lanza si falla la red. */
export async function descargarPerfil(userId: string): Promise<AjustesCuenta | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('ciclo, curso, letra, modulos_excluidos, sonido_activo, volumen')
    .eq('user_id', userId) // el RLS ya solo deja ver el propio, pero así la consulta dice lo que quiere
    .maybeSingle() // 0 filas → null (sin error); 1 fila → la fila
  if (error) throw error
  return data ? desdeFila(data) : null
}

/** Crea o actualiza el perfil (upsert: INSERT si no existe, UPDATE si ya existe). */
export async function subirPerfil(userId: string, a: AjustesCuenta): Promise<void> {
  const { error } = await supabase.from('perfiles').upsert(
    {
      user_id: userId,
      ciclo: a.grupo.ciclo,
      curso: a.grupo.curso,
      letra: a.grupo.letra,
      modulos_excluidos: a.modulos,
      sonido_activo: a.sonido.activo,
      volumen: Math.round(a.sonido.volumen * 100),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

/** Avisa de cada cambio de sesión con el id del usuario (o null). Devuelve la función para dejar de escuchar. */
export function alCambiarSesion(aviso: (evento: AuthChangeEvent, userId: string | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
    // Las llamadas a Supabase dentro de este callback pueden bloquearse (lo advierte su documentación):
    // se aplaza el aviso a la siguiente vuelta del bucle de eventos
    setTimeout(() => aviso(evento, sesion?.user.id ?? null), 0)
  })
  return () => data.subscription.unsubscribe()
}
