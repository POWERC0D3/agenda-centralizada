import { useEffect, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { hayTutorial, terminarTutorial } from '../../lib/bienvenida'
import { EASE_SALIDA } from '../../lib/movimiento'
import { sonar } from '../../lib/sonido'

/* Tutorial del panel, solo la primera vez (tras la configuración guiada de Ajustes).
   Un recuadro arena rodea la celda de la que se habla y el resto de la pantalla se oscurece:
   es una sola caja con una sombra GIGANTE hacia fuera (box-shadow 0 0 0 9999px) que lo cubre
   todo menos su interior. Un clic en cualquier sitio, → o Enter avanzan; Esc lo cierra. */

type Paso = { marca: string; titulo: string; texto: string; textoMovil?: string }

// `marca` = el data-tutorial de cada celda (Panel `tutorial`, y la cabecera).
// Orden: de lo más importante (qué hago hoy) a lo que se usa menos (el menú, que lleva a Ajustes)
const PASOS: Paso[] = [
  {
    marca: 'agenda',
    titulo: 'Tu plan del día',
    texto:
      'Lo que toca estudiar y entregar, ordenado por prioridad. Márcalo al terminarlo. Si viene del aula virtual, pulsa su nombre y se abre allí.',
  },
  {
    marca: 'horario',
    titulo: 'Horario',
    texto:
      'Tu semana. La lupa elige el día que ves en la Agenda: muévela con la rueda, las flechas o pulsando un día. Pulsa una asignatura para ver solo lo suyo.',
    textoMovil:
      'Tu semana: elige el día en las pestañas. Toca una asignatura y la Agenda y el Calendario se quedan solo con lo suyo.',
  },
  {
    marca: 'calendario',
    titulo: 'Calendario',
    texto:
      'Exámenes y entregas, cada uno en su pestaña, con las atrasadas arriba. Pulsa un día para saltar a su prueba. Debajo, el calendario del profesorado.',
  },
  {
    marca: 'cabecera',
    titulo: 'Cuenta atrás',
    texto: 'Arriba, cuánto falta para tu próxima prueba o entrega y para tu próxima clase.',
  },
  {
    marca: 'logo',
    titulo: 'El logo es el menú',
    texto:
      'Puerta derecha: Ajustes, donde conectas el aula virtual y Mis Aulas y apuntas lo de Teams. Central: tu cuenta. Izquierda: la web del instituto. ¿Dudas? Deja el ratón sobre el título de cualquier celda.',
    textoMovil:
      'Puerta derecha: Ajustes, donde conectas el aula virtual y Mis Aulas y apuntas lo de Teams. Central: tu cuenta. Izquierda: la web del instituto.',
  },
]

const MARGEN = 6 // px de aire entre la celda y el recuadro
const ANCHO_TARJETA = 320
const ESPACIO = 14 // separación entre el recuadro y la tarjeta

type Caja = { top: number; left: number; width: number; height: number; bottom: number }

/** Dónde poner la tarjeta: debajo si cabe, si no encima, y si tampoco, dentro (abajo de la celda). */
function posicionTarjeta(c: Caja) {
  const ancho = Math.min(ANCHO_TARJETA, innerWidth - 32)
  const left = Math.min(Math.max(16, c.left + c.width / 2 - ancho / 2), innerWidth - ancho - 16)
  if (innerHeight - c.bottom > 200) return { width: ancho, left, top: c.bottom + MARGEN + ESPACIO }
  if (c.top > 200) return { width: ancho, left, bottom: innerHeight - c.top + MARGEN + ESPACIO }
  return { width: ancho, left, bottom: Math.max(16, innerHeight - c.bottom + 16) }
}

export function Tutorial() {
  // La marca se lee al montarse el panel (justo al llegar desde Ajustes)
  const [activo, setActivo] = useState(hayTutorial)
  const [i, setI] = useState(0)
  const [caja, setCaja] = useState<Caja | null>(null)
  const reducido = useReducedMotion()
  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1

  const terminar = () => {
    terminarTutorial()
    setActivo(false)
  }
  const siguiente = () => {
    if (ultimo) {
      sonar('notification', { volumen: 0.5 })
      terminar()
    } else {
      sonar('swipe', { volumen: 0.4, tono: 1 + i * 0.04 }) // cada paso, un poco más agudo
      setI(i + 1)
    }
  }

  // Medir la celda del paso actual (y volver a medir si la ventana cambia o se hace scroll)
  useEffect(() => {
    if (!activo) return
    const el = document.querySelector<HTMLElement>(`[data-tutorial="${paso.marca}"]`)
    if (!el) return
    const medir = () => {
      const r = el.getBoundingClientRect()
      setCaja({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom })
    }
    // El primer paso espera a que se retire la cortina y entren las celdas; en el móvil, se baja hasta la celda
    const espera = window.setTimeout(
      () => {
        el.scrollIntoView({ block: 'center', behavior: 'auto' })
        medir()
      },
      i === 0 ? 1100 : 0,
    )
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      clearTimeout(espera)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [activo, i, paso.marca])

  // Teclado: → / Enter / espacio avanzan, Esc cierra
  useEffect(() => {
    if (!activo) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') terminar()
      else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        siguiente()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  })

  if (!activo || !caja) return null

  const movil = innerWidth < 768
  const transicion = reducido ? { duration: 0 } : { duration: 0.45, ease: EASE_SALIDA }
  // El recuadro nunca se sale de la pantalla (8 px de margen): así su borde siempre se ve,
  // también con celdas más altas que la pantalla del móvil o pegadas al borde
  const foco = {
    top: Math.max(8, caja.top - MARGEN),
    left: Math.max(8, caja.left - MARGEN),
    right: Math.min(innerWidth - 8, caja.left + caja.width + MARGEN),
    bottom: Math.min(innerHeight - 8, caja.bottom + MARGEN),
  }
  const sin = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation() // que el clic en un botón no cuente también como "clic en la pantalla"
    fn()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial del panel"
      className="fixed inset-0 z-[55] cursor-pointer"
      onClick={siguiente}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducido ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* El foco: la celda queda "recortada" y todo lo demás se oscurece con su sombra */}
      <motion.div
        className="pointer-events-none absolute border border-arena shadow-[0_0_0_9999px_rgb(0_0_0/0.72),0_0_40px_-6px_color-mix(in_oklab,var(--color-arena)_45%,transparent)]"
        initial={false}
        animate={{ top: foco.top, left: foco.left, width: foco.right - foco.left, height: foco.bottom - foco.top }}
        transition={transicion}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="absolute cursor-default border border-linea bg-fondo-alto p-4 shadow-2xl shadow-black/70"
          style={posicionTarjeta(caja)}
          initial={reducido ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducido ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE_SALIDA }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-mono text-[0.7rem] text-arena">
            {i + 1}/{PASOS.length}
          </p>
          <h2 className="mt-1 font-titulo text-lg leading-tight font-bold">{paso.titulo}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave" aria-live="polite">
            {movil && paso.textoMovil ? paso.textoMovil : paso.texto}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={sin(terminar)} className="text-xs text-tinta-suave transition-colors hover:text-tinta">
              Saltar
            </button>
            <button
              type="button"
              autoFocus
              onClick={sin(siguiente)}
              className="bg-arena px-4 py-1.5 text-sm font-semibold text-oscuro-fijo transition-colors hover:bg-tinta"
            >
              {ultimo ? 'Listo' : 'Siguiente →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
