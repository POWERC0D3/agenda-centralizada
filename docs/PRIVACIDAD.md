# Política de privacidad

> Publicada en la web en `#/privacidad` (`src/components/sections/Privacidad.tsx`), enlazada desde el registro, Ajustes y la conexión con Moodle. Si cambia este texto, cambiar también la página.

**Monte Naranco Agenda Digital** es un proyecto personal de un alumno del IES Monte Naranco. **No es una herramienta oficial del centro** ni de Educastur.

Última actualización: 3 de noviembre de 2026

---

## 1. Quién es el responsable

- **Responsable:** power
- **Contacto para cualquier cosa sobre tus datos:** privacidad@alvaro.cloud

## 2. Qué datos guardamos y para qué

| Dato | Para qué | Dónde |
|---|---|---|
| Correo electrónico y contraseña | Tu cuenta: iniciar sesión. La contraseña se guarda **cifrada con un algoritmo irreversible** (*hash*): nadie puede leerla, tampoco el responsable. | Supabase |
| Nombre | Saludarte en la web | Supabase |
| Tu grupo, los módulos que no cursas y el sonido | Que la web te muestre tu horario y tus asignaturas, igual en todos tus dispositivos | Supabase y tu navegador |
| Las tareas de la agenda que marcas como hechas | Recordarlas en todos tus dispositivos | Supabase y tu navegador |
| **Si conectas Moodle:** tu usuario de Moodle y una clave de acceso de su app móvil (*token*) | Leer tus entregas pendientes y mostrarlas en la agenda. **Tu contraseña de Moodle no se guarda nunca:** se usa una sola vez para pedir esa clave. La clave se guarda **cifrada** y solo la usa el servidor. | Supabase |
| **Si conectas Mis Aulas (aulas2.site):** tu usuario y tu contraseña | Esa web no permite el acceso a aplicaciones, así que para leer tus entregas el servidor inicia sesión por ti en cada sincronización. **Tu contraseña se guarda cifrada**, solo la usa el servidor para eso y se borra al desconectar. | Supabase |
| **Si conectas Moodle o Mis Aulas:** el nombre de tus cursos y tus entregas pendientes (título, fecha, enlace) | Mostrarlas en la agenda y el calendario | Supabase |
| Las tareas que añades a mano (las de Teams): título, fecha, asignatura y enlace | Mostrarlas en la agenda y el calendario. Solo lo que tú escribes | Supabase |

**No guardamos:** tus notas, tus mensajes, los archivos que entregas ni nada de tu cuenta de Teams: de Teams, solo lo que tú apuntes a mano.

**No hay publicidad ni analítica:** no usamos cookies de seguimiento ni herramientas de estadísticas. La web guarda algunos datos en tu navegador (`localStorage`) solo para funcionar: tu sesión, tus ajustes y las tareas marcadas.

## 3. Por qué podemos tratarlos (base legal)

Tu **consentimiento**, al crear la cuenta y, por separado, al conectar Moodle. Puedes retirarlo en cualquier momento: desconectando Moodle o borrando tu cuenta (punto 6).

## 4. Quién más los trata (encargados)

Ningún dato se vende ni se cede a nadie. Solo los tratan los servicios técnicos que hacen funcionar la web:

| Servicio | Qué hace | Dónde |
|---|---|---|
| **Supabase** | Base de datos, cuentas y servidor | Irlanda (UE) |
| **Amazon Web Services** (S3 y CloudFront) | Sirve la web. No guarda tus datos personales | UE y red de distribución mundial |
| **Cloudflare** | Dirige el dominio hacia la web (DNS). No guarda tus datos | — |

Cuando conectas Moodle o Mis Aulas, el servidor habla con **aula.iesmontenaranco.com** o **aulas2.site** en tu nombre para leer tus entregas: solo, **cada 30 minutos** (en Mis Aulas, como mucho cada 2 horas), y cuando pulsas «Sincronizar ahora». Al abrir una tarea, tu navegador usa tu clave para entrar en Moodle con tu sesión iniciada.

## 5. Cuánto tiempo los guardamos

- **Mientras tengas la cuenta.** Al borrarla, se borra **todo**: cuenta, ajustes, tareas, conexiones de Moodle con sus claves y entregas.
- **Al desconectar Moodle,** se borran su clave de acceso, tus cursos y tus entregas de Moodle.

## 6. Tus derechos

Tienes derecho a **acceder** a tus datos, **corregirlos**, **borrarlos**, **oponerte** a su tratamiento, **limitarlo** y **llevártelos** (portabilidad).

- **Borrar tu cuenta y todos tus datos:** Ajustes → Tu cuenta → *Borrar mi cuenta*. Es inmediato.
- **Desconectar Moodle:** Ajustes → Sincronizar → *Desconectar*. También puedes revocar la clave desde Moodle: Preferencias → Claves de seguridad.
- **Para todo lo demás:** escribe a privacidad@alvaro.cloud.

Si crees que no se han respetado tus derechos, puedes reclamar ante la **Agencia Española de Protección de Datos** ([aepd.es](https://www.aepd.es)).

## 7. Seguridad

- Toda la comunicación va cifrada (HTTPS).
- Cada usuario **solo puede ver sus propios datos**: lo impone la propia base de datos (*Row Level Security*).
- Las claves de acceso a Moodle y la contraseña de Mis Aulas se guardan **cifradas** (AES-256-GCM), con una llave que solo tiene el servidor.

## 8. Menores

En España, a partir de los **14 años** puedes dar tu consentimiento tú mismo. Si tienes menos de 14, necesitas el de tu padre, madre o tutor.

## 9. Cambios

Si cambia esta política, se actualizará la fecha de arriba y, si el cambio es importante, se avisará en la web.
