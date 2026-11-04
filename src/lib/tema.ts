// Tema de color de cada página (index.css: html[data-tema="…"]).
// - claro: la landing (papel), para distinguirse del panel
// - gris: Ajustes, el oscuro un poco más claro
// - oscuro: el panel y lo demás (sin atributo: los tokens de @theme)

export type Tema = 'claro' | 'gris' | 'oscuro'

/**
 * Cambia el tema de toda la página: un atributo en <html> que redefine los tokens de color.
 * También el color de la barra del navegador en el móvil (meta theme-color), leído del propio CSS
 * para no repetir el valor aquí.
 */
export function aplicarTema(tema: Tema) {
  const html = document.documentElement
  if (tema === 'oscuro') delete html.dataset.tema
  else html.dataset.tema = tema
  const fondo = getComputedStyle(html).getPropertyValue('--color-fondo').trim()
  if (fondo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo)
}
