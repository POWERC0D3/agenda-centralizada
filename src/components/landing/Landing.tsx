import type { Navegar } from '../../hooks/useRuta'
import { URL_ORIGEN } from '../../lib/config'
import { sonar } from '../../lib/sonido'
import { LogoMarca } from '../ui/LogoMarca'
import type { ModoCuenta } from './Acceso'
import { Funciones } from './Funciones'
import { Hero } from './Hero'
import { irAlFormulario } from './formulario'

type Props = {
  modo: ModoCuenta
  /** Ir a otra página con la cortina al enviar el formulario de cuenta */
  onNavegar: Navegar
}

/**
 * La puerta de entrada: una landing que explica la web (todo tu curso en un sitio) y lleva a la tarjeta de cuenta.
 * Tema CLARO, a propósito: el papel de una agenda frente al panel oscuro (lo pone App, ver lib/tema.ts).
 * - Arriba, fija: la marca y "Acceder", que baja hasta la tarjeta desde cualquier punto.
 * - La escena del Hero (fichas que se ordenan → tarjeta de cuenta).
 * - Qué hay dentro y cómo empezar, para quien quiere saber más antes de registrarse.
 */
export function Landing({ modo, onNavegar }: Props) {
  return (
    <>
      {/* Degradado del papel a transparente: lo que pasa por debajo al hacer scroll se desvanece */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-linear-to-b from-fondo via-fondo/85 to-transparent px-5 pt-4 pb-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMarca className="h-7 w-auto" />
          <span className="leading-none">
            <span className="block font-titulo text-sm font-bold tracking-tight">Agenda Digital</span>
            <span className="mt-1 block font-mono text-[0.6rem] tracking-widest text-tinta-suave uppercase">IES Monte Naranco</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            sonar('button')
            irAlFormulario()
          }}
          className="border border-tinta/15 bg-fondo-alto/80 px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:border-verde hover:text-verde"
        >
          Acceder
        </button>
      </header>

      <main>
        <Hero modo={modo} onAcceder={onNavegar} />
        <Funciones />
      </main>

      <footer className="border-t border-linea px-4 py-8 text-xs leading-relaxed text-tinta-suave">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Proyecto de aprendizaje de un alumno de DAW. No es una herramienta oficial del IES Monte Naranco.</p>
          <p className="flex shrink-0 gap-5">
            <a href="#/privacidad" className="underline-offset-4 transition-colors hover:text-tinta hover:underline">
              Privacidad
            </a>
            <a
              href={URL_ORIGEN}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 transition-colors hover:text-tinta hover:underline"
            >
              alvaro.cloud ↗
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
