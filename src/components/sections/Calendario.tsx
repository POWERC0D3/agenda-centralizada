import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAnimacionesSimples } from '../../hooks/useAnimacionesSimples'
import type { EventoConDias, TipoEvento } from '../../types'
import { URL_CALENDARIO_COMPARTIDO } from '../../lib/config'
import { colorAsignatura, nombreAsignatura } from '../../lib/datos'
import { agruparPorSemana, proximoEvento, urlDe } from '../../lib/eventos'
import { diasEntre, formatoCorto, formatoDiaSemana, formatoMes, isoLocal, mismoDia } from '../../lib/fechas'
import { EASE_SALIDA } from '../../lib/movimiento'
import { sonar } from '../../lib/sonido'
import { CuentaAtras } from '../ui/CuentaAtras'
import { EnlaceExterno } from '../ui/EnlaceExterno'
import { Panel } from '../ui/Panel'
import { Fuente } from './Agenda'
import { esAtrasada } from '../../lib/tareas'
import { abrirTarea } from '../../lib/abrir'
import { SinDatos } from '../ui/SinDatos'

type Pestana = 'examenes' | 'entregas'

const PESTANAS: { valor: Pestana; texto: string }[] = [
  { valor: 'examenes', texto: 'Exámenes' },
  { valor: 'entregas', texto: 'Entregas' },
]

// La sesión de evaluación no es una entrega: va con los exámenes (todo lo del calendario del grupo)
const dePestana = (p: Pestana) => (e: EventoConDias) => (p === 'entregas' ? e.tipo === 'entrega' : e.tipo !== 'entrega')

const TIPO: Record<TipoEvento, string> = { examen: 'Examen', entrega: 'Entrega', evaluacion: 'Evaluación' }

const conColor = (id: string | null) => ({ '--c': colorAsignatura(id) }) as CSSProperties

/** Qué pinta y qué hace cada casilla del mes. */
type Celda = { contenido?: ReactNode; alPulsar?: () => void; resaltada?: boolean }

/** Cuadrícula de un mes. El contenido de cada casilla llega desde fuera (`celda`). */
function Mes({
  ahora,
  anio,
  mes,
  celda,
  onHover,
}: {
  ahora: Date
  anio: number
  mes: number
  celda: (dia: Date) => Celda
  onHover?: (fecha: string | null) => void
}) {
  const diasMes = new Date(anio, mes + 1, 0).getDate()
  const hueco = (new Date(anio, mes, 1).getDay() + 6) % 7 // lunes = 0
  const dias = Array.from({ length: diasMes }, (_, i) => new Date(anio, mes, i + 1))

  return (
    <div className="grid h-full min-h-[18rem] grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1 lg:min-h-0">
      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
        <span key={d} className="pb-1 text-center text-[0.7rem] text-tinta-suave">
          {d}
        </span>
      ))}
      {hueco > 0 && <span style={{ gridColumn: `span ${hueco}` }} />}
      {dias.map((dia) => {
        const fecha = isoLocal(dia)
        const c = celda(dia)
        const hoy = mismoDia(dia, ahora)
        const finde = dia.getDay() === 0 || dia.getDay() === 6
        return (
          <div
            key={fecha}
            onClick={c.alPulsar}
            onMouseEnter={() => onHover?.(fecha)}
            onMouseLeave={() => onHover?.(null)}
            className={`flex min-h-0 flex-col gap-0.5 overflow-hidden border p-1 transition-colors ${
              hoy ? 'border-arena' : c.resaltada ? 'border-tinta/40 bg-fondo-alto' : 'border-linea/60'
            } ${diasEntre(ahora, dia) < 0 ? 'opacity-40' : ''} ${c.alPulsar ? 'cursor-pointer hover:border-tinta/40' : ''}`}
          >
            <span
              className={`font-mono text-[0.7rem] leading-none ${hoy ? 'text-arena' : finde ? 'text-tinta-suave/60' : 'opacity-80'}`}
            >
              {dia.getDate()}
            </span>
            {c.contenido}
          </div>
        )
      })}
    </div>
  )
}

