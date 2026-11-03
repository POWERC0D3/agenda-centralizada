import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Navegar } from '../../hooks/useRuta'
import { borrarCuenta, cerrarSesion, repetirBienvenida, useSesion } from '../../hooks/useSesion'
import { useSonido } from '../../hooks/useSonido'
import { colorAsignatura, nombreAsignatura } from '../../lib/datos'
import { datosDelGrupo, nombreGrupo, SOLO_CONFIGURADOS, type Grupo } from '../../lib/grupos'
import type { Excluidas } from '../../lib/horario'
import { guardarPasoBienvenida, pasoBienvenida, pedirTutorial, terminarBienvenida } from '../../lib/bienvenida'
import { centroDe } from '../../lib/dom'
import { aparecer, cascada } from '../../lib/movimiento'
import { activarSonido, cambiarVolumen, sonar } from '../../lib/sonido'
import { LogoMarca } from '../ui/LogoMarca'
import { ConexionMoodle } from './ConexionMoodle'
import { ElegirGrupo } from './ElegirGrupo'
import { TareasManuales } from './TareasManuales'

type Props = {
  /** Los módulos del grupo elegido (vacío si aún no hay datos de ese grupo) */
  modulos: string[]
  grupo: Grupo
  onGrupo: (g: Grupo) => void
  excluidas: Excluidas
  onAlternar: (id: string) => void
  onRestablecer: () => void
  /** Ir a otra página con la cortina: volver al panel o iniciar sesión */
  onNavegar: Navegar
  avisar: (texto: string) => void
}

type PropsGrupo = {
  titulo: string
  descripcion: string
  children: ReactNode
  /** Configuración guiada: la sección aparece con un fade-in al montarse (en vez de en cascada con las demás) */
  guiada?: boolean
  /** Si se pasa, abajo aparece "Continuar" (la sección es la última visible de la configuración guiada) */
  onContinuar?: () => void
  /** Posición en la configuración guiada (data-paso: para bajar la vista hasta ella al aparecer) */
  paso: number
}

function Grupo({ titulo, descripcion, children, guiada = false, onContinuar, paso }: PropsGrupo) {
  return (
    <motion.section
      data-paso={paso}
      variants={aparecer}
      // Montada más tarde que sus hermanas: con initial/animate propios hace su fade-in al aparecer
      {...(guiada ? { initial: 'oculto', animate: 'visible' } : {})}
      className="scroll-mt-10 border-t border-linea pt-6"
    >
      <h2 className="font-titulo text-xl leading-none font-bold">{titulo}</h2>
      <p className="mt-1.5 mb-5 text-sm text-tinta-suave">{descripcion}</p>
      {children}
      {onContinuar && (
        <button
          type="button"
          onClick={() => {
            sonar('select', { volumen: 0.7 })
            onContinuar()
          }}
          className="mt-4 ml-auto block text-sm text-tinta-suave transition-colors hover:text-arena"
        >
          Continuar ↓
        </button>
      )}
    </motion.section>
  )
}

// Configuración guiada: orden de las secciones (el mismo en que se pintan). Tras la última aparece el botón "Ir al panel"
const PASOS = ['grupo', 'modulos', 'sonido', 'sincronizar', 'cuenta'] as const
const FIN = PASOS.length

/**
 * Cuántas columnas usar para que todas las filas tengan (casi) los mismos elementos.
 * Ej.: 10 con máximo 5 → 2 filas → 5 columnas; 7 con máximo 5 → 2 filas → 4 columnas (4 + 3).
 */
function columnasEquilibradas(n: number, max: number) {
  const filas = Math.ceil(n / max)
  return Math.ceil(n / filas)
}

