import type { ReactNode } from 'react'
import { LogoMarca } from '../ui/LogoMarca'

// Política de privacidad (RGPD, art. 13). Mismo contenido que docs/PRIVACIDAD.md: si cambia una, cambiar la otra.
const RESPONSABLE = 'power'
const CORREO = 'privacidad@alvaro.cloud'
const ACTUALIZADA = '3 de noviembre de 2026'

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="border-t border-linea pt-6">
    <h2 className="mb-3 font-titulo text-xl leading-none font-bold">{titulo}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-tinta-suave [&_strong]:font-medium [&_strong]:text-tinta">{children}</div>
  </section>
)

const Tabla = ({ filas, cabecera }: { cabecera: string[]; filas: ReactNode[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-tinta">
          {cabecera.map((c) => (
            <th key={c} className="border-b border-linea py-2 pr-3 font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="align-top">
            {f.map((c, j) => (
              <td key={j} className="border-b border-linea/60 py-2 pr-3">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const correo = (
  <a href={`mailto:${CORREO}`} className="text-arena underline-offset-4 hover:underline">
    {CORREO}
  </a>
)

/** Página de la política de privacidad. Abierta sin sesión: hay que poder leerla antes de registrarse. */
export function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-16">
      <header className="text-center">
        <LogoMarca className="mx-auto h-10 w-auto" />
        <h1 className="mt-6 font-titulo text-4xl leading-none font-bold tracking-tight sm:text-5xl">Privacidad</h1>
        <p className="mt-3 text-sm text-tinta-suave">
          Monte Naranco Agenda Digital es un proyecto personal de un alumno del IES Monte Naranco.{' '}
          <strong className="font-medium text-tinta">No es una herramienta oficial del centro ni de Educastur.</strong>
        </p>
        <p className="mt-2 font-mono text-xs text-tinta-suave">Actualizada el {ACTUALIZADA}</p>
      </header>

      <Seccion titulo="1. Quién es el responsable">
        <p>
          <strong>Responsable:</strong> {RESPONSABLE}. <strong>Contacto</strong> para cualquier cosa sobre tus datos: {correo}.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos guardamos y para qué">
        <Tabla
          cabecera={['Dato', 'Para qué']}
          filas={[
            [
              'Correo y contraseña',
              'Tu cuenta. La contraseña se guarda cifrada de forma irreversible: nadie puede leerla, tampoco el responsable.',
            ],
            ['Nombre', 'Saludarte en la web.'],
            ['Grupo, módulos que no cursas y sonido', 'Mostrarte tu horario y tus asignaturas, igual en todos tus dispositivos.'],
            ['Tareas de la agenda marcadas como hechas', 'Recordarlas en todos tus dispositivos.'],
            [
              'Si conectas Moodle: tu usuario y una clave de acceso de su app móvil',
              <>
                Leer tus entregas pendientes. <strong>Tu contraseña de Moodle nunca se guarda</strong>: se usa una vez para pedir
                esa clave, que se guarda cifrada y solo usa el servidor.
              </>,
            ],
            [
              'Si conectas Mis Aulas (aulas2.site): tu usuario y tu contraseña',
              <>
                Esa web no permite el acceso a aplicaciones, así que para leer tus entregas el servidor inicia sesión por ti en cada
                sincronización. <strong>Tu contraseña se guarda cifrada</strong>, solo la usa el servidor para eso y se borra al
                desconectar.
              </>,
            ],
            ['Si conectas Moodle o Mis Aulas: tus cursos y tus entregas pendientes (título, fecha, enlace)', 'Mostrarlas en la agenda y el calendario.'],
          ]}
        />
        <p>
          <strong>No guardamos</strong> tus notas, tus mensajes, los archivos que entregas ni ningún dato de Teams.
        </p>
        <p>
          <strong>Sin publicidad ni analítica:</strong> no hay cookies de seguimiento ni estadísticas. La web guarda algunos datos en tu
          navegador solo para funcionar: tu sesión, tus ajustes y las tareas marcadas.
        </p>
      </Seccion>

      <Seccion titulo="3. Por qué podemos tratarlos">
        <p>
          Tu <strong>consentimiento</strong>, al crear la cuenta y, por separado, al conectar Moodle. Puedes retirarlo cuando quieras
          desconectando Moodle o borrando tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="4. Quién más los trata">
        <p>Ningún dato se vende ni se cede. Solo lo tratan los servicios técnicos que hacen funcionar la web:</p>
        <Tabla
          cabecera={['Servicio', 'Qué hace', 'Dónde']}
          filas={[
            ['Supabase', 'Base de datos, cuentas y servidor', 'Irlanda (UE)'],
            ['Amazon Web Services', 'Sirve la web; no guarda tus datos personales', 'UE y red mundial de distribución'],
            ['Cloudflare', 'Dirige el dominio a la web (DNS); no guarda tus datos', '—'],
          ]}
        />
        <p>Si conectas Moodle o Mis Aulas, el servidor habla con aula.iesmontenaranco.com o aulas2.site en tu nombre para leer tus entregas.</p>
      </Seccion>

      <Seccion titulo="5. Cuánto tiempo">
        <p>
          <strong>Mientras tengas la cuenta.</strong> Al borrarla se borra todo: cuenta, ajustes, tareas, conexiones de Moodle con sus
          claves y entregas. Al desconectar Moodle se borran su clave, tus cursos y tus entregas de Moodle.
        </p>
      </Seccion>

      <Seccion titulo="6. Tus derechos">
        <p>Puedes acceder a tus datos, corregirlos, borrarlos, oponerte a su tratamiento, limitarlo y llevártelos.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Borrar tu cuenta y todos tus datos:</strong> Ajustes → Tu cuenta → Borrar mi cuenta. Es inmediato.
          </li>
          <li>
            <strong>Desconectar Moodle:</strong> Ajustes → Sincronizar → Desconectar. También puedes revocar la clave en Moodle →
            Preferencias → Claves de seguridad.
          </li>
          <li>
            <strong>Todo lo demás:</strong> escribe a {correo}.
          </li>
        </ul>
        <p>
          Si crees que no se han respetado tus derechos, puedes reclamar ante la{' '}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-arena underline-offset-4 hover:underline">
            Agencia Española de Protección de Datos
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="7. Seguridad">
        <p>
          Toda la comunicación va cifrada (HTTPS). Cada usuario solo puede ver sus propios datos: lo impone la propia base de datos.
          Las claves de acceso a Moodle y la contraseña de Mis Aulas se guardan cifradas (AES-256-GCM) con una llave que solo tiene el
          servidor.
        </p>
      </Seccion>

      <Seccion titulo="8. Menores">
        <p>En España, desde los 14 años puedes dar tu consentimiento tú mismo. Con menos, necesitas el de tu padre, madre o tutor.</p>
      </Seccion>

      <Seccion titulo="9. Cambios">
        <p>Si cambia esta política se actualizará la fecha de arriba y, si el cambio es importante, se avisará en la web.</p>
      </Seccion>

      <div className="pt-4 text-center">
        <button
          type="button"
          // Vuelve a donde estabas (registro, ajustes…); si se entró directamente por el enlace, al login
          onClick={() => (history.length > 1 ? history.back() : window.location.replace('#/entrar'))}
          className="bg-tinta px-6 py-3 text-sm font-medium text-fondo transition-colors hover:bg-arena"
        >
          ← Volver
        </button>
      </div>
    </main>
  )
}
