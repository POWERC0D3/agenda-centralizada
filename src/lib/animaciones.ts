// Animaciones simplificadas: sin cortina de píxeles, sin escena en la landing, con el fondo y el logo quietos
// y los textos sin efecto de escritura. Para ordenadores lentos (donde las animaciones van a saltos) o para
// quien se marea con el movimiento.
//
// - Por defecto, DESACTIVADAS: la web va con todas sus animaciones aunque el sistema pida reducir movimiento.
// - Es una preferencia de ESTE navegador (localStorage), no de la cuenta: depende del ordenador, no de la persona.
// - Es la única fuente de verdad: todos los componentes preguntan aquí (useAnimacionesSimples), no al sistema.
//   Mismo patrón que las preferencias de sonido (lib/sonido.ts).

const CLAVE = 'agenda:animaciones-simples'

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

let simples = leer()
const oyentes = new Set<() => void>()

/** El atributo de <html> que usan las variantes de Tailwind `anima:` y `quieto:` (index.css). */
function aplicarAtributo() {
  if (simples) document.documentElement.dataset.animaciones = 'simples'
  else delete document.documentElement.dataset.animaciones
}
aplicarAtributo() // al cargar el módulo: antes del primer render

/** Para useSyncExternalStore: React se entera cuando cambia la preferencia. */
export const suscribirAnimaciones = (f: () => void) => {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

/** ¿Animaciones simplificadas? (para leerlo fuera de React o sin suscribirse) */
export const animacionesSimples = () => simples

export function simplificarAnimaciones(si: boolean) {
  simples = si
  try {
    localStorage.setItem(CLAVE, si ? '1' : '0')
  } catch {
    // sin almacenamiento: vale igual para esta visita
  }
  aplicarAtributo()
  oyentes.forEach((f) => f())
}