/** Página aparte, minimalista: módulos que cursas y cuentas para sincronizar. */
export function Ajustes({ modulos, grupo, onGrupo, excluidas, onAlternar, onRestablecer, onNavegar, avisar }: Props) {
  const sonido = useSonido()
  const { usuario, nombre, bienvenidaPendiente, cargando } = useSesion()
  const [borrando, setBorrando] = useState<null | 'pregunta' | 'borrando'>(null)
  const [marcandoBienvenida, setMarcandoBienvenida] = useState(false)
  const [saliendo, setSaliendo] = useState(false) // cerrando sesión: el botón no se puede pulsar dos veces
  const reducido = useReducedMotion()

  // ── Configuración guiada (solo la primera vez, al venir del registro) ──
  // `paso` = la última sección visible. Sin configuración guiada, todo visible desde el principio (FIN)
  const [guiada] = useState(() => pasoBienvenida() !== null)
  const [paso, setPaso] = useState(() => Math.min(FIN, pasoBienvenida() ?? FIN))
  const ve = (p: (typeof PASOS)[number]) => PASOS.indexOf(p) <= paso
  // Tocar una opción de la sección actual (o pulsar "Continuar") enseña la siguiente. Nunca hace retroceder
  const avanzar = (p: (typeof PASOS)[number]) => setPaso((actual) => Math.max(actual, PASOS.indexOf(p) + 1))
  const continuar = (p: (typeof PASOS)[number]) => (guiada && PASOS.indexOf(p) === paso ? () => avanzar(p) : undefined)

  // Cada sección nueva baja la vista hasta ella; al terminar se borra la marca (no volverá a ser guiada)
  const pasoAnterior = useRef(paso)
  useEffect(() => {
    if (!guiada) return
    if (paso >= FIN) terminarBienvenida()
    else guardarPasoBienvenida(paso)
    if (paso > pasoAnterior.current)
      document.querySelector(`[data-paso="${paso}"]`)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' })
    pasoAnterior.current = paso
  }, [guiada, paso, reducido])

  return (
    // Guiada: alineado arriba (cada sección nueva solo hace crecer la página hacia abajo, sin recolocar lo de arriba)
    <main className={`grid min-h-svh px-4 py-16 ${guiada ? 'content-start justify-items-center' : 'place-items-center'}`}>
      <motion.div variants={cascada} initial="oculto" animate="visible" className="w-full max-w-xl space-y-10">
        <motion.header variants={aparecer} className="text-center">
          <LogoMarca className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 font-titulo text-5xl leading-none font-bold tracking-tight">Ajustes</h1>
          <p className="mt-3 text-sm text-tinta-suave">
            {guiada && paso < FIN ? 'Vamos a configurar tu panel, paso a paso.' : 'Configura el panel y conecta tus cuentas.'}
          </p>
        </motion.header>

        {ve('grupo') && (
          <Grupo
            paso={0}
            guiada={guiada}
            titulo="Tu grupo"
            descripcion="Ciclo, curso y grupo: de esto dependen el horario y el calendario de exámenes que ves."
            onContinuar={continuar('grupo')}
          >
            <ElegirGrupo
              grupo={grupo}
              onCambio={(g) => {
                onGrupo(g)
                avanzar('grupo')
                if (!datosDelGrupo(g)) avisar(`${SOLO_CONFIGURADOS}: ${nombreGrupo(g)} aún no tiene horario ni exámenes`)
              }}
            />
          </Grupo>
        )}

        {ve('modulos') && (
          <Grupo
            paso={1}
            guiada={guiada}
            onContinuar={continuar('modulos')}
            titulo="Tus módulos"
            descripcion={`${nombreGrupo(grupo)}. Los que no cursas se apagan para siempre en el horario, el calendario y la agenda.`}
          >
            {modulos.length === 0 && <p className="text-sm text-tinta-suave">Aún no hay módulos de este grupo.</p>}
            {/* Rejilla equilibrada: mismas columnas en cada fila (10 → 2×5 en escritorio, 5×2 en móvil) */}
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
              style={{ '--cols': columnasEquilibradas(modulos.length, 5) } as CSSProperties}
            >
              {modulos.map((id) => {
                const activa = !excluidas.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activa}
                    onClick={(e) => {
                      sonar(activa ? 'toggle_off' : 'toggle_on', { x: e.clientX })
                      onAlternar(id)
                      avanzar('modulos')
                    }}
                    title={nombreAsignatura(id)}
                    style={{ '--c': colorAsignatura(id) } as CSSProperties}
                    className={`flex min-w-0 items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                      activa
                        ? 'border-(--c)/50 bg-(--c)/10 text-tinta hover:bg-(--c)/20'
                        : 'border-dashed border-linea text-tinta-suave line-through hover:text-tinta'
                    }`}
                  >
                    <span className={`size-2 ${activa ? 'bg-(--c)' : 'bg-linea'}`} aria-hidden="true" />
                    <span className="font-mono text-xs">{id}</span>
                  </button>
                )
              })}
            </div>
            {excluidas.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  onRestablecer()
                  avanzar('modulos')
                }}
                className="mt-4 text-xs text-tinta-suave underline-offset-4 transition-colors hover:text-tinta hover:underline"
              >
                Activar todos
              </button>
            )}
          </Grupo>
        )}

        {ve('sonido') && (
          <Grupo
            paso={2}
            guiada={guiada}
            onContinuar={continuar('sonido')}
            titulo="Sonido"
            descripcion="Sonidos cortos que responden a lo que haces. Sin música de fondo."
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border border-linea bg-fondo-alto/60 px-5 py-4">
              <button
                type="button"
                role="switch"
                aria-checked={sonido.activo}
                onClick={(e) => {
                  const activo = !sonido.activo
                  activarSonido(activo)
                  if (activo) sonar('toggle_on', { x: e.clientX })
                  avanzar('sonido')
                }}
                className="flex items-center gap-3 text-sm"
              >
                {/* Interruptor: la bola se desplaza con translate */}
                <span
                  className={`relative h-5 w-9 border transition-colors ${sonido.activo ? 'border-arena bg-arena/20' : 'border-linea bg-fondo'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-3.5 transition-transform duration-200 ease-salida ${sonido.activo ? 'translate-x-4 bg-arena' : 'bg-tinta-suave'}`}
                  />
                </span>
                {sonido.activo ? 'Activado' : 'Silenciado'}
              </button>
              <label className={`flex flex-1 items-center gap-3 text-xs text-tinta-suave ${sonido.activo ? '' : 'opacity-40'}`}>
                Volumen
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sonido.volumen}
                  disabled={!sonido.activo}
                  onChange={(e) => {
                    cambiarVolumen(Number(e.target.value))
                    sonar('tap', { cada: 70 }) // se oye el volumen nuevo mientras mueves
                    avanzar('sonido')
                  }}
                  className="min-w-32 flex-1 accent-arena"
                />
                <span className="w-8 text-right font-mono text-tinta">{Math.round(sonido.volumen * 100)}%</span>
              </label>
            </div>
            <p className="mt-3 text-xs text-tinta-suave">
              <a href="#/privacidad" className="underline-offset-4 hover:text-tinta hover:underline">
                Privacidad
              </a>
              {' · '}
              Sonidos de interfaz:{' '}
              <a
                href="https://snd.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-tinta hover:underline"
              >
                SND
              </a>{' '}
              (Dentsu Lab Tokyo), de uso libre.
            </p>
          </Grupo>
        )}

        {ve('sincronizar') && (
          <Grupo
            paso={3}
            guiada={guiada}
            onContinuar={continuar('sincronizar')}
            titulo="Sincronizar"
            descripcion="Trae tus entregas de las plataformas del instituto a la agenda, sin copiarlas a mano."
          >
            <div className="space-y-2">
              <ConexionMoodle sitio="centro" modulos={modulos} haySesion={!!usuario} avisar={avisar} onUsar={() => avanzar('sincronizar')} />
              <ConexionMoodle sitio="misaulas" modulos={modulos} haySesion={!!usuario} avisar={avisar} onUsar={() => avanzar('sincronizar')} />
              <TareasManuales modulos={modulos} haySesion={!!usuario} avisar={avisar} onUsar={() => avanzar('sincronizar')} />
            </div>
          </Grupo>
        )}

        {ve('cuenta') && (
          <Grupo
            paso={4}
            guiada={guiada}
            titulo="Tu cuenta"
            descripcion="Con tu cuenta podrás añadir tus propias tareas y verlas en cualquier dispositivo."
            onContinuar={continuar('cuenta')}
          >
            <div className="flex min-h-14 flex-wrap items-center justify-between gap-4 border border-linea bg-fondo-alto/60 px-5 py-4">
              {cargando ? (
                <span className="text-sm text-tinta-suave">Comprobando…</span>
              ) : usuario ? (
                <>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{nombre || usuario.email}</span>
                    {nombre && <span className="block truncate text-xs text-tinta-suave">{usuario.email}</span>}
                  </span>
                  <button
                    type="button"
                    disabled={saliendo}
                    onClick={(e) => {
                      sonar('toggle_off')
                      setSaliendo(true)
                      // El centro se calcula YA: cuando acabe el await, el evento ya no tiene currentTarget
                      const origen = centroDe(e.currentTarget)
                      // Primero se cierra la sesión y después se va al login: si no, el login vería aún la sesión
                      // y enseñaría "Has iniciado sesión como…" en vez del formulario
                      void cerrarSesion().then(() => onNavegar('entrar', origen, 'Has cerrado sesión'))
                    }}
                    className="border border-linea px-3.5 py-1.5 text-sm transition-colors hover:border-coral hover:text-coral disabled:cursor-wait disabled:opacity-60"
                  >
                    {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-tinta-suave">Sin sesión: tus ajustes solo se guardan en este navegador.</span>
                  <button
                    type="button"
                    onClick={(e) => onNavegar('entrar', centroDe(e.currentTarget))}
                    className="border border-linea px-3.5 py-1.5 text-sm transition-colors hover:border-arena hover:text-arena"
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </div>
            {/* Derecho de supresión (RGPD): borrar la cuenta y todo lo suyo. Dos pasos para que no sea sin querer */}
            {usuario && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-xs">
                {borrando === 'pregunta' && <span className="text-coral">Se borrarán tu cuenta y todos tus datos. ¿Seguro?</span>}
                <button
                  type="button"
                  disabled={borrando === 'borrando'}
                  onClick={() => {
                    if (borrando !== 'pregunta') {
                      sonar('caution', { volumen: 0.5 })
                      setBorrando('pregunta')
                      return
                    }
                    setBorrando('borrando')
                    borrarCuenta()
                      .then(() => avisar('Tu cuenta y todos tus datos se han borrado'))
                      .catch((e: Error) => {
                        avisar(e.message)
                        setBorrando(null)
                      })
                  }}
                  className="text-tinta-suave underline-offset-4 transition-colors hover:text-coral hover:underline disabled:opacity-50"
                >
                  {borrando === 'pregunta' ? 'Sí, borrar mi cuenta' : borrando === 'borrando' ? 'Borrando…' : 'Borrar mi cuenta'}
                </button>
                {borrando === 'pregunta' && (
                  <button type="button" onClick={() => setBorrando(null)} className="text-tinta-suave hover:text-tinta">
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </Grupo>
        )}

        {/* El botón final, cuando ya está todo configurado */}
        {paso >= FIN && (
          <motion.div
            data-paso={FIN}
            variants={aparecer}
            {...(guiada ? { initial: 'oculto', animate: 'visible' } : {})}
            className="text-center"
          >
            <button
              type="button"
              onClick={(e) => {
                if (guiada) pedirTutorial() // acaba de configurarlo todo por primera vez: el panel le enseñará cómo funciona
                onNavegar('panel', centroDe(e.currentTarget))
              }}
              className="bg-tinta px-6 py-3 text-sm font-medium text-fondo transition-colors hover:bg-arena"
            >
              Ir al panel
            </button>
            {/* Repetir la bienvenida en el próximo inicio de sesión, sin perder nada (va en la cuenta: hace falta sesión) */}
            {usuario && (
              <p className="mt-5 text-xs text-tinta-suave">
                {bienvenidaPendiente && 'La próxima vez que inicies sesión verás otra vez la configuración guiada y el tutorial. '}
                <button
                  type="button"
                  disabled={marcandoBienvenida}
                  onClick={() => {
                    const si = !bienvenidaPendiente
                    sonar(si ? 'toggle_on' : 'toggle_off')
                    setMarcandoBienvenida(true)
                    repetirBienvenida(si)
                      .then(() =>
                        avisar(si ? 'Hecho: al volver a iniciar sesión repasarás la configuración, con tus datos tal cual' : 'Cancelado'),
                      )
                      .catch((e: Error) => avisar(e.message))
                      .finally(() => setMarcandoBienvenida(false))
                  }}
                  className="text-tinta-suave underline underline-offset-4 transition-colors hover:text-tinta disabled:opacity-50"
                >
                  {bienvenidaPendiente ? 'Cancelar' : 'Repetir la configuración y el tutorial en el próximo inicio de sesión'}
                </button>
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </main>
  )
}
