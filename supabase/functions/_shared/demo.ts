// La cuenta de prueba del README. Su contraseña es pública, así que el servidor la protege:
// - no se puede borrar (borrar-cuenta): si no, el primero que entrara la dejaría inservible para los demás;
// - no puede conectar plataformas (conectar-moodle): nadie deja ahí sus credenciales para el siguiente visitante;
// - no puede añadir tareas: eso lo impide la propia base de datos con RLS (migración 20261108230000_cuenta_prueba.sql).
import { admin } from './http.ts'

export const CORREO_DEMO = 'test@admin.is'

/** ¿Es la cuenta de prueba? Se mira el correo de la cuenta en Auth, no lo que diga el navegador. */
export async function esCuentaDemo(userId: string): Promise<boolean> {
  const { data } = await admin().auth.admin.getUserById(userId)
  return data.user?.email?.toLowerCase() === CORREO_DEMO
}
