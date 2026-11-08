import { useSyncExternalStore } from 'react'
import { animacionesSimples, suscribirAnimaciones } from '../lib/animaciones'

/** ¿Animaciones simplificadas? Como estado de React: el componente se vuelve a pintar cuando cambia en Ajustes. */
export function useAnimacionesSimples(): boolean {
  return useSyncExternalStore(suscribirAnimaciones, animacionesSimples)
}
