import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { irA, type Ruta } from '../../hooks/useRuta'
import { cerrarSesion, useSesion } from '../../hooks/useSesion'
import { empezarBienvenida } from '../../lib/bienvenida'
import { EASE_SALIDA } from '../../lib/movimiento'
import { sonar } from '../../lib/sonido'
import { mensajeDeError, supabase } from '../../lib/supabase'

export type ModoCuenta = 'entrar' | 'crear'

const PESTANAS: { modo: ModoCuenta; texto: string }[] = [
  { modo: 'crear', texto: 'Crear cuenta' },
  { modo: 'entrar', texto: 'Iniciar sesión' },
]

type PropsCampo = { etiqueta: string; nombre: string; tipo: string; autocompletar: string; minimo?: number }

function Campo({ etiqueta, nombre, tipo, autocompletar, minimo }: PropsCampo) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-tinta-suave">{etiqueta}</span>
      {/* required: el navegador no deja enviar el formulario con el campo vacío (y type="email" exige una @).
          Es la validación nativa de HTML: sin JavaScript, accesible y con sus mensajes en el idioma del navegador */}
      <input
        name={nombre}
        type={tipo}
        required
        minLength={minimo}
        autoComplete={autocompletar}
        onFocus={() => sonar('tap', { volumen: 0.4 })}
        className="w-full border border-linea bg-fondo px-3 py-2.5 text-sm transition-colors outline-none focus:border-arena user-invalid:border-coral"
      />
    </label>
  )
}

type Props = {
  modo: ModoCuenta
  /** Adónde ir al terminar (con la cortina desde el botón): entrar → panel; crear cuenta → ajustes.
   *  `mensaje` se enseña al llegar */
  onAcceder: (destino: Ruta, centro: { x: number; y: number }, mensaje: string) => void
  className?: string
}

const centroDe = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * La tarjeta de cuenta, conectada a Supabase Auth. Crear cuenta lleva a Ajustes (para elegir grupo y
 * módulos antes de empezar); iniciar sesión, al panel. Si ya hay sesión, enseña quién eres.
 * En la landing sube y sustituye a la lista.
 */
