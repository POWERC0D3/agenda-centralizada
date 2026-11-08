import { useEffect, useState, type FormEvent } from 'react'
import { nombreAsignatura } from '../../lib/datos'
import {
  cambiarAsignaturaCurso,
  conectarMoodle,
  desconectarMoodle,
  misConexiones,
  misCursos,
  sincronizarAhora,
  type ConexionMoodle as Conexion,
  type CursoMoodle,
} from '../../lib/moodle'
import { sonar } from '../../lib/sonido'

// Cada sitio: su nombre, su dominio y qué pasa con la contraseña (hay que decirlo con claridad)
const SITIOS = {
  centro: {
    titulo: 'Moodle del instituto',
    dominio: 'aula.iesmontenaranco.com',
    nota: (
      <>
        Tu contraseña <strong className="font-medium text-tinta">no se guarda</strong>: solo se usa para pedir a Moodle una clave de
        acceso (la de su app móvil), que se guarda cifrada y que esta web usa únicamente para leer tus entregas pendientes. Puedes
        revocarla cuando quieras desconectando aquí o en Moodle (Preferencias → Claves de seguridad).
      </>
    ),
  },
  misaulas: {
    titulo: 'Mis Aulas',
    dominio: 'aulas2.site',
    nota: (
      <>
        Esta web tiene apagado el acceso para aplicaciones, así que para leer tus entregas hay que iniciar sesión por ti en cada
        sincronización: <strong className="font-medium text-tinta">tu contraseña se guarda cifrada</strong> y solo la usa el
        servidor para eso. Al desconectar se borra. Si cambias tu contraseña de Mis Aulas, vuelve a conectar.
      </>
    ),
  },
} as const

/**
 * Los cursos de una conexión y la asignatura de cada uno (para el color y el nombre en la agenda).
 * La sincronización la adivina por el nombre del curso; aquí se corrige si se equivoca.
 */
function CursosConexion({ conexionId, modulos, avisar }: { conexionId: string; modulos: string[]; avisar: (t: string) => void }) {
  const [cursos, setCursos] = useState<CursoMoodle[] | null>(null)

  useEffect(() => {
    let vivo = true
    misCursos(conexionId)
      .then((c) => vivo && setCursos(c))
      .catch(() => vivo && setCursos([]))
    return () => {
      vivo = false
    }
  }, [conexionId])

  if (!cursos) return <p className="mt-2 text-xs text-tinta-suave">Cargando cursos…</p>
  if (!cursos.length) return <p className="mt-2 text-xs text-tinta-suave">Aún no hay cursos: sincroniza primero.</p>

  return (
    <ul className="mt-2 space-y-1.5">
      {cursos.map((c) => {
        // Las asignaturas de tu grupo, y la que tenga ahora aunque sea de otro (para no perderla de la lista)
        const opciones = c.asignatura_id && !modulos.includes(c.asignatura_id) ? [...modulos, c.asignatura_id] : modulos
        return (
          <li key={c.curso_id} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-tinta-suave" title={c.nombre}>
              {c.nombre}
            </span>
            <select
              value={c.asignatura_id ?? ''}
              aria-label={`Asignatura del curso ${c.nombre}`}
              onChange={(e) => {
                const nueva = e.target.value || null
                setCursos((prev) => prev && prev.map((x) => (x.curso_id === c.curso_id ? { ...x, asignatura_id: nueva } : x)))
                sonar('select', { volumen: 0.6 })
                cambiarAsignaturaCurso(conexionId, c, nueva)
                  .then(() => avisar(`${c.nombre}: ${nueva ? nombreAsignatura(nueva) : 'sin asignatura'}`))
                  .catch(() => avisar('No se pudo cambiar la asignatura'))
              }}
              className="w-44 shrink-0 border border-linea bg-fondo px-2 py-1 text-xs text-tinta outline-none focus:border-arena"
            >
              <option value="">Sin asignatura</option>
              {opciones.map((id) => (
                <option key={id} value={id}>
                  {nombreAsignatura(id)}
                </option>
              ))}
            </select>
          </li>
        )
      })}
    </ul>
  )
}

type Props = {
  sitio: keyof typeof SITIOS
  /** Las asignaturas del grupo del alumno (para corregir la de cada curso) */
  modulos: string[]
  haySesion: boolean
  /** La cuenta de prueba: el servidor no le deja conectar plataformas (aquí solo se explica) */
  demo?: boolean
  avisar: (texto: string) => void
  /** Se ha usado (conectar, sincronizar…): en la configuración guiada, enseña la siguiente sección */
  onUsar: () => void
}

