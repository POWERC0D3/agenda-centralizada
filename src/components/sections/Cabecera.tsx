import type { CSSProperties } from 'react'
import type { EventoConDias, Horario } from '../../types'
import { useAhora } from '../../hooks/useAhora'
import { colorAsignatura, nombreAsignatura } from '../../lib/datos'
import { proximaClase } from '../../lib/escolar'
import { diaSemana, formatoLargo, horaAMinutos } from '../../lib/fechas'
import { nombreGrupo, type Grupo } from '../../lib/grupos'
import { clasesDelDia, type Excluidas } from '../../lib/horario'
import { Odometro } from '../ui/Odometro'

const dos = (n: number) => String(n).padStart(2, '0')

/** Cuenta atrás siempre en horas (aunque falte una semana) y minutos: "63 h 07 min". Sin segundos: distraían. */
function textoFalta(desde: Date, hasta: Date): string {
  // Redondeo hacia arriba: con 30 s de margen dice "1 min", nunca "0 min"
  const total = Math.max(0, Math.ceil((hasta.getTime() - desde.getTime()) / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h} h ${dos(m)} min` : `${m} min`
}

/**
 * Los exámenes solo tienen fecha. Para la cuenta atrás se toma la hora de la
 * primera clase de esa asignatura ese día (o, si no hay, el inicio de la jornada).
 */
function inicioDePrueba(e: EventoConDias, horario: Horario | null): Date {
  const clases = horario ? clasesDelDia(horario, diaSemana(e.dia)) : []
  const hora = clases.find((c) => c.asignatura === e.asignatura)?.inicio ?? clases[0]?.inicio ?? '08:15'
  const d = new Date(e.dia)
  d.setMinutes(horaAMinutos(hora))
  return d
}

/** Lo que necesita una cuenta atrás, sin decir cómo se pinta: lo usan la versión de escritorio y la de móvil. */
type DatosCuenta = {
  etiqueta: string
  asignatura: string | null
  nombre: string
  hasta: Date
  titulo: string
}

/**
 * "Próxima clase Programación · en 63 h 07 min": el nombre en el color de su asignatura.
 * Con `horaPrimero` (lado izquierdo) la hora va delante, pegada a la esquina: "en 63 h 07 min · Próxima prueba Inglés".
 */
function Cuenta({
  etiqueta,
  asignatura,
  nombre,
  hasta,
  reloj,
  titulo,
  horaPrimero = false,
  className = '',
}: DatosCuenta & {
  reloj: Date
  horaPrimero?: boolean
  className?: string
}) {
  const hora = <Odometro texto={`en ${textoFalta(reloj, hasta)}`} className="shrink-0 font-mono text-tinta" />
  const punto = (
    <span className="shrink-0" aria-hidden="true">
      ·
    </span>
  )
  return (
    <div className={`min-w-0 items-center gap-1.5 whitespace-nowrap ${className}`} title={titulo}>
      {horaPrimero && (
        <>
          {hora}
          {punto}
        </>
      )}
      <dt className="shrink-0">{etiqueta}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate font-medium text-(--c)" style={{ '--c': colorAsignatura(asignatura) } as CSSProperties}>
          {nombre}
        </span>
        {!horaPrimero && (
          <>
            {punto}
            {hora}
          </>
        )}
      </dd>
    </div>
  )
}

/**
 * Móvil: tarjeta de tres líneas, de lo general a lo concreto (qué es · cuál · cuándo),
 * para leerla de un vistazo en vez de una frase larga. Sin datos, un guion.
 */
function CuentaMovil({ etiqueta, datos, reloj, className = '' }: { etiqueta: string; datos: DatosCuenta | null; reloj: Date; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`} title={datos?.titulo}>
      <dt className="text-[0.62rem] tracking-wider uppercase">{etiqueta}</dt>
      {datos ? (
        <>
          <dd
            className="mt-0.5 truncate text-[0.82rem] font-medium text-(--c)"
            style={{ '--c': colorAsignatura(datos.asignatura) } as CSSProperties}
          >
            {datos.nombre}
          </dd>
          <dd>
            <Odometro texto={`en ${textoFalta(reloj, datos.hasta)}`} className="font-mono text-tinta" />
          </dd>
        </>
      ) : (
        <dd className="mt-0.5 font-mono text-tinta">—</dd>
      )}
    </div>
  )
}

