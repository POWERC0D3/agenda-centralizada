import type { Ruta } from '../../hooks/useRuta'
import type { ModoCuenta } from './Acceso'
import { Hero } from './Hero'

type Props = {
  modo: ModoCuenta
  /** Ir a otra página con la cortina al enviar el formulario de cuenta */
  onNavegar: (ruta: Ruta, centro: { x: number; y: number }, mensaje?: string) => void
}

/**
 * La puerta de entrada: una landing de marketing que explica la idea de la web
 * (todo tu curso en un sitio) y termina en el formulario de cuenta.
 * Mismo estilo que el panel, pero otro registro: tipografía enorme, aire y scroll. Sin barra de navegación:
 * la única salida es la propia tarjeta de cuenta (entrar, registrarse o, con sesión, ir al panel).
 */
export function Landing({ modo, onNavegar }: Props) {
  return (
    <main>
      <Hero modo={modo} onAcceder={onNavegar} />
    </main>
  )
}
