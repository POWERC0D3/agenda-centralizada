import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useHaySesion } from '../../hooks/useHaySesion'
import { irA } from '../../hooks/useRuta'
import { aparecer, cascada } from '../../lib/movimiento'
import { sonar } from '../../lib/sonido'
import { irAlFormulario } from './formulario'

/* Lo que hay dentro de la web, después de la escena de la portada: una pieza por celda del panel.
   Cada una lleva una miniatura hecha solo con cajas (sin capturas: no pesan y siguen el tema de color).
   Entran en cascada al aparecer en pantalla (whileInView de Motion), una sola vez. */

/** El color de una asignatura, como fondo (las mismas variables que usa el panel). */
const de = (id: string) => ({ background: `var(--color-asig-${id})` })

// Ancho fijo para las miniaturas con medidas en %: dentro de un flex, sin él se encogerían a 0
const MINI = 'w-44'

function MiniAgenda() {
  const filas = [
    { id: 'prog', hecha: true, ancho: 'w-3/4' },
    { id: 'badat', hecha: false, ancho: 'w-2/3' },
    { id: 'lmsgi', hecha: false, ancho: 'w-1/2' },
  ]
  return (
    <div className={`${MINI} space-y-2`}>
      {filas.map((f) => (
        <div key={f.id} className="flex items-center gap-2">
          <span className={`size-2.5 shrink-0 border ${f.hecha ? 'border-verde bg-verde' : 'border-tinta/30'}`} />
          <span className="h-2.5 w-0.5 shrink-0" style={de(f.id)} />
          <span className={`h-1.5 ${f.ancho} ${f.hecha ? 'bg-tinta/10' : 'bg-tinta/25'}`} />
        </div>
      ))}
    </div>
  )
}

// Una semana inventada: 5 días × 4 horas (null = hora libre). La columna del miércoles lleva la "lupa"
const SEMANA = ['prog', 'badat', 'sisin', 'lmsgi', 'prog', 'prog', 'endes', 'sisin', 'badat', 'ip', 'lmsgi', null, 'badat', 'endes', 'ip', 'ipei', 'lmsgi', 'prog', null, 'sisin']

function MiniHorario() {
  return (
    <div className={`${MINI} relative grid grid-cols-5 gap-0.5`}>
      {SEMANA.map((id, i) => (
        <span key={i} className={`h-3 ${id ? '' : 'bg-tinta/5'}`} style={id ? de(id) : undefined} />
      ))}
      <span className="absolute -inset-y-1 left-[40%] w-[20%] border border-verde" />
    </div>
  )
}

function MiniCalendario() {
  const marcas: Record<number, string> = { 4: 'prog', 9: 'badat', 15: 'lmsgi', 22: 'sisin', 23: 'prog' }
  return (
    <div className={`${MINI} grid grid-cols-7 gap-0.5`}>
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className={`grid h-3 place-items-center border ${i === 8 ? 'border-verde' : 'border-tinta/10'}`}>
          {marcas[i] && <span className="size-1.5" style={de(marcas[i])} />}
        </span>
      ))}
    </div>
  )
}

function MiniSincronizar() {
  return (
    <div className="flex items-center gap-2 font-mono text-[0.6rem]">
      <span className="space-y-1">
        {['Aula virtual', 'Mis Aulas', 'Teams'].map((p) => (
          <span key={p} className="block border border-tinta/15 px-1.5 py-0.5 text-tinta-suave">
            {p}
          </span>
        ))}
      </span>
      <span className="text-verde">→</span>
      <span className="border border-verde px-1.5 py-0.5 text-tinta">Tu agenda</span>
    </div>
  )
}

function MiniCuentaAtras() {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[0.65rem] text-tinta-suave">
        Próximo examen
        <span className="size-1.5" style={de('badat')} />
        <span className="text-tinta">Bases de Datos</span>
      </span>
      <span className="mt-1 block font-mono text-lg leading-none text-tinta tabular-nums">2d 04:12:09</span>
    </div>
  )
}

function MiniDispositivos() {
  const barras = (
    <span className="space-y-0.5">
      {['prog', 'badat', 'lmsgi'].map((id) => (
        <span key={id} className="block h-1 w-full" style={de(id)} />
      ))}
    </span>
  )
  return (
    <div className="flex items-end gap-3">
      <span className="flex h-12 w-7 flex-col justify-center border border-tinta/30 px-1">{barras}</span>
      <span className="pb-4 text-xs text-verde">⇄</span>
      <span className="flex h-12 w-20 flex-col justify-center border border-tinta/30 px-2">{barras}</span>
    </div>
  )
}

type Funcion = { celda: string; titulo: string; texto: string; muestra: ReactNode }