/** Fila de una prueba: color de la asignatura · fecha · qué es · cuánto falta (y, si es una entrega, su enlace). */
function FilaPrueba({
  e,
  foco,
  resaltada,
  marcada,
  registrar,
  onHover,
}: {
  e: EventoConDias
  foco: boolean
  resaltada: boolean
  marcada: boolean
  registrar: (el: HTMLElement | null) => void
  onHover: (f: string | null) => void
}) {
  // Solo las entregas se abren en otra web (donde se entregan). Un examen no tiene adónde ir: sin enlace
  const conEnlace = e.tipo === 'entrega'
  return (
    <li
      ref={registrar}
      onMouseEnter={() => onHover(e.fecha)}
      onMouseLeave={() => onHover(null)}
      style={conColor(e.asignatura)}
      className={`group/fila relative grid ${conEnlace ? 'grid-cols-[2.5rem_minmax(0,1fr)_auto_auto]' : 'grid-cols-[2.5rem_minmax(0,1fr)_auto]'} items-center gap-3 border-b border-linea/60 py-2.5 pr-1 pl-3 transition-colors duration-500 ${
        marcada ? 'bg-arena/15' : resaltada || foco ? 'bg-fondo-alto' : ''
      }`}
    >
      <span className="absolute inset-y-1.5 left-0 w-1 bg-(--c)" aria-hidden="true" />
      <span className="text-center leading-none">
        <span className="block text-[0.65rem] text-tinta-suave capitalize">{formatoDiaSemana(e.dia)}</span>
        <span className="mt-0.5 block font-mono text-base font-medium">{e.dia.getDate()}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {e.asignatura ? nombreAsignatura(e.asignatura) : (e.detalle ?? 'Evaluación')}
        </span>
        <span className="block truncate text-xs text-tinta-suave">
          <span className="text-(--c)">{TIPO[e.tipo]}</span>
          {e.detalle && ` · ${e.detalle}`}
          {e.fuente && <Fuente nombre={e.fuente} />}
          {foco && <span className="text-arena"> · la próxima</span>}
        </span>
      </span>
      <CuentaAtras dias={e.dias} atrasada={esAtrasada(e)} />
      {conEnlace && (
        <EnlaceExterno
          href={urlDe(e)}
          etiqueta={`Abrir la entrega de ${nombreAsignatura(e.asignatura)}`}
          alPasar
          // Entregas de la cuenta: igual que en la Agenda (Aula virtual: con inicio de sesión automático)
          onAbrir={e.url && e.id.startsWith('cuenta-') ? () => abrirTarea(e.url!, e.id.slice(7)) : undefined}
        />
      )}
    </li>
  )
}

