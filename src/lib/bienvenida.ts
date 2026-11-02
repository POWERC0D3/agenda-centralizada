// Configuración guiada de Ajustes: solo la primera vez, justo después de crear la cuenta.
// Se guarda en sessionStorage (como localStorage, pero se borra al cerrar la pestaña) el paso por el que
// va el alumno: si recarga a mitad, sigue donde estaba. Al terminar, la marca desaparece para siempre.

const CLAVE = 'agenda:bienvenida'

/** Lo llama el registro: la próxima vez que se abra Ajustes, será paso a paso. */
export function empezarBienvenida() {
  try {
    sessionStorage.setItem(CLAVE, '0')
  } catch {
    // sin almacenamiento: Ajustes se verá entero, como siempre
  }
}

/** El paso por el que va (0 = la primera sección) o null si no hay configuración guiada pendiente. */
export function pasoBienvenida(): number | null {
  try {
    const v = sessionStorage.getItem(CLAVE)
    return v === null ? null : Number(v) || 0
  } catch {
    return null
  }
}

export function guardarPasoBienvenida(paso: number) {
  try {
    sessionStorage.setItem(CLAVE, String(paso))
  } catch {
    // no pasa nada: solo se perdería el punto exacto al recargar
  }
}

export function terminarBienvenida() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}

// ── Tutorial del panel: justo después de la configuración guiada ("Ir al panel" del último paso) ──
const TUTORIAL = 'agenda:tutorial'

export function pedirTutorial() {
  try {
    sessionStorage.setItem(TUTORIAL, '1')
  } catch {
    // sin almacenamiento: simplemente no habrá tutorial
  }
}

export function hayTutorial(): boolean {
  try {
    return sessionStorage.getItem(TUTORIAL) === '1'
  } catch {
    return false
  }
}

export function terminarTutorial() {
  try {
    sessionStorage.removeItem(TUTORIAL)
  } catch {
    // nada que borrar
  }
}
