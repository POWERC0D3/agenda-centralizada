import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useAhora } from './hooks/useAhora'
import { useAviso } from './hooks/useAviso'
import { useEntregasCuenta } from './hooks/useEntregasCuenta'
import { useGrupo } from './hooks/useGrupo'
import { useAjustesEnLaNube } from './hooks/useAjustesEnLaNube'
import { useHaySesion } from './hooks/useHaySesion'
import { borrarHechasLocales } from './hooks/useHechas'
import { useModulos } from './hooks/useModulos'
import { irA, useRuta, type Navegar, type Ruta } from './hooks/useRuta'
import { useSonido } from './hooks/useSonido'
import { pedirFormulario } from './lib/acceso'
import { nombreAsignatura } from './lib/datos'
import { eventosVisibles } from './lib/eventos'
import type { EventoConDias } from './types'
import { diaSemana, fechaDeLaSemana, inicioDelDia, isoLocal, lunesDe, mismoDia, parseFecha } from './lib/fechas'
import { datosDelGrupo, GRUPO_INICIAL, modulosDeGrupo, nombreGrupo } from './lib/grupos'
import { cascada } from './lib/movimiento'
import { fijarConfigSonido, sonar, viento } from './lib/sonido'
import { aplicarTema } from './lib/tema'
import { Aviso } from './components/ui/Aviso'
import { CortinaPixel, type FaseCortina } from './components/ui/CortinaPixel'
import { FondoPuntos } from './components/ui/FondoPuntos'
import { Tutorial } from './components/ui/Tutorial'
import { Cabecera } from './components/sections/Cabecera'
import { HorarioSemanal } from './components/sections/HorarioSemanal'
import { PanelLogo } from './components/sections/PanelLogo'
import { Calendario } from './components/sections/Calendario'
import { Agenda } from './components/sections/Agenda'

// Ajustes y la landing se descargan aparte (code splitting): el panel no espera por ellas, y GSAP,
// que solo usa la landing, sale del archivo principal. Como cargar una clase en Java solo al usarla
const cargarAjustes = () => import('./components/sections/Ajustes')
const cargarLanding = () => import('./components/landing/Landing')
const Ajustes = lazy(() => cargarAjustes().then((m) => ({ default: m.Ajustes })))
const Landing = lazy(() => cargarLanding().then((m) => ({ default: m.Landing })))
// La política de privacidad: se lee poco, así que ni siquiera se precarga
const Privacidad = lazy(() => import('./components/sections/Privacidad').then((m) => ({ default: m.Privacidad })))