/** Botones con subrayado que se desliza entre opciones (layoutId de Motion). */
function Selector<T extends string>({
  id,
  opciones,
  valor,
  onCambio,
}: {
  id: string
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambio: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambio(o.valor)}
          aria-pressed={valor === o.valor}
          className="relative px-2 py-1 text-xs text-tinta-suave transition-colors hover:text-tinta aria-pressed:text-tinta"
        >
          {o.texto}
          {valor === o.valor && (
            <motion.span
              layoutId={id}
              className="absolute inset-x-2 -bottom-px h-0.5 bg-arena"
              transition={{ duration: 0.35, ease: EASE_SALIDA }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

type Props = {
  ahora: Date
  lista: EventoConDias[]
  /** La asignatura elegida en el horario (la lista ya llega filtrada): solo para los mensajes */
  asignaturaEnFoco?: string | null
  /** Nombre del grupo si aún no tiene exámenes cargados (las entregas sí se muestran: vienen de la cuenta) */
  sinDatos?: string
  className?: string
}

export function Calendario({ ahora, lista, asignaturaEnFoco, sinDatos, className = '' }: Props) {
  const reducido = useAnimacionesSimples()
  const [pestana, setPestana] = useState<Pestana>('examenes')
  // Día "compartido" entre la cuadrícula y la lista: al pasar el ratón por uno se ilumina el otro
  const [diaResaltado, setDiaResaltado] = useState<string | null>(null)
  // Fila (id) o día (fecha) al que acabamos de saltar: se ilumina un momento
  const [marcada, setMarcada] = useState<string | null>(null)
  const temporizador = useRef(0)
  // Mes elegido con las flechas (año·12 + mes). null = automático: el de lo próximo de la pestaña.
  // Así, si las entregas llegan de la cuenta un momento después, el mes se coloca solo
  const [vista, setVista] = useState<number | null>(null)

  // Sin registro del pasado: solo lo que queda por llegar
  const pruebas = lista.filter((e) => e.dias >= 0 && dePestana(pestana)(e))
  const semanas = agruparPorSemana(pruebas)
  // Entregas de las webs que vencieron sin entregar: van aparte, arriba
  const atrasadas = pestana === 'entregas' ? lista.filter(esAtrasada) : []
  const foco = proximoEvento(pruebas)
  const sinExamenes = pestana === 'examenes' ? sinDatos : undefined

  // Elementos de la lista por id, para poder desplazarse hasta ellos (como un Map<String, Node>)
  const filas = useRef(new Map<string, HTMLElement>())
  const registrar = (id: string) => (el: HTMLElement | null) => {
    if (el) filas.current.set(id, el)
    else filas.current.delete(id)
  }

  /** Desplaza la lista hasta la fila `id` y la ilumina (`marca` puede ser el id o la fecha entera). */
  const irA = (id: string | undefined, marca = id) => {
    const el = id && filas.current.get(id)
    if (!el) return
    sonar('select', { volumen: 0.8 }) // "ahí está"
    el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' })
    setMarcada(marca ?? null)
    clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setMarcada(null), 1400)
  }

  // Hasta dónde se puede navegar: los meses con información y uno más a cada lado (siempre con el actual).
  // Los meses se cuentan como un número (año·12 + mes) para poder compararlos y sumarles sin líos
  const n = (d: Date) => d.getFullYear() * 12 + d.getMonth()
  const conInfo = pruebas.map((e) => n(e.dia))
  const minimo = Math.min(n(ahora), ...conInfo) - 1
  const maximo = Math.max(n(ahora), ...conInfo) + 1
  // El mes visible se ajusta al rango (valor derivado: si cambias de pestaña y se sale, se corrige solo)
  const visible = Math.min(maximo, Math.max(minimo, vista ?? n(foco?.dia ?? ahora)))
  const mesVisible = { anio: Math.floor(visible / 12), mes: visible % 12 }

  const moverMes = (delta: number) => {
    sonar('tap', { tono: delta > 0 ? 1.12 : 0.9 }) // más agudo hacia delante, más grave hacia atrás
    setVista(Math.min(maximo, Math.max(minimo, visible + delta)))
  }

  const cambiarPestana = (p: Pestana) => {
    sonar('swipe', { tono: p === 'entregas' ? 1.08 : 0.94 }) // desliza hacia un lado u otro
    setPestana(p)
    setVista(null) // cada pestaña abre en el mes de lo próximo suyo
  }

  // ── Casillas: un cuadradito por prueba, cada uno es un botón ──
  const celdaPruebas = (dia: Date): Celda => {
    const fecha = isoLocal(dia)
    const evs = pruebas.filter((e) => e.fecha === fecha)
    if (!evs.length) return {}
    const boton = (e: EventoConDias, contenido: ReactNode, clase: string) => (
      <button
        key={e.id}
        type="button"
        style={conColor(e.asignatura)}
        title={`${e.asignatura ? nombreAsignatura(e.asignatura) : 'Evaluación'} · ${TIPO[e.tipo]}`}
        onClick={(ev) => {
          ev.stopPropagation() // que no salte también el clic del día
          irA(e.id)
        }}
        className={`transition-transform hover:scale-110 ${clase}`}
      >
        {contenido}
      </button>
    )
    return {
      resaltada: diaResaltado === fecha,
      alPulsar: () => irA(evs[0].id, fecha),
      // Un cuadradito del color de la asignatura por prueba (el nombre está en el tooltip y en la lista)
      contenido: <span className="flex flex-wrap gap-0.5">{evs.map((e) => boton(e, null, 'size-2.5 bg-(--c)'))}</span>,
    }
  }

  // Al cambiar de pestaña, el contenido se desliza hacia el lado que toca
  const lado = pestana === 'entregas' ? 1 : -1

  return (
    <Panel
      tutorial="calendario"
      titulo="Calendario"
      ayuda="Tus exámenes y tus entregas, cada uno en su pestaña. Pulsa un día o una prueba para saltar a ella en la lista. Debajo del mes, el calendario compartido del profesorado."
      extra={<Selector id="pestana-calendario" opciones={PESTANAS} valor={pestana} onCambio={cambiarPestana} />}
      className={`tinte-verde ${className}`}
      cuerpo="overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false} custom={lado}>
        <motion.div
          key={pestana}
          custom={lado}
          variants={{ fuera: (l: number) => ({ opacity: 0, x: 24 * l }), dentro: { opacity: 1, x: 0 } }}
          initial="fuera"
          animate="dentro"
          exit={{ opacity: 0, x: -24 * lado }}
          transition={{ duration: 0.3, ease: EASE_SALIDA }}
          className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          {/* Mes */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                disabled={visible <= minimo}
                className="px-2 py-0.5 text-tinta-suave transition-colors hover:text-tinta disabled:pointer-events-none disabled:opacity-20"
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <p className="font-titulo text-base font-semibold first-letter:uppercase">
                {formatoMes(new Date(mesVisible.anio, mesVisible.mes, 1))}
              </p>
              <button
                type="button"
                onClick={() => moverMes(1)}
                disabled={visible >= maximo}
                className="px-2 py-0.5 text-tinta-suave transition-colors hover:text-tinta disabled:pointer-events-none disabled:opacity-20"
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Mes
                ahora={ahora}
                anio={mesVisible.anio}
                mes={mesVisible.mes}
                celda={celdaPruebas}
                onHover={(f) => {
                  // Tic muy suave solo al pasar por días con pruebas
                  if (f && pruebas.some((e) => e.fecha === f)) sonar('type', { volumen: 0.35, cada: 50 })
                  setDiaResaltado(f)
                }}
              />
            </div>
            {/* Enlace a un calendario externo: lo gestionan los profesores fuera de esta web, con sus propios permisos */}
            <a
              href={URL_CALENDARIO_COMPARTIDO}
              target="_blank"
              rel="noopener noreferrer"
              title="Lo gestionan los profesores, fuera de esta web"
              onClick={(e) => sonar('button', { x: e.clientX })}
              className="mt-2 flex shrink-0 items-center justify-between gap-3 border border-linea/60 px-3 py-2 text-xs text-tinta-suave transition-colors hover:border-arena/60 hover:text-arena"
            >
              <span>
                Calendario compartido del profesorado
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* Lista */}
          <div className="flex min-h-0 flex-col">
            {/* En móvil y tablet la celda no tiene alto fijo: sin tope, la lista alargaría la página sin fin.
                Con max-h se ven unas 5 pruebas y el resto con scroll propio (así pulsar un día del mes sigue saltando
                a su prueba). En escritorio el alto lo pone la rejilla */}
            <div className="max-h-[23rem] min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
              {sinExamenes ? (
                <SinDatos que="calendario de exámenes" grupo={sinExamenes} />
              ) : (
                <>
                  {atrasadas.length > 0 && (
                    <section className="mb-3">
                      <h3 className="sticky top-0 z-10 bg-fondo py-1 text-[0.7rem] font-medium text-coral">Atrasadas, sin entregar</h3>
                      <ul>
                        {atrasadas.map((e) => (
                          <FilaPrueba
                            key={e.id}
                            e={e}
                            foco={false}
                            resaltada={diaResaltado === e.fecha}
                            marcada={marcada === e.id}
                            registrar={registrar(e.id)}
                            onHover={setDiaResaltado}
                          />
                        ))}
                      </ul>
                    </section>
                  )}
                  {semanas.length === 0 && atrasadas.length === 0 && (
                    <p className="py-6 text-sm text-tinta-suave">
                      {asignaturaEnFoco
                        ? `No quedan ${pestana === 'entregas' ? 'entregas' : 'exámenes'} de ${nombreAsignatura(asignaturaEnFoco)}.`
                        : pestana === 'entregas'
                          ? 'No tienes entregas pendientes. Conecta tus plataformas o añade las de Teams en Ajustes → Sincronizar.'
                          : 'No quedan exámenes.'}
                    </p>
                  )}
                  {semanas.map((s) => (
                    <section key={s.lunes.getTime()} className="mb-3 last:mb-0">
                      <h3 className="sticky top-0 z-10 bg-fondo py-1 text-[0.7rem] text-tinta-suave">
                        Semana del {formatoCorto(s.lunes)}
                      </h3>
                      <ul>
                        {s.eventos.map((e) => (
                          <FilaPrueba
                            key={e.id}
                            e={e}
                            foco={e.id === foco?.id}
                            resaltada={diaResaltado === e.fecha}
                            marcada={marcada === e.id || marcada === e.fecha}
                            registrar={registrar(e.id)}
                            onHover={setDiaResaltado}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Panel>
  )
}
