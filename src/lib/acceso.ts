// Al llegar a la landing desde DENTRO de la web (cerrar sesión, la puerta "Cuenta" del logo, "Iniciar sesión"
// en Ajustes) se va directo a la tarjeta de cuenta: la historia del principio es para quien llega de fuera.
// Basta una variable del módulo: es un aviso de un solo uso entre App (que navega) y la landing (que lo lee).
let pedido = false

export function pedirFormulario() {
  pedido = true
}

/** ¿Hay que ir directo al formulario? Responde UNA vez: después vuelve a ser false. */
export function tomarFormulario(): boolean {
  const p = pedido
  pedido = false
  return p
}