const FUNCIONES: Funcion[] = [
  {
    celda: 'Agenda',
    titulo: 'El plan de cada día',
    texto:
      'Lo que toca estudiar y entregar, ordenado por prioridad según tus exámenes y entregas. Lo marcas al terminarlo y, si viene del aula virtual, se abre con un clic.',
    muestra: <MiniAgenda />,
  },
  {
    celda: 'Horario',
    titulo: 'Tu semana de un vistazo',
    texto: 'Cada asignatura con su color. Pulsa una y la Agenda y el Calendario se quedan solo con lo suyo.',
    muestra: <MiniHorario />,
  },
  {
    celda: 'Calendario',
    titulo: 'Exámenes y entregas',
    texto: 'Cada cosa en su pestaña, con las entregas atrasadas arriba. Y el calendario compartido del profesorado, a un clic.',
    muestra: <MiniCalendario />,
  },
  {
    celda: 'Ajustes · Sincronizar',
    titulo: 'Las entregas llegan solas',
    texto:
      'Conecta el Moodle del instituto y tus entregas se actualizan cada media hora; Mis Aulas, cuando pulsas «Sincronizar». Las de Teams las apuntas tú: Educastur no deja conectarlo.',
    muestra: <MiniSincronizar />,
  },
  {
    celda: 'Cabecera',
    titulo: 'Cuánto falta, siempre a la vista',
    texto: 'Arriba del todo, lo que queda para tu próxima prueba y para tu próxima clase, al segundo.',
    muestra: <MiniCuentaAtras />,
  },
  {
    celda: 'Tu cuenta',
    titulo: 'La misma en todas partes',
    texto:
      'Tu grupo, tus módulos y lo que ya has hecho se guardan en tu cuenta: lo mismo en el móvil que en el ordenador. Y la borras cuando quieras, con todo lo suyo.',
    muestra: <MiniDispositivos />,
  },
]

const EMPEZAR = [
  { titulo: 'Crea tu cuenta', texto: 'Con tu correo y una contraseña.' },
  { titulo: 'Elige tu grupo', texto: 'Ciclo, curso y grupo. Y apaga los módulos que tengas convalidados.' },
  { titulo: 'Conecta tus plataformas', texto: 'El Moodle del instituto y Mis Aulas, si quieres. Un tutorial corto te enseña el resto.' },
]

/** Al aparecer en pantalla, sus hijos entran en cascada. `once`: solo la primera vez que se ve */
const enCascada = { variants: cascada, initial: 'oculto', whileInView: 'visible', viewport: { once: true, amount: 0.15 } } as const

export function Funciones() {
  const haySesion = useHaySesion()

  return (
    <div className="relative px-4 pt-16 pb-24 sm:pt-24">
      <section aria-labelledby="que-hay" className="mx-auto max-w-5xl">
        <motion.div {...enCascada}>
          <motion.p variants={aparecer} className="font-mono text-xs tracking-widest text-verde uppercase">
            Qué hay dentro
          </motion.p>
          <motion.h2
            variants={aparecer}
            id="que-hay"
            className="mt-3 max-w-2xl font-titulo text-[clamp(1.9rem,4.5vw,3.2rem)] leading-[1.02] font-bold tracking-tight text-balance"
          >
            Un panel que te dice qué toca hoy.
          </motion.h2>
          <motion.p variants={aparecer} className="mt-4 max-w-xl leading-relaxed text-pretty text-tinta-suave">
            Seis piezas que trabajan juntas. En el ordenador caben en una sola pantalla; en el móvil, una debajo de otra.
          </motion.p>
        </motion.div>

        {/* gap-px sobre fondo de línea: las celdas comparten la misma raya de 1 px, como en el panel */}
        <motion.ul {...enCascada} className="mt-12 grid gap-px border border-linea bg-linea sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map((f) => (
            <motion.li key={f.titulo} variants={aparecer} className="flex flex-col bg-fondo-alto p-6">
              <div className="flex h-16 items-center">{f.muestra}</div>
              <p className="mt-6 font-mono text-[0.65rem] tracking-widest text-tinta-suave uppercase">{f.celda}</p>
              <h3 className="mt-1.5 font-titulo text-lg leading-tight font-bold">{f.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{f.texto}</p>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section aria-labelledby="empezar" className="mx-auto mt-24 max-w-5xl border-t border-linea pt-12">
        <motion.div {...enCascada} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <motion.h2 variants={aparecer} id="empezar" className="font-titulo text-2xl leading-tight font-bold tracking-tight">
              Empieza en un minuto
            </motion.h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {EMPEZAR.map((p, i) => (
                <motion.li key={p.titulo} variants={aparecer}>
                  <span className="font-mono text-xs text-verde">0{i + 1}</span>
                  <h3 className="mt-1 font-medium">{p.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-tinta-suave">{p.texto}</p>
                </motion.li>
              ))}
            </ol>
          </div>
          <motion.button
            variants={aparecer}
            type="button"
            onClick={() => {
              sonar('button')
              if (!haySesion) irA('crear') // la pestaña de registro (misma página: no se sube el scroll)
              irAlFormulario()
            }}
            className="justify-self-start bg-verde px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-tinta"
          >
            {haySesion ? 'Ir a mi cuenta' : 'Crear mi cuenta'}
          </motion.button>
        </motion.div>
      </section>
    </div>
  )
}