export function TarjetaCuenta({ modo, onAcceder, className = '' }: Props) {
  const crear = modo === 'crear'
  const { usuario, nombre, cargando } = useSesion()
  const [enviando, setEnviando] = useState(false)
  // El error recuerda en qué pestaña ocurrió: al cambiar de pestaña deja de mostrarse solo
  const [error, setError] = useState<{ modo: ModoCuenta; texto: string } | null>(null)

  // Solo llega aquí si todos los campos son válidos: si no, el navegador corta el envío antes
  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault() // sin esto, el navegador recargaría la página al enviar el formulario
    const centro = centroDe((e.nativeEvent as SubmitEvent).submitter ?? e.currentTarget)
    const datos = new FormData(e.currentTarget) // los valores de los <input name="…">, sin estado de React
    const correo = String(datos.get('correo')).trim()
    const clave = String(datos.get('clave'))
    const nombreNuevo = String(datos.get('nombre') ?? '').trim()

    sonar('button')
    setError(null)
    setEnviando(true)
    try {
      if (crear) {
        // El nombre se guarda en los metadatos del usuario (no hace falta una tabla aparte para eso)
        const { data, error } = await supabase.auth.signUp({ email: correo, password: clave, options: { data: { nombre: nombreNuevo } } })
        if (error) throw error
        // Sin sesión = el proyecto pide confirmar el correo (Authentication → Email → Confirm email)
        if (!data.session) {
          setError({ modo, texto: 'Revisa tu correo para confirmar la cuenta y después inicia sesión' })
          setEnviando(false)
          return
        }
        empezarBienvenida() // la primera visita a Ajustes será paso a paso
        onAcceder('ajustes', centro, `Cuenta creada. Hola, ${nombreNuevo}: vamos a configurar tu panel`)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
        if (error) throw error
        const quien = (data.user.user_metadata?.nombre as string | undefined) || correo
        onAcceder('panel', centro, `Hola de nuevo, ${quien}`)
      }
      // `enviando` se queda en true: la página cambia y esta tarjeta desaparece
    } catch (err) {
      sonar('caution', { volumen: 0.5 })
      setError({ modo, texto: mensajeDeError(err) })
      setEnviando(false)
    }
  }

  // Ya hay sesión (y no es la que se acaba de iniciar aquí): en vez del formulario, quién eres
  const conSesion = usuario && !enviando

  return (
    <div
      id="acceso"
      className={`w-full border border-arena/50 bg-fondo-alto p-5 shadow-[0_0_60px_-15px_color-mix(in_oklab,var(--color-arena)_45%,transparent)] sm:p-6 ${className}`}
    >
      {conSesion ? (
        <div className="space-y-5 py-2 text-center">
          <p className="text-sm text-tinta-suave">
            Has iniciado sesión como
            <span className="mt-1 block truncate font-titulo text-lg font-semibold text-tinta">{nombre || usuario.email}</span>
            {nombre && <span className="block truncate text-xs">{usuario.email}</span>}
          </p>
          <button
            type="button"
            onClick={(e) => onAcceder('panel', centroDe(e.currentTarget), '')}
            className="w-full bg-arena py-3 text-sm font-semibold text-oscuro-fijo transition-colors hover:bg-tinta"
          >
            Ir al panel
          </button>
          <button
            type="button"
            onClick={() => {
              sonar('toggle_off')
              void cerrarSesion()
            }}
            className="text-xs text-tinta-suave underline-offset-4 transition-colors hover:text-tinta hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <>
          <div role="tablist" className="grid grid-cols-2 border-b border-linea">
            {PESTANAS.map((p) => (
              <button
                key={p.modo}
                type="button"
                role="tab"
                aria-selected={modo === p.modo}
                onClick={() => {
                  if (p.modo !== modo) sonar('swipe', { tono: p.modo === 'crear' ? 1.08 : 0.94 })
                  irA(p.modo)
                }}
                className="relative py-2.5 text-sm text-tinta-suave transition-colors hover:text-tinta aria-selected:text-tinta"
              >
                {p.texto}
                {modo === p.modo && (
                  <motion.span
                    layoutId="pestana-cuenta"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-arena"
                    transition={{ duration: 0.35, ease: EASE_SALIDA }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* invalid no burbujea: se escucha en fase de captura para sonar una vez por intento fallido */}
          <form
            onSubmit={enviar}
            onInvalidCapture={() => sonar('caution', { volumen: 0.5, cada: 400 })}
            aria-busy={enviando}
            className="mt-5 space-y-3"
          >
            {crear && <Campo etiqueta="Nombre" nombre="nombre" tipo="text" autocompletar="name" />}
            <Campo etiqueta="Correo del centro" nombre="correo" tipo="email" autocompletar="email" />
            <Campo
              etiqueta={crear ? 'Contraseña (mínimo 6 caracteres)' : 'Contraseña'}
              nombre="clave"
              tipo="password"
              autocompletar={crear ? 'new-password' : 'current-password'}
              minimo={crear ? 6 : undefined}
            />
            {error?.modo === modo && (
              <p role="alert" className="text-xs text-coral">
                {error.texto}
              </p>
            )}
            <button
              type="submit"
              disabled={enviando || cargando}
              className="mt-2 w-full bg-arena py-3 text-sm font-semibold text-oscuro-fijo transition-colors hover:bg-tinta disabled:cursor-wait disabled:opacity-60"
            >
              {enviando ? (crear ? 'Creando cuenta…' : 'Entrando…') : crear ? 'Crear cuenta' : 'Entrar'}
            </button>
            {crear && (
              <p className="text-center text-xs leading-relaxed text-tinta-suave">
                Al crear la cuenta aceptas la{' '}
                <a href="#/privacidad" className="text-tinta underline underline-offset-4 hover:text-arena">
                  política de privacidad
                </a>
                .
              </p>
            )}
          </form>
        </>
      )}
    </div>
  )
}