function App() {
  const ahora = useAhora()
  const ruta = useRuta()
  const { excluidos, alternar, restablecer, establecer } = useModulos()
  const { aviso, avisar } = useAviso()
  const { grupo, setGrupo } = useGrupo()
  const sonido = useSonido()

  // Ajustes en la cuenta: lo mismo en todos los dispositivos (sin sesión, solo en este navegador).
  // La asignatura elegida con un clic en el horario NO va: es solo para este momento, a propósito
  const ajustesCuenta = useMemo(
    () => ({
      grupo: { ciclo: grupo.ciclo, curso: grupo.curso, letra: grupo.letra },
      modulos: [...excluidos].sort(),
      sonido: { activo: sonido.activo, volumen: sonido.volumen },
    }),
    [grupo, excluidos, sonido],
  )
  useAjustesEnLaNube(
    ajustesCuenta,
    (a) => {
      setGrupo(a.grupo)
      establecer(a.modulos)
      fijarConfigSonido(a.sonido)
    },
    () => {
      // Al cerrar sesión, valores por defecto: en un ordenador compartido, el siguiente no ve tu configuración
      setGrupo(GRUPO_INICIAL)
      establecer([])
      fijarConfigSonido({ activo: true, volumen: 0.4 })
      borrarHechasLocales()
    },
  )

  // Horario y exámenes del grupo elegido (null si aún no hay datos de ese grupo)
  const datos = useMemo(() => datosDelGrupo(grupo), [grupo])
  const horario = datos?.horario ?? null
  const nombre = nombreGrupo(grupo)

  // La asignatura en foco: con un clic en el horario pasa a ser la ÚNICA que se ve en la Agenda y el Calendario.
  // Un clic en otra la sustituye; otro clic en la misma, se vuelve a ver todo. Solo vive en memoria (estado de React)
  const [foco, setFoco] = useState<string | null>(null)
  // Valor derivado: si cambias de grupo o la apagas en Ajustes, el foco deja de valer solo (sin efectos ni limpiezas)
  const focoValido = foco && modulosDeGrupo(grupo).includes(foco) && !excluidos.has(foco) ? foco : null
  const elegirAsignatura = (id: string) => {
    if (excluidos.has(id)) {
      // Lo apagado en Ajustes no se elige desde aquí: solo se avisa
      sonar('disabled')
      avisar(`${nombreAsignatura(id)} está apagado en Ajustes: se vuelve a encender desde allí`)
      return
    }
    setFoco(focoValido === id ? null : id)
  }
  const reducido = useReducedMotion()

  // En cuanto el navegador está libre se descargan las otras páginas: al navegar ya están listas
  // y la cortina no destapa una pantalla vacía. import() guarda el módulo, así que no se baja dos veces
  useEffect(() => {
    const precargar = () => void Promise.all([cargarAjustes(), cargarLanding()])
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(precargar, { timeout: 4000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(precargar, 2000)
    return () => clearTimeout(id)
  }, [])

  // Cada página empieza arriba del todo (p. ej. al enviar el formulario, que está al final de la landing).
  // #/entrar y #/crear son la MISMA página (solo cambia la pestaña): cambiar de pestaña no debe subir el scroll
  const pagina = ruta === 'crear' ? 'entrar' : ruta
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pagina])

  // El panel es solo para quien ha iniciado sesión: sin sesión, al login.
  // location.replace (y no irA) sustituye la entrada del historial: "Atrás" no vuelve a un panel que te echa
  const haySesion = useHaySesion()
  const panelBloqueado = ruta === 'panel' && !haySesion
  useEffect(() => {
    if (panelBloqueado) window.location.replace('#/entrar')
  }, [panelBloqueado])

  // Cada página con su tema (lib/tema.ts): la landing clara, Ajustes en gris, el resto oscuro. useLayoutEffect
  // (y no useEffect): se aplica ANTES de que el navegador pinte, así nunca se ve un fotograma con los colores de otra página
  const tema = pagina === 'entrar' || panelBloqueado ? 'claro' : pagina === 'ajustes' ? 'gris' : 'oscuro'
  useLayoutEffect(() => aplicarTema(tema), [tema])

  const [cortina, setCortina] = useState<(FaseCortina & { destino: Ruta; mensaje?: string }) | null>(null)

  // Un único sitio donde se aplican los módulos apagados: lo que no cursas no llega a ningún panel
  // Las pruebas del grupo (JSON) + las entregas de la cuenta (Moodle…), todas juntas
  const entregasCuenta = useEntregasCuenta()
  const eventos = useMemo(() => [...(datos?.eventos ?? []), ...entregasCuenta], [datos, entregasCuenta])
  const lista = useMemo(() => eventosVisibles(eventos, ahora, excluidos), [eventos, ahora, excluidos])
  // Con una asignatura en foco, a la Agenda y al Calendario solo les llega lo suyo (la cabecera sigue siendo general)
  const soloFoco = (l: EventoConDias[]) => (focoValido ? l.filter((e) => e.asignatura === focoValido) : l)

  // La fecha bajo la lupa del horario, que es también el día que enseña la Agenda. Se guarda como
  // texto ISO ("2026-11-13"). null = "hoy" (en fin de semana, sin lupa hasta que se elija un día)
  const [elegida, setElegida] = useState<string | null>(null)
  const lupa = elegida ? parseFecha(elegida) : diaSemana(ahora) <= 5 ? inicioDelDia(ahora) : null
  const enHoy = !lupa || mismoDia(lupa, ahora)
  // La semana que enseña el horario: la de la lupa; sin lupa (fin de semana), la que viene
  const lunes = lunesDe(lupa ?? fechaDeLaSemana(ahora, 1))
  // Hoy: la hora real (la agenda sabe qué clases ya pasaron). Otro día: ese día a las 00:00
  const fechaAgenda = enHoy || !lupa ? ahora : lupa
  const listaAgenda = soloFoco(enHoy ? lista : eventosVisibles(eventos, fechaAgenda, excluidos))
  const elegirFecha = (f: Date | null) => {
    const destino = isoLocal(f ?? ahora)
    const actual = isoLocal(lupa ?? ahora)
    if (destino === actual) return
    // Roce: más agudo al avanzar, más grave al volver atrás (las fechas ISO se comparan como texto)
    sonar('swipe', { volumen: 0.3, tono: destino > actual ? 1.05 : 0.9 })
    setElegida(f ? destino : null)
  }

  // Cambio de página con la cortina de píxeles (sin animación si se pide movimiento reducido)
  // `mensaje` (opcional) se muestra al LLEGAR a la página nueva, no al salir: si no, la cortina lo taparía
  const navegar: Navegar = (destino, origen, mensaje) => {
    // A la landing desde dentro de la web: directo a la tarjeta de cuenta, sin repetir la historia
    if (destino === 'entrar' || destino === 'crear') pedirFormulario()
    if (reducido) {
      sonar('transition_up')
      irA(destino)
      if (mensaje) avisar(mensaje)
    } else {
      viento({ sube: true, x: origen.x }) // ráfaga mientras los píxeles "se tragan" la pantalla
      setCortina({ fase: 'cubrir', ...origen, destino, mensaje })
    }
  }
  const alCubrir = () => {
    if (!cortina) return
    irA(cortina.destino)
    sonar('transition_down', { volumen: 0.7 }) // la página nueva "aterriza"
    if (cortina.mensaje) avisar(cortina.mensaje)
    setCortina({ fase: 'descubrir', x: innerWidth / 2, y: innerHeight / 2, destino: cortina.destino })
  }

  return (
    // reducedMotion="user": Motion respeta prefers-reduced-motion en todas las animaciones
    <MotionConfig reducedMotion="user">
      <FondoPuntos />

      {/* Mientras llega una página diferida (solo al entrar directamente en ella) se ve el fondo de puntos */}
      <Suspense fallback={null}>
        {ruta === 'ajustes' ? (
          <Ajustes
            modulos={modulosDeGrupo(grupo)}
            grupo={grupo}
            onGrupo={setGrupo}
            excluidas={excluidos}
            onAlternar={alternar}
            onRestablecer={restablecer}
            onNavegar={navegar}
            avisar={avisar}
          />
        ) : ruta === 'privacidad' ? (
          <Privacidad />
        ) : ruta === 'entrar' || ruta === 'crear' ? (
          <Landing modo={ruta} onNavegar={navegar} />
        ) : panelBloqueado ? null : (
          // En escritorio (lg) el panel ocupa exactamente la pantalla; en móvil las celdas se apilan
          <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
            <Cabecera horario={horario} lista={lista} excluidas={excluidos} grupo={grupo} />
            <motion.main
              variants={cascada}
              initial="oculto"
              animate="visible"
              className="grid flex-1 grid-cols-1 gap-px p-px md:grid-cols-2 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)]"
            >
              {/* Columna derecha con filas propias: Agenda más alta que Ajustes, sin depender de la izquierda.
                  En móvil `contents` hace que el envoltorio "desaparezca" y sus hijos se apilen como los demás */}
              <div className="contents lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-px">
                <PanelLogo onNavegar={navegar} className="order-first md:col-span-2 lg:order-none" />
                {/* key: al cambiar de grupo la agenda se monta de nuevo y vuelve a "cargar" */}
                <Agenda
                  key={nombre}
                  ahora={ahora}
                  fecha={fechaAgenda}
                  horario={horario}
                  grupo={nombre}
                  lista={listaAgenda}
                  foco={focoValido}
                  excluidas={excluidos}
                  onHoy={() => elegirFecha(null)}
                  className="md:col-span-2"
                />
              </div>
              <HorarioSemanal
                ahora={ahora}
                horario={horario}
                grupo={nombre}
                excluidas={excluidos}
                foco={focoValido}
                onElegirAsignatura={elegirAsignatura}
                lunes={lunes}
                lupa={lupa}
                onElegir={elegirFecha}
                className="md:col-span-2 lg:col-span-8 lg:col-start-1 lg:row-start-1"
              />
              <Calendario
                ahora={ahora}
                lista={soloFoco(lista)}
                asignaturaEnFoco={focoValido}
                sinDatos={datos ? undefined : nombre}
                className="md:col-span-2 lg:col-span-8 lg:col-start-1 lg:row-start-2"
              />
            </motion.main>
            {/* Solo la primera vez, al llegar de la configuración guiada de Ajustes */}
            <Tutorial />
          </div>
        )}
      </Suspense>

      <CortinaPixel estado={cortina} onCubierta={alCubrir} onFin={() => setCortina(null)} />
      <Aviso aviso={aviso} />
    </MotionConfig>
  )
}

export default App