/** "hace 5 min", "hace 2 h", "hace 3 días" */
function hace(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} días`
}

const campo = 'w-full border border-linea bg-fondo px-3 py-2 text-sm outline-none transition-colors focus:border-arena'
const boton = 'border border-linea px-3.5 py-1.5 text-sm transition-colors disabled:cursor-wait disabled:opacity-50'

/**
 * La conexión con el Moodle del centro (aula.iesmontenaranco.com).
 * La contraseña solo viaja a la Edge Function, que pide a Moodle un acceso (token) y la olvida.
 */
export function ConexionMoodle({ sitio, modulos, haySesion, demo = false, avisar, onUsar }: Props) {
  const [verCursos, setVerCursos] = useState(false)
  const info = SITIOS[sitio]
  const [conexion, setConexion] = useState<Conexion | null | undefined>(undefined) // undefined = cargando
  const [formulario, setFormulario] = useState(false)
  const [ocupado, setOcupado] = useState<null | 'conectar' | 'sincronizar' | 'desconectar'>(null)
  const [error, setError] = useState<string | null>(null)

  const leer = () =>
    misConexiones()
      .then((cs) => setConexion(cs.find((c) => c.sitio === sitio) ?? null))
      .catch(() => setConexion(null))

  useEffect(() => {
    if (!haySesion) return
    let vivo = true // si se desmonta antes de que llegue la respuesta, no se toca el estado
    misConexiones()
      .then((cs) => vivo && setConexion(cs.find((c) => c.sitio === sitio) ?? null))
      .catch(() => vivo && setConexion(null))
    return () => {
      vivo = false
    }
  }, [haySesion, sitio])

  const conectar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    setOcupado('conectar')
    setError(null)
    onUsar()
    try {
      const r = await conectarMoodle(sitio, String(datos.get('usuario')).trim(), String(datos.get('clave')))
      sonar('toggle_on')
      avisar(r.pendientes ? `Conectado: ${r.pendientes} entregas pendientes` : 'Conectado: no tienes entregas pendientes')
      setFormulario(false)
      await leer()
    } catch (err) {
      sonar('caution', { volumen: 0.5 })
      setError(err instanceof Error ? err.message : 'No se pudo conectar')
    } finally {
      setOcupado(null)
    }
  }

  const sincronizar = async () => {
    setOcupado('sincronizar')
    onUsar()
    try {
      const r = await sincronizarAhora()
      avisar(r.fallos ? 'No se pudo sincronizar: mira el aviso de la conexión' : `Sincronizado: ${r.pendientes} entregas pendientes`)
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudo sincronizar')
    } finally {
      await leer()
      setOcupado(null)
    }
  }

  const desconectar = async () => {
    if (!conexion) return
    setOcupado('desconectar')
    try {
      await desconectarMoodle(conexion.id)
      sonar('toggle_off')
      avisar(`${info.titulo} desconectado: se han borrado su acceso y sus entregas`)
      setConexion(null)
    } catch {
      avisar('No se pudo desconectar')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="border border-linea bg-fondo-alto/60 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span>
          <span className="block font-medium">{info.titulo}</span>
          <span className="block text-xs text-tinta-suave">{info.dominio}</span>
        </span>

        {!haySesion ? (
          <span className="text-xs text-tinta-suave">Inicia sesión para conectarlo</span>
        ) : demo ? (
          <span className="text-xs text-tinta-suave">No disponible en la cuenta de prueba</span>
        ) : conexion === undefined ? (
          <span className="text-xs text-tinta-suave">Comprobando…</span>
        ) : conexion ? (
          <span className="flex gap-2">
            <button type="button" disabled={ocupado !== null} onClick={sincronizar} className={`${boton} hover:border-arena hover:text-arena`}>
              {ocupado === 'sincronizar' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button type="button" disabled={ocupado !== null} onClick={desconectar} className={`${boton} hover:border-coral hover:text-coral`}>
              Desconectar
            </button>
          </span>
        ) : (
          !formulario && (
            <button
              type="button"
              onClick={() => {
                sonar('select', { volumen: 0.7 })
                setFormulario(true)
              }}
              className={`${boton} hover:border-arena hover:text-arena`}
            >
              Conectar
            </button>
          )
        )}
      </div>

      {/* Estado de la conexión */}
      {haySesion && conexion && (
        <p className={`mt-3 text-xs ${conexion.ultimo_error ? 'text-coral' : 'text-tinta-suave'}`}>
          {conexion.ultimo_error
            ? conexion.ultimo_error
            : `Conectado como ${conexion.usuario}${conexion.ultimo_sync ? ` · sincronizado ${hace(conexion.ultimo_sync)}` : ''}`}
        </p>
      )}

      {/* Cursos: de qué asignatura es cada uno (desplegable) */}
      {haySesion && conexion && (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={verCursos}
            onClick={() => setVerCursos((v) => !v)}
            className="text-xs text-tinta-suave underline-offset-4 transition-colors hover:text-tinta hover:underline"
          >
            {verCursos ? 'Ocultar cursos' : 'Cursos y asignaturas'}
          </button>
          {verCursos && <CursosConexion conexionId={conexion.id} modulos={modulos} avisar={avisar} />}
        </div>
      )}

      {/* Formulario: usuario y contraseña de Moodle */}
      {haySesion && conexion === null && formulario && (
        <form onSubmit={conectar} className="mt-4 space-y-3" aria-busy={ocupado === 'conectar'}>
          <label className="block">
            <span className="mb-1.5 block text-xs text-tinta-suave">Usuario de {info.titulo}</span>
            <input name="usuario" required autoComplete="username" className={campo} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-tinta-suave">Contraseña de {info.titulo}</span>
            <input name="clave" type="password" required autoComplete="current-password" className={campo} />
          </label>
          <p className="text-xs leading-relaxed text-tinta-suave">
            {info.nota}{' '}
            <a href="#/privacidad" className="text-tinta underline underline-offset-4 hover:text-arena">
              Más sobre tu privacidad
            </a>
            .
          </p>
          {error && (
            <p role="alert" className="text-xs text-coral">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ocupado !== null}
              className="bg-arena px-4 py-2 text-sm font-semibold text-oscuro-fijo transition-colors hover:bg-tinta disabled:cursor-wait disabled:opacity-60"
            >
              {ocupado === 'conectar' ? 'Conectando…' : 'Conectar'}
            </button>
            <button type="button" onClick={() => setFormulario(false)} className="px-3 text-sm text-tinta-suave hover:text-tinta">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
