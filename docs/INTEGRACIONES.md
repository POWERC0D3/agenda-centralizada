# Integraciones: Moodle y Teams

> Documento de trabajo (2 nov 2026). Resume la investigación y las pruebas para que la agenda lea automáticamente las **entregas** de las plataformas del instituto, y el plan para hacerlo.
> Sirve también como contexto para Claude Code. Este repo es **público**: aquí no hay ni debe haber usuarios, contraseñas ni tokens.
>
> **Estado (2 nov 2026):** investigación terminada. La arquitectura del §5 está **confirmada** y ya están hechos el proyecto de Supabase, la tabla `entregas` con RLS y el login y registro reales. Detalles en [BACKEND.md](BACKEND.md). Cómo se llegó a estas conclusiones: [§8](#8-cómo-se-llegó-a-estas-conclusiones). Qué hay hecho: [§9](#9-qué-hay-hecho-ya).

---

## 1. Objetivo

Que cada alumno conecte sus cuentas de las plataformas del centro y la web le muestre **todas sus entregas juntas**: título, asignatura, fecha límite, enlace directo a la tarea y, si se puede, si ya está entregada.

Plataformas que usamos (DAW1A):

| Plataforma | Dirección | Asignaturas | Peso |
|---|---|---|---|
| Moodle del centro | `https://aula.iesmontenaranco.com` | 2–3 | medio |
| Moodle "Mis Aulas" | `https://aulas2.site` | 2 | medio |
| Microsoft Teams (cuenta Educastur) | organización de Microsoft 365 de **Educastur** | **6** | **el más importante** |

Las Aulas Virtuales de Educastur (Moodle) también existen, pero ahora mismo no son prioridad.

---

## 2. Resumen de resultados

| Plataforma | ¿Automatizable? | Cómo | Estado de entrega |
|---|---|---|---|
| aula.iesmontenaranco.com | ✅ Sí | API oficial de Moodle (token del servicio móvil) | ✅ (las entregadas desaparecen de la Línea de tiempo) |
| aulas2.site | ✅ Sí | API **desactivada** → vía interna de la web (sesión + `lib/ajax/service.php`) | ✅ (igual) |
| Teams | ❌ No de forma oficial | Educastur bloquea las apps externas | ❌ |

**Decisión para la primera versión:** los dos Moodle automáticos y las tareas de Teams **añadidas a mano** (pegar enlace + fecha), con la opción de marcarlas como hechas. Teams automático queda como mejora futura (ver §5).

---

## 3. Moodle: detalles técnicos

### 3.1 Detectar qué método usar

1. **Configuración pública** (sin login):
   `POST /lib/ajax/service-nologin.php?info=tool_mobile_get_public_config`
   Cuerpo JSON: `[{"index":0,"methodname":"tool_mobile_get_public_config","args":{}}]`
   Devuelve, entre otros, `sitename`, `enablewebservices` (0/1) y `typeoflogin` (1 = usuario/contraseña; 2/3 = navegador/SSO).
2. **Pedir token**: `POST /login/token.php` con `username`, `password`, `service=moodle_mobile_app`.
   - Responde `{"token": "..."}` → **Método A** (API oficial).
   - Responde `errorcode: "enablewsdescription"` ("Los servicios Web deben estar habilitados…") → la API está apagada en todo el sitio → **Método B**.
   - `errorcode: "invalidlogin"` → usuario o contraseña incorrectos.

### 3.2 Método A: API oficial (token)

- Llamadas: `POST /webservice/rest/server.php`, formulario con `wstoken`, `wsfunction`, `moodlewsrestformat=json` y los parámetros (las listas se envían como `courseids[0]=…`).
- Error: la respuesta es un **objeto** con la propiedad `exception` (`errorcode`, `message`). Si la respuesta es una lista, no es un error.
- El token **no caduca** por defecto. Basta con guardar el token y **descartar la contraseña**. El alumno puede revocarlo en Moodle → Preferencias → Claves de seguridad.

Funciones comprobadas en aula.iesmontenaranco.com:

| Función | Para qué |
|---|---|
| `core_webservice_get_site_info` | Nombre, `userid` y lista de funciones permitidas |
| `core_enrol_get_users_courses` (`userid`) | Cursos del alumno |
| `core_calendar_get_action_events_by_timesort` (`timesortfrom`, `limitnum`) | **Entregas pendientes** (la "Línea de tiempo") |
| `mod_assign_get_assignments` (`courseids[]`) | Todas las tareas de los cursos, con `duedate` |
| `mod_assign_get_submission_status` | Estado de una entrega concreta |

### 3.3 Método B: vía interna de la web (cuando la API está apagada)

Es lo que hace la propia web de Moodle para pintar la Línea de tiempo. Funciona aunque `enablewebservices = 0`.

1. `GET /login/index.php` → guardar la cookie `MoodleSession` y leer el campo oculto `logintoken` (`name="logintoken" value="…"`).
2. `POST /login/index.php` con `username`, `password`, `logintoken`, `anchor=""` (misma cookie).
   El login es correcto si la página tiene `"sesskey":"…"` y un enlace a `login/logout.php`.
3. `POST /lib/ajax/service.php?sesskey=<sesskey>&info=<función>` con la cookie y el cuerpo JSON:
   `[{"index":0,"methodname":"<función>","args":{…}}]`
   Respuesta: `[{"error":false,"data":{…}}]` o `[{"error":true,"exception":{…}}]`.
4. `GET /login/logout.php?sesskey=<sesskey>` para cerrar la sesión.

Solo se pueden usar funciones marcadas como AJAX en Moodle. Comprobadas:

- `core_calendar_get_action_events_by_timesort`, con `{"timesortfrom": <unix>, "limitnum": 50}`
- `core_course_get_enrolled_courses_by_timeline_classification`, con `{"offset":0,"limit":0,"classification":"all","sort":"fullname"}`

`mod_assign_get_assignments` probablemente **no** está disponible por esta vía. Por eso se usa el calendario.

⚠️ Esta vía necesita **la contraseña cada vez que la sesión caduca**, así que hay que guardarla cifrada o volver a pedírsela al alumno. Es menos estable que la API: si actualizan Moodle o cambian el login, puede romperse. Hay que aislarla en un módulo propio.

### 3.4 Fuente de datos común: la Línea de tiempo

Las dos vías usan `core_calendar_get_action_events_by_timesort`, así que el resultado es igual en los dos métodos:

- Solo devuelve tareas **con acción pendiente**: lo ya entregado desaparece. Así tenemos el "estado de entrega" sin hacer nada más.
- Con `timesortfrom = ahora − 60 días` también salen las **vencidas sin entregar**.
- Campos útiles de cada evento: `name`, `timesort` (fecha límite, unix), `url` (enlace a la actividad), `action.url`, `course.fullname`, `modulename`.
- En aulas2 el nombre viene como "Vencimiento de Práctica 03…": conviene limpiarlo.

### 3.5 Resultados de las pruebas (2 nov 2026)

**aula.iesmontenaranco.com**: API **activa**
- `token.php` con datos falsos → `invalidlogin`. `server.php` con token inventado → `invalidtoken`. Es lo esperado con la API encendida.
- Con la cuenta real: token OK, las 4 funciones permitidas, 3 cursos, 6 tareas con fecha (todas ya vencidas a fecha de la prueba).
- Login normal y vía interna también funcionan.

**aulas2.site ("Mis Aulas")**: API **desactivada**
- `enablewebservices: 0`. `token.php` → `enablewsdescription` (también con datos falsos, así que es global). `server.php` → HTTP 403.
- Login normal: OK. Vía interna: OK (2 cursos y 1 entrega pendiente).
- Opción descartada por ahora: pedir al admin que active "Habilitar servicios web" y "Servicios web para dispositivos móviles". No hace falta.

---

## 4. Teams: qué se ha probado y por qué no se puede automatizar

### 4.1 La vía oficial: Microsoft Graph

- Existe `GET /education/me/assignments` (con `?$expand=submissions` para el estado) y el permiso delegado `EduAssignments.ReadBasic` (leer tareas sin notas).
- Las cuentas de Teams pertenecen a la organización de Microsoft 365 de **Educastur**, no al instituto.
- **Prueba:** login con código de dispositivo usando el cliente público de Microsoft ("Microsoft Graph Command Line Tools"). Resultado: **"Se necesita la aprobación del administrador"**, sin botón de "Solicitar aprobación".
  → Educastur tiene **desactivado el consentimiento de usuario** para cualquier app, incluso las de Microsoft. Ninguna app externa (la nuestra tampoco) puede leer Teams sin que un administrador de Educastur la apruebe.

### 4.2 Opciones evaluadas

| Opción | Resultado | Motivo |
|---|---|---|
| Pedir aprobación a Educastur | ❌ Descartada | Proyecto personal; no la van a dar |
| Extensión del navegador | ❌ Descartada | Obliga a cada alumno a instalarla y no funciona en el móvil |
| Guardar la contraseña de Microsoft y simular el login | ❌ Descartada | Va contra las condiciones de uso de Educastur, choca con la verificación en dos pasos, Microsoft puede bloquear las cuentas y supone guardar contraseñas de menores |
| Usar la API interna de Teams con la sesión del alumno | ❌ Descartada | No es oficial, es frágil y va contra las condiciones de uso |
| Reenviar los correos de Teams a la web | ❌ Descartada | Microsoft 365 bloquea por defecto el reenvío automático a direcciones externas |
| Meter la web como app dentro de Teams | ❌ Descartada | También necesita aprobación del administrador |
| **Calendario de Outlook publicado (ICS)** | ⏸️ Aparcada | Ver §4.3 |
| **Power Automate** | ⏸️ Mejora futura | Ver §4.4 |
| **Añadir las tareas a mano** | ✅ Elegida para la v1 | Simple y fiable |

### 4.3 Calendario de Outlook (ICS)

- Teams puede añadir cada tarea al calendario de Outlook de los alumnos, pero lo decide **cada profesor** en la configuración de tareas de su clase ("Calendario: Solo alumnos / Alumnos y yo…"). Ahora mismo el calendario del alumno está **vacío**: ningún profesor lo tiene activado.
- El ajuste es **por clase**: afecta a todos los alumnos, no se puede activar solo para uno.
- El alumno **sí puede** publicar su calendario (Configuración → Calendario → Calendarios compartidos → Publicar → "Puede ver todos los detalles"). Eso genera un enlace ICS fijo (`https://outlook.office365.com/owa/calendar/…/calendar.ics`), que se configura **una sola vez**. El servidor puede consultarlo cuando quiera; cuánto tarda Outlook en reflejar los cambios no está medido.
- Lo que da: título y fecha. El enlace a cada tarea **no está confirmado** (habría que verlo con una tarea real). **No da** el estado de entrega.
- Motivo para aparcarla: depende de convencer a los 6 profesores y afecta a toda la clase.

### 4.4 Power Automate (posible mejora futura)

- La cuenta de Educastur **sí tiene acceso** a Power Automate. Como es de Microsoft, no necesita aprobación de apps externas.
- Las acciones gratuitas de Graph ("Send an HTTP request" de Office 365 Groups y similares) solo admiten los recursos `me, users, groups, sites, search, planner, teams, chats`. **No incluyen `education`**, así que no se puede llamar a `/education/me/assignments`. Sin probar: queda confirmarlo con una prueba real.
- Idea de diseño (sin probar): un flujo programado cada hora que recorra los equipos y canales, lea los mensajes con las **tarjetas de tarea** que publica la app de Tareas (título, fecha, botón "Ver tarea") y, si hay cambios, envíe el JSON **por correo** a una dirección de la web. La acción HTTP para llamar directamente a la web es de pago. La web lo recibiría con un servicio de correo entrante (por ejemplo, Cloudflare Email Routing + Worker) y validaría una clave secreta por alumno.
- Primer paso pendiente si se retoma: flujo manual con **Microsoft Teams → Obtener mensajes** en el canal General de una clase, y ver cómo vienen las tarjetas de tarea.
- Motivo para aparcarla: demasiada complejidad para la primera versión.

---

## 5. Plan de arquitectura

> ✅ **Confirmado** el 2 nov 2026. El montaje real está en [BACKEND.md](BACKEND.md).

El frontend actual es una SPA estática (React + Vite + TS) en S3 + CloudFront, **sin backend**. Propuesta para no tener que mantener un servidor:

```
Web (S3/CloudFront, como ahora)
   │  supabase-js: login + leer entregas
   ▼
Supabase
 ├─ Auth ............ sustituye el login/registro de mentira de la landing
 ├─ PostgreSQL + RLS  cada usuario solo ve sus filas
 ├─ Edge Functions (TypeScript)
 │    ├─ conectar-moodle   → detecta el método (§3.1), valida y guarda la conexión
 │    ├─ sincronizar       → las conexiones de un alumno ("Sincronizar ahora")
 │    └─ sincronizar-todo  → las de todos; solo la llama pg_cron, con un secreto de Vault
 └─ pg_cron ......... lanza `sincronizar-todo` cada 30 min
```

Equivalencias con Java: Edge Function ≈ un endpoint suelto de un controller; RLS ≈ un `WHERE user_id = ?` obligatorio que pone la base de datos; `pg_cron` ≈ `@Scheduled`.

Alternativas descartadas: Express en Node y Spring Boot (los dos obligan a mantener un servidor encendido) y Lambda + DynamoDB + Cognito (demasiada configuración para un primer backend).

### 5.1 Borrador del modelo de datos

```sql
-- Una fila por cada Moodle conectado
conexiones_moodle (
  id uuid pk, user_id uuid -> auth.users,
  nombre text, url text,
  metodo text check (metodo in ('token','sesion')),
  usuario text,
  token_cifrado text null,      -- método A
  password_cifrada text null,   -- solo método B
  ultimo_sync timestamptz, ultimo_error text
)

-- Entregas de todas las fuentes
entregas (
  id uuid pk, user_id uuid,
  origen text check (origen in ('moodle','teams-manual')),
  conexion_id uuid null, id_externo text null,
  curso text, asignatura_id text null,   -- id de src/data/asignaturas.json
  titulo text, fecha timestamptz, url text,
  hecha boolean default false, actualizado timestamptz,
  unique (user_id, origen, id_externo)
)

-- Qué curso de Moodle corresponde a qué asignatura (para el color y el nombre)
cursos_asignaturas (conexion_id uuid, curso_moodle_id int, asignatura_id text)
```

### 5.2 Encaje con el frontend actual

- Cada fila de `entregas` se convierte en un `Evento` (`src/types/index.ts`) con `tipo: 'entrega'` y `url`. El campo `url` ya estaba previsto como "futuro backend". La Agenda, el Calendario y `tareasDelDia` las tratarían como ya hacen con las entregas del JSON.
- Las tareas de Teams añadidas a mano también van a `entregas`. Al implementarlo quedó como `origen = 'manual'` + `plataforma = 'Teams'`, para que el formulario sirva para cualquier plataforma ([BACKEND.md §12.3](BACKEND.md#123-tareas-de-teams-a-mano)).
- "Hecha": hoy está en `localStorage` (`useHechas`). Con backend puede pasar a la columna `hecha` para que se sincronice entre dispositivos.
- El login y el registro de la landing (`Acceso.tsx`, `Hero.tsx`) pasarían a usar Supabase Auth.

### 5.3 Seguridad y privacidad

- **Método A:** guardar solo el token; la contraseña se usa una vez y se descarta.
- **Método B:** la contraseña tiene que guardarse **cifrada** (con Supabase Vault o con una clave en los secretos de las Edge Functions). La alternativa es no guardarla y pedírsela al alumno cuando caduque la sesión.
- Nunca escribir en los logs contraseñas, tokens ni cookies.
- Los usuarios son **menores**: con el RGPD/LOPDGDD, los menores de 14 años necesitan consentimiento de sus padres. Hace falta una política de privacidad clara.
- No subir secretos al repo (es público).

---

## 6. Scripts de prueba (PowerShell, Windows, sin instalar nada)

Se ejecutan con `powershell -ExecutionPolicy Bypass -File .\<script>.ps1 [url]`. Piden las credenciales por teclado y no guardan nada. Conviene guardarlos en `scripts/pruebas-integraciones/`.

| Script | Qué hace |
|---|---|
| `diagnostico_api.ps1` | Diagnóstico completo de un Moodle: config pública, token con datos falsos y reales, REST, login web y vía interna |
| `probar_moodle.ps1` | Método A: token, info, cursos, Línea de tiempo y `mod_assign_get_assignments` |
| `probar_login.ps1` | Login web normal y lectura del perfil |
| `mis_tareas.ps1` | **La lógica que irá al backend:** varios Moodle, elige el método solo (A o B) y junta las entregas pendientes ordenadas por fecha, con su enlace |
| `probar_teams.ps1` | Login a Microsoft Graph con código de dispositivo y lectura de `/me`, equipos, clases y tareas (bloqueado por Educastur) |
| `probar_calendario.ps1` | Lee un enlace ICS de Outlook y muestra los eventos y sus enlaces |

Detalle de PowerShell 5.1: al comprobar errores, `$respuesta.exception` sobre una **lista** da un falso positivo. Hay que comprobar que la respuesta es un objeto y no una lista antes de mirar la propiedad.

---

## 7. Próximos pasos

Decisiones tomadas (2 nov 2026): arquitectura del §5 confirmada; modo **delegar**; orden **Auth + tareas a mano primero**; método B con **contraseña cifrada** (se implementará al final).

1. [x] Confirmar la arquitectura (§5) y el modo de trabajo.
2. [x] Crear el proyecto de Supabase y la tabla `entregas` con RLS (`supabase/migrations/`).
3. [x] Pasar el login y el registro de la landing a Supabase Auth.
4. [x] Formulario para añadir tareas de Teams a mano (título, fecha, asignatura y enlace opcional) en Ajustes → Sincronizar; las filas de `entregas` se convierten en `Evento` en el frontend (`useEntregasCuenta`).
5. [x] Tabla `conexiones_moodle` (token cifrado con AES-GCM en las Edge Functions) + Edge Function `conectar-moodle`, método A.
6. [x] Edge Function `sincronizar` (botón "Sincronizar ahora") y `pg_cron` cada 30 minutos con `sincronizar-todo` (Mis Aulas, como mucho cada 2 horas).
7. [x] Ajustes → Sincronizar: conectar, sincronizar y desconectar Moodle. La asignatura de cada curso se adivina por su nombre y se puede corregir en "Cursos y asignaturas".
8. [x] Método B (aulas2.site): inicio de sesión web en cada sincronización, con la contraseña cifrada (AES-GCM, la misma llave que los tokens). Comprobado sin credenciales que un login fallido también trae `sesskey`: el éxito se detecta por el enlace de `login/logout.php`.
9. [ ] Más adelante: volver a mirar Teams con Power Automate (§4.4) o con el calendario (§4.3).

---

## 8. Cómo se llegó a estas conclusiones

La investigación siguió siempre el mismo método: **primero lo oficial, después lo que hace la propia web, y descartar lo que vaya contra las normas o dependa de terceros.** Todo se probó con scripts de PowerShell que piden las credenciales por teclado y no guardan nada (§6).

### 8.1 Moodle: averiguar qué permite cada sitio, sin credenciales primero
1. **Preguntar al sitio cómo está configurado**, sin iniciar sesión: `tool_mobile_get_public_config` dice si los servicios web están activos (`enablewebservices`) y qué tipo de login usa. Es la misma petición que hace la app oficial de Moodle al añadir un sitio.
2. **Pedir un token con datos falsos.** La respuesta distingue tres casos sin arriesgar ninguna cuenta:
   - `invalidlogin`: la API está encendida, pero esas credenciales no valen.
   - `enablewsdescription`: la API está apagada **en todo el sitio**.
   - `invalidtoken` en `server.php` con un token inventado: la API REST responde.
3. **Con la cuenta real,** comprobar qué funciones están permitidas (`core_webservice_get_site_info`) y cuál da lo que buscamos. La **Línea de tiempo** (`core_calendar_get_action_events_by_timesort`) resultó la mejor fuente: solo trae lo pendiente, así que lo entregado desaparece solo.
4. **aulas2.site tenía la API apagada.** En lugar de pedir al administrador que la active, se miró qué hace la propia web para pintar la Línea de tiempo: llama a `lib/ajax/service.php` con la cookie de sesión y el `sesskey` de la página. Esa vía funciona con la API apagada y da **el mismo resultado**. Es más frágil y necesita la contraseña, así que queda aislada como **método B**.

**Conclusión:** un mismo algoritmo para los dos Moodle. Se detecta el método (§3.1), se lee la Línea de tiempo y se juntan los resultados. Es lo que hace `mis_tareas.ps1` y lo que se portará a la Edge Function.

### 8.2 Teams: la vía oficial, y por qué no hay alternativa aceptable
1. **Microsoft Graph tiene justo lo que hace falta** (`/education/me/assignments`). Se probó con el cliente público de Microsoft y el login por código de dispositivo, sin registrar ninguna app propia.
2. **Respuesta: "Se necesita la aprobación del administrador", sin opción de solicitarla.** Las cuentas son de la organización de **Educastur**, que tiene desactivado el consentimiento de usuario para cualquier aplicación, incluso las de Microsoft.
3. **El bloqueo está antes de cualquier backend.** Para leer Teams hace falta un token de Graph del alumno, y ese token no se puede conseguir. Da igual quién haga la petición: Supabase, Spring o un script local. Cambiar de backend no lo soluciona.
4. **Se evaluaron una a una las alternativas** (tabla §4.2). Se descartaron las que van contra las condiciones de uso o exigen guardar contraseñas de Microsoft de menores (simular el login, la API interna de Teams), las que no funcionan para todos (una extensión del navegador, que no existe en el móvil) y las que chocan con otra política (el reenvío de correo a direcciones externas está bloqueado).
5. **Quedan dos vías legítimas, aparcadas:**
   - el **calendario ICS** de Outlook, que depende de que cada profesor active que las tareas vayan al calendario;
   - **Power Automate**, que corre dentro de Microsoft y no necesita aprobar apps externas, pero sus acciones gratuitas no incluyen `education` y el diseño aún no está probado.

**Conclusión:** para la primera versión, **Teams a mano**. La tabla `entregas` tiene una columna `origen` precisamente para que, si un día funciona el ICS o Power Automate, solo cambie *cómo entran* los datos y no dónde se guardan ni cómo se muestran.

### 8.3 Del "cómo leer los datos" al "dónde vive el código"
Leer Moodle necesita **guardar credenciales** (tokens, y en el método B la contraseña cifrada), **ejecutar código fuera del navegador** (por CORS y porque las credenciales no pueden estar en el JavaScript) y **repetirlo cada cierto tiempo**. Eso decidió la arquitectura: un backend sin servidor propio, con base de datos, funciones y tareas programadas. Por eso Supabase (§5). La comparación con Spring Boot, Express y Lambda está en [BACKEND.md §3](BACKEND.md#3-por-qué-supabase-y-no-otra-cosa).

---

## 9. Qué hay hecho ya

**Decisiones (2 nov 2026):**
- Arquitectura del §5 confirmada.
- Modo de trabajo **delegar**.
- Orden: **primero Auth y las tareas a mano**, luego Moodle. Así cada paso funciona y se puede publicar por separado, sin depender de otras webs.
- Método B con la **contraseña cifrada**, al final del todo.

| Hecho | Dónde |
|---|---|
| Proyecto de Supabase `agenda-monte-naranco`: tablas cerradas por defecto y RLS automático | [BACKEND.md §4.1](BACKEND.md#41-el-proyecto) |
| CLI de Supabase en el proyecto y migraciones versionadas en `supabase/migrations/` | [BACKEND.md §4.2](BACKEND.md#42-la-cli-y-las-migraciones) |
| Tabla `entregas` con RLS, trigger de `actualizado` e índice | [BACKEND.md §5](BACKEND.md#5-la-base-de-datos-tabla-entregas) |
| Login y registro reales con Supabase Auth (sin confirmación de correo) | [BACKEND.md §7](BACKEND.md#7-autenticación-registro-e-inicio-de-sesión) |
| "Tu cuenta" en Ajustes, con cerrar sesión | [BACKEND.md §8](BACKEND.md#8-cómo-lo-usa-el-frontend) |
| Pruebas de seguridad: sin sesión no se lee ni se escribe | [BACKEND.md §9](BACKEND.md#9-pruebas-realizadas) |

| Moodle del centro (método A) y Mis Aulas (método B), con abrir cada tarea con la sesión iniciada | [BACKEND.md §11](BACKEND.md#11-lo-añadido-después-2-nov-2026) y [§12](BACKEND.md#12-sincronización-automática-cursos-y-tareas-a-mano-3-nov-2026) |
| Sincronización automática cada 30 minutos, corrección de asignaturas y tareas de Teams a mano | [BACKEND.md §12](BACKEND.md#12-sincronización-automática-cursos-y-tareas-a-mano-3-nov-2026) |

**Siguiente:** volver a mirar Teams automático (paso 9 del §7) cuando haya ocasión de probar Power Automate o algún profesor active el calendario.

