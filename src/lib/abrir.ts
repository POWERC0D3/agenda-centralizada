// Abrir una tarea en su web (Agenda y Calendario la comparten).

/**
 * Abre una tarea en su web. Si es una entrega de la cuenta, pide al servidor el enlace con inicio de sesión
 * automático (Moodle del centro); si no se puede, el enlace normal.
 * La pestaña se abre YA, dentro del clic: los navegadores bloquean las ventanas que se abren después de esperar
 * una respuesta. Se abre en blanco y, cuando llega el enlace, se le cambia la dirección.
 */
export function abrirTarea(url: string, entregaId?: string) {
  if (!entregaId) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const ventana = window.open('about:blank', '_blank')
  if (ventana) ventana.opener = null // la pestaña nueva no puede tocar esta página (como noopener)
  import('./moodle')
    .then((m) => m.enlaceDeTarea(entregaId))
    .catch(() => url) // sin red o error: el enlace normal
    .then((destino) => {
      if (ventana) ventana.location.href = destino
      else window.open(destino, '_blank', 'noopener,noreferrer')
    })
}