type Props = {
  horario: Horario | null
  lista: EventoConDias[]
  excluidas: Excluidas
  grupo: Grupo // solo se muestra: se cambia en Ajustes
}

/**
 * Barra superior en tres columnas (grid 1fr · auto · 1fr): el nombre queda
 * centrado de verdad aunque los lados midan distinto.
 * Izquierda: cuánto falta para la próxima prueba. Derecha: para la próxima clase.
 */
export function Cabecera({ horario, lista, excluidas, grupo }: Props) {
  // Reloj propio que late cada segundo: solo la cabecera se re-renderiza tan a menudo
  const reloj = useAhora(1000)
  const clase = horario ? proximaClase(horario, reloj, excluidas) : null
  // La primera prueba que aún no ha empezado
  const prueba = lista
    .filter((e) => e.dias >= 0)
    .map((e) => ({ e, inicio: inicioDePrueba(e, horario) }))
    .find((p) => p.inicio > reloj)

  // Los datos de las dos cuentas atrás se calculan una vez y se pintan de dos formas: a los lados del título
  // (escritorio) o en dos tarjetas bajo él (móvil, donde no caben junto al título)
  const datosPrueba: DatosCuenta | null = prueba
    ? {
        etiqueta: prueba.e.tipo === 'entrega' ? 'Próxima entrega' : 'Próxima prueba',
        asignatura: prueba.e.asignatura,
        nombre: prueba.e.asignatura ? nombreAsignatura(prueba.e.asignatura) : (prueba.e.detalle ?? 'Evaluación'),
        hasta: prueba.inicio,
        titulo: `${formatoLargo(prueba.inicio)}${prueba.e.detalle ? ` · ${prueba.e.detalle}` : ''}`,
      }
    : null
  const datosClase: DatosCuenta | null = clase
    ? {
        etiqueta: 'Próxima clase',
        asignatura: clase.clase.asignatura,
        nombre: nombreAsignatura(clase.clase.asignatura),
        hasta: clase.inicio,
        titulo: `${formatoLargo(clase.inicio)} a las ${clase.clase.inicio}`,
      }
    : null

  return (
    <header data-tutorial="cabecera" className="cristal relative z-30 shrink-0 border-b border-linea bg-fondo/60 px-4 text-xs text-tinta-suave">
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <dl className="flex min-w-0">{datosPrueba && <Cuenta {...datosPrueba} reloj={reloj} horaPrimero className="hidden md:flex" />}</dl>

        <div className="flex items-center gap-2.5">
          <h1 className="font-titulo text-base font-bold tracking-tight whitespace-nowrap text-tinta">Monte Naranco Agenda Digital</h1>
          <span
            className="border border-linea px-1.5 py-0.5 font-mono text-[0.7rem] whitespace-nowrap text-arena"
            title="Tu grupo (se cambia en Ajustes)"
          >
            {nombreGrupo(grupo)}
          </span>
        </div>

        <dl className="flex min-w-0 justify-end">
          {datosClase ? (
            <Cuenta {...datosClase} reloj={reloj} className="hidden md:flex" />
          ) : (
            <div className="hidden gap-1.5 md:flex">
              <dt>Próxima clase</dt>
              <dd className="font-mono">—</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Móvil: dos tarjetas lado a lado (grid de 2 columnas) separadas por una línea fina */}
      <dl className="grid grid-cols-2 border-t border-linea/70 py-2 md:hidden">
        <CuentaMovil etiqueta={datosPrueba?.etiqueta ?? 'Próxima prueba'} datos={datosPrueba} reloj={reloj} className="pr-3" />
        <CuentaMovil etiqueta="Próxima clase" datos={datosClase} reloj={reloj} className="border-l border-linea/70 pl-3" />
      </dl>
    </header>
  )
}
