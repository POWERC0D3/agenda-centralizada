import { ScrollTrigger } from '../../lib/gsap'

/**
 * Baja hasta la tarjeta de cuenta (la barra de arriba, el botón del final y la llegada desde dentro de la web).
 * - Con la escena animada: al final de su scroll. Al bajar suave, la historia pasa a cámara rápida.
 * - Sin escena (movimiento reducido): la tarjeta está en el flujo normal, debajo de la lista; se salta sin animación.
 * `inmediato`: sin desplazamiento suave y con la animación ya terminada (para llegar con todo en su sitio).
 */
export function irAlFormulario(inmediato = false) {
  const escena = ScrollTrigger.getById('hero')
  if (!escena) {
    document.getElementById('acceso')?.scrollIntoView({ block: 'center' })
    return
  }
  window.scrollTo({ top: escena.end, behavior: inmediato ? 'auto' : 'smooth' })
  if (inmediato) {
    ScrollTrigger.update() // que la escena se entere ya del scroll nuevo (sin esperar al evento)
    escena.getTween()?.progress(1) // y que el scrub (la "inercia" de 0,7 s) termine de golpe
  }
}
