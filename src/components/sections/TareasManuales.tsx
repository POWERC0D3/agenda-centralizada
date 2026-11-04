import { useEffect, useState, type FormEvent } from 'react'
import { nombreAsignatura } from '../../lib/datos'
import { formatoCorto } from '../../lib/fechas'
import { anadirTareaManual, borrarTareaManual, misTareasManuales, type TareaManual } from '../../lib/moodle'
import { sonar } from '../../lib/sonido'

type Props = {
  haySesion: boolean
  /** Las asignaturas del grupo del alumno */
  modulos: string[]
  avisar: (texto: string) => void
  /** Se ha usado: en la configuración guiada, enseña la siguiente sección */
  onUsar: () => void
}

const campo = 'w-full border border-linea bg-fondo px-3 py-2 text-sm outline-none transition-colors focus:border-arena'

/**
 * Tareas de Teams añadidas a mano (Educastur no deja conectar apps: ver docs/INTEGRACIONES.md §4).
 * Se guardan en la tabla `entregas` con origen 'manual' y plataforma 'Teams': salen en la Agenda y el
 * Calendario con su etiqueta, igual que las de Moodle.
 */
export function TareasManuales({ haySesion, modulos, avisar, onUsar }: Props) {
  const [tareas, setTareas] = useState<TareaManual[] | null>(null)
  const [formulario, setFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const leer = () =>
    misTareasManuales()
      .then(setTareas)
      .catch(() => setTareas([]))

  useEffect(() => {
    if (!haySesion) return
    let vivo = true
    misTareasManuales()
      .then((t) => vivo && setTareas(t))
      .catch(() => vivo && setTareas([]))
    return () => {
      vivo = false
    }
  }, [haySesion])

  const anadir = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formularioHtml = e.currentTarget
    const d = new FormData(formularioHtml)
    // Fecha y hora LOCALES → instante (ISO). Sin hora: el final del día
    const limite = new Date(`${d.get('fecha')}T${String(d.get('hora') || '23:59')}`)
    const url = String(d.get('url') ?? '').trim()
    setGuardando(true)
    onUsar()
    try {
      await anadirTareaManual({
        titulo: String(d.get('titulo')).trim(),
        fecha: limite.toISOString(),
        asignatura_id: String(d.get('asignatura') || '') || null,
        url: url || null,
        tipo: 'entrega',
        plataforma: 'Teams',
      })
      sonar('toggle_on')
      avisar('Tarea añadida a tu agenda')
      formularioHtml.reset()
      setFormulario(false)
      await leer()
    } catch {
      sonar('caution', { volumen: 0.5 })
      avisar('No se pudo añadir la tarea')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (t: TareaManual) => {
    try {
      await borrarTareaManual(t.id)
      sonar('toggle_off')
      setTareas((prev) => prev && prev.filter((x) => x.id !== t.id))
    } catch {
      avisar('No se pudo quitar la tarea')
    }
  }

  return (
    <div className="border border-linea bg-fondo-alto/60 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span>
          <span className="block font-medium">Teams</span>
          <span className="block text-xs text-tinta-suave">Educastur no deja conectar apps: añade sus tareas a mano</span>
        </span>
        {haySesion ? (
          !formulario && (
            <button
              type="button"
              onClick={() => {
                sonar('select', { volumen: 0.7 })
                setFormulario(true)
              }}
              className="border border-linea px-3.5 py-1.5 text-sm transition-colors hover:border-arena hover:text-arena"
            >
              Añadir tarea
            </button>
          )
        ) : (
          <span className="text-xs text-tinta-suave">Inicia sesión para añadirlas</span>
        )}
      </div>

      {/* El porqué, en corto: el detalle de lo que se probó está en docs/INTEGRACIONES.md §4 */}
      <p className="mt-3 border-l-2 border-linea py-0.5 pl-3 text-xs leading-relaxed text-tinta-suave">
        ¿Por qué a mano? Tu cuenta de Teams es de Educastur, y Educastur no deja que ninguna app externa lea tus tareas sin
        permiso de un administrador. Entrar con tu contraseña iría contra sus normas, y automatizarlo con Power Automate
        obligaría a cada alumno a montarse su propio flujo.
      </p>

      {haySesion && formulario && (
        <form onSubmit={anadir} className="mt-4 space-y-3" aria-busy={guardando}>
          <label className="block">
            <span className="mb-1.5 block text-xs text-tinta-suave">Qué hay que entregar</span>
            <input name="titulo" required maxLength={200} placeholder="Entrega de la práctica 4" className={campo} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-tinta-suave">Fecha límite</span>
              <input name="fecha" type="date" required className={campo} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-tinta-suave">Hora (opcional)</span>
              <input name="hora" type="time" className={campo} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs text-tinta-suave">Asignatura</span>
            <select name="asignatura" className={campo} defaultValue="">
              <option value="">Sin asignatura</option>
              {modulos.map((id) => (
                <option key={id} value={id}>
                  {nombreAsignatura(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-tinta-suave">Enlace a la tarea en Teams (opcional)</span>
            {/* type="url" + pattern: la base de datos solo acepta http(s)://, se avisa antes de enviar */}
            <input name="url" type="url" pattern="https?://.*" placeholder="https://teams.microsoft.com/…" className={campo} />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-arena px-4 py-2 text-sm font-semibold text-oscuro-fijo transition-colors hover:bg-tinta disabled:cursor-wait disabled:opacity-60"
            >
              {guardando ? 'Añadiendo…' : 'Añadir'}
            </button>
            <button type="button" onClick={() => setFormulario(false)} className="px-3 text-sm text-tinta-suave hover:text-tinta">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Las añadidas: para quitarlas cuando ya estén entregadas */}
      {haySesion && tareas && tareas.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-linea pt-3">
          {tareas.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate">
                <span className="font-mono text-tinta-suave">{formatoCorto(new Date(t.fecha))}</span>
                {' · '}
                {t.titulo}
                {t.asignatura_id && <span className="text-tinta-suave"> · {nombreAsignatura(t.asignatura_id)}</span>}
              </span>
              <button
                type="button"
                onClick={() => borrar(t)}
                aria-label={`Quitar ${t.titulo}`}
                title="Quitar (p. ej. cuando ya la hayas entregado)"
                className="shrink-0 px-1.5 text-tinta-suave transition-colors hover:text-coral"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
