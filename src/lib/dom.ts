// Utilidades pequeñas del DOM, compartidas por varios componentes.

/** Centro de un elemento en la pantalla: el punto desde el que nace la cortina de píxeles al pulsar un botón. */
export function centroDe(el: Element) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
