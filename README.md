# Monte Naranco Agenda Digital

> Proyecto personal de aprendizaje de un alumno de DAW del IES Monte Naranco. **No es una herramienta oficial del centro.**

**🌐 En línea: [agenda.alvaro.cloud](https://agenda.alvaro.cloud)**

Un panel de control para el alumnado que junta en **una sola pantalla** el horario de clase, el calendario de exámenes y entregas, el calendario escolar y una agenda diaria que propone qué hacer hoy. Todo ello con una identidad visual propia basada en el logo del instituto: puntos, tramados, un logo 3D interactivo, una lupa de cristal sobre el horario y sonidos de interfaz.

![Panel principal en escritorio](docs/img/panel.png)

---

## Índice

- [Qué hace](#qué-hace)
- [Capturas](#capturas)
- [Stack](#stack)
- [Cómo arrancarlo](#cómo-arrancarlo)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Datos](#datos)
- [Accesibilidad y rendimiento](#accesibilidad-y-rendimiento)
- [Estado actual y limitaciones](#estado-actual-y-limitaciones)
- [Hoja de ruta](#hoja-de-ruta)
- [Documentación detallada](#documentación-detallada)
- [Créditos](#créditos)

---

## Qué hace

### Panel principal (`#/`)
Solo con sesión iniciada: sin ella, la web te lleva al login.

En escritorio el panel ocupa **exactamente la pantalla, sin scroll**. En móvil las celdas se apilan una debajo de otra. Se reparte en cinco celdas:

| Celda | Qué muestra |
|---|---|
| **Cabecera** | A la izquierda, la cuenta atrás hasta la próxima prueba o entrega; a la derecha, hasta la próxima clase. El nombre de la asignatura va en su color. Lleva un efecto de cristal esmerilado. En móvil, las dos cuentas atrás pasan a una segunda fila. |
| **Horario** | La semana de clases. Una **lupa de cristal (WebGL)** marca el día elegido; se mueve con la rueda del ratón, con las flechas o pulsando el nombre del día, y al pasar del viernes salta de semana. Al pasar el ratón por una asignatura se iluminan todas sus horas; un clic la "apaga" de forma temporal. En móvil, pestañas por día y cada clase mide lo que dura (una de 2 horas ocupa el doble), con huecos "Libre" donde no hay clase. |
| **Calendario** | Dos modos: **Exámenes** (mes con marcas de color + lista agrupada por semanas, con filtros) y **Escolar** (festivos, días no lectivos y vacaciones del curso 2026-2027). Pulsar un día del mes salta a su prueba en la lista. En móvil la lista tiene una altura máxima y scroll propio, para no alargar la página. |
| **Logo 3D** | El logo del IES dibujado con puntos como un objeto 3D que gira hacia el ratón (en el móvil, al inclinar el teléfono, con el giroscopio). Sus partes son botones: el **tejado** lleva a [alvaro.cloud](https://alvaro.cloud) (*Origen*, la web madre), la **puerta central** a *Login* (iniciar sesión), la **puerta derecha** a *Ajustes* y la **puerta izquierda** a la web del instituto. |
| **Agenda** | Las tareas del día elegido en la lupa, deducidas de las pruebas y del horario ("Termina…", "Repasa…", "Reparte el repaso"…). Se pueden marcar como hechas. Aparece con un efecto de escritura después de un breve estado de "pensando". |

### Ajustes (`#/ajustes`)
- **Tu cuenta:** con quién has iniciado sesión y "Cerrar sesión" (o "Iniciar sesión" si no hay sesión).
- **Tu grupo:** ciclo, curso y grupo con carruseles. Solo se pueden elegir los grupos que existen en el centro: **DAW 1º A y B, DAM 1º B, DAW 2º A y DAM 2º B** (A = mañana, B = tarde). Cada uno tiene sus módulos (en 2º, los del Real Decreto 405/2023 más Itinerario II y Proyecto). De momento solo hay horario y exámenes de **DAW 1º A**.
- **Se guarda en tu cuenta:** con sesión iniciada, el grupo, los módulos y el sonido se sincronizan entre dispositivos (tabla `perfiles`).
- **Tus módulos:** marcar los módulos que no cursas (convalidados). Se guardan en el navegador y desaparecen de toda la web.
- **Sonido:** activar o silenciar y volumen.
- **Sincronizar:** botones de muestra para la futura sincronización con Microsoft 365.

La **primera vez**, justo después de crear la cuenta, Ajustes se configura **paso a paso**: cada sección aparece con un fade-in cuando eliges algo en la anterior (o pulsas "Continuar"), y al final aparece "Ir al panel". Al pulsarlo, el panel muestra un **tutorial de 5 pasos** (unos 15 segundos): un recuadro ilumina cada sección (horario, agenda, calendario, logo y cabecera), el resto se oscurece y una tarjeta explica para qué sirve. Se avanza con un clic, → o Enter, y Esc lo salta. Solo sale esa primera vez.

### Landing de acceso (`#/entrar`, `#/crear`)
Una escena única animada con el scroll: unas fichas de distintas plataformas (Teams, Educastur, aula virtual, Excel…) llegan desordenadas, encajan en una lista ("Todas tus tareas. Un mismo sitio.") y la lista deja paso a la tarjeta de inicio de sesión o registro. **Las cuentas son reales** (Supabase Auth): *Crear cuenta* registra al alumno y lo lleva a la configuración guiada de Ajustes; *Iniciar sesión* lo lleva al panel. Los errores salen en español ("Correo o contraseña incorrectos"…). Con la sesión ya iniciada, la tarjeta muestra quién eres y lleva al panel. La landing no tiene barra de navegación: la tarjeta es la única salida.

### Transversal
- **Transición entre páginas** con una "cortina" de píxeles que nace del punto pulsado.
- **Fondo de puntos animado** en toda la web, con tramado ordenado (dithering de Bayer).
- **Sonidos de interfaz** discretos (muestras de SND y sonidos sintetizados con la Web Audio API).
- **Simulación de fecha** para pruebas: `?ahora=2026-11-12T09:30` en la URL.

---

## Capturas

| Landing: las fichas encajan | Landing: acceso |
|---|---|
| ![Landing, fichas encajando](docs/img/landing-lista.png) | ![Landing, tarjeta de acceso](docs/img/landing-acceso.png) |

| Ajustes | Móvil: cabecera, logo y agenda | Móvil: horario |
|---|---|---|
| ![Página de ajustes](docs/img/ajustes.png) | <img src="docs/img/movil.png" alt="Panel en móvil" width="240"> | <img src="docs/img/movil-horario.png" alt="Horario en móvil, cada clase con la altura de su duración" width="240"> |

| Tutorial del panel (primera visita) |
|---|
| ![Tutorial: el recuadro ilumina el horario y el resto se oscurece](docs/img/tutorial.png) |

> Las capturas se han hecho con `?ahora=2026-11-12T09:30` (jueves, en mitad de una clase).

---

## Stack

| Pieza | Versión | Para qué |
|---|---|---|
| [React](https://react.dev) | 19 | Interfaz por componentes |
| [TypeScript](https://www.typescriptlang.org) | 6 | Tipos estáticos |
| [Vite](https://vite.dev) | 8 | Servidor de desarrollo y build |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Estilos con tokens de diseño (`@theme`) |
| [Motion](https://motion.dev) | 14 | Animaciones de interfaz (entradas, cambios de estado, arrastre) |
| [GSAP + ScrollTrigger](https://gsap.com) | 3.15 | La escena de la landing ligada al scroll |
| Canvas 2D y WebGL | — | Logo 3D, fondo de puntos, cortina de píxeles y lupa de cristal (sin librerías) |
| Web Audio API | — | Motor de sonido (sin librerías) |
| [Supabase](https://supabase.com) (`supabase-js` 2, CLI 3) | — | Backend: Auth, Postgres con RLS, migraciones |
| ESLint | 10 | Calidad del código |

El **backend** es [Supabase](https://supabase.com): cuentas de usuario y una base de datos Postgres protegida con RLS, sin servidor propio (ver [docs/BACKEND.md](docs/BACKEND.md)). El horario y el calendario de exámenes siguen saliendo de archivos JSON del proyecto, y las preferencias se guardan en `localStorage`.

---

## Cómo arrancarlo

Requisitos: **Node.js 20.19+ o 22.12+** (lo exige Vite 8) y npm.

```bash
npm install        # instala las dependencias (como "mvn install")
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # comprueba tipos y genera la versión de producción en dist/
npm run preview    # sirve dist/ para probar la versión de producción
npm run lint       # revisa el código con ESLint
```

> Ojo: el comando es `npm run dev`, no `npm vite`. `npm` solo entiende sus propios comandos; los del proyecto se lanzan con `npm run <script>`.

### Probar otros momentos
La web depende mucho de la fecha y la hora. Para ver cómo se comporta en otro momento sin esperar:

```
http://localhost:5173/?ahora=2026-11-12T09:30   → jueves, en clase
http://localhost:5173/?ahora=2026-11-04T10:00   → día no lectivo (puente)
http://localhost:5173/?ahora=2026-11-14T12:00   → sábado
```

El reloj simulado avanza normalmente desde ese punto.

---

## Despliegue

La web está publicada en **https://agenda.alvaro.cloud**, sin servidores y pagando solo por uso:

```
Usuario ──► Cloudflare (DNS) ──► CloudFront (HTTPS, caché, Brotli) ──► S3 (bucket privado)
```

| Pieza | Para qué |
|---|---|
| **S3** (`eu-north-1`) | Guarda los archivos de `dist/`. Es privado: solo CloudFront puede leerlo (*Origin Access Control*). |
| **CloudFront** | Sirve la web por HTTPS desde la caché más cercana, comprime y redirige `http` → `https`. |
| **ACM** (`us-east-1`) | Certificado SSL gratuito para el subdominio, renovado automáticamente. |
| **Cloudflare** | DNS del dominio: `agenda` → la distribución de CloudFront (en modo *DNS only*). |

Para publicar una versión nueva (con la CLI de AWS configurada):

```bash
npm run deploy
```

El script [`scripts/desplegar.mjs`](scripts/desplegar.mjs) compila, sube los archivos con su tipo y su caché y vacía la caché de CloudFront (`/*`):
- **`assets/`:** se cachean un año, porque su nombre lleva un hash del contenido.
- **Sonidos e iconos:** se cachean un día.
- **`index.html`:** sin caché, y se sube el último.

---

## Estructura del proyecto

```
src/
├── App.tsx                 # Estado global, rutas y composición del panel
├── main.tsx                # Punto de entrada (fuentes + React)
├── index.css               # Tokens de diseño (colores, fuentes, curvas) y utilidades propias
├── components/
│   ├── sections/           # Las celdas y páginas: Cabecera, HorarioSemanal, Calendario, Agenda, PanelLogo, Ajustes…
│   ├── landing/            # La landing: Landing, Hero (escena GSAP) y Acceso (tarjeta de cuenta)
│   └── ui/                 # Piezas reutilizables: Panel, Logo3D, LupaCristal, FondoPuntos, CortinaPixel, Carrusel, Escritura, Odometro…
├── hooks/                  # useAhora, useRuta, useModulos, useGrupo, useHechas, useAviso, useSonido
├── lib/                    # Lógica sin React: fechas, horario, eventos, calendario escolar, tareas, sonido, cristal (WebGL)…
├── data/                   # JSON: asignaturas, calendario escolar y datos de cada grupo
└── types/                  # Tipos compartidos (Clase, Horario, Evento…)
supabase/migrations/        # El esquema de la base de datos, en SQL versionado
docs/                       # Esta documentación y sus capturas
scripts/desplegar.mjs       # npm run deploy: compila y publica en S3 + CloudFront
public/sonidos/             # Kits de sonido (audio sprites .ogg/.m4a + mapa JSON)
```

La arquitectura completa, el flujo de datos y cada técnica están explicados en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

---

## Datos

| Archivo | Contenido |
|---|---|
| `src/data/asignaturas.json` | Los 10 módulos de DAW 1º: id, nombre corto (máx. ~3 palabras) y nombre oficial completo cuando es más largo. |
| `src/data/grupos/daw1a/horario.json` | Las clases de la semana (día, asignatura, inicio, fin) y el recreo. |
| `src/data/grupos/daw1a/examenes.json` | Exámenes, entregas y evaluaciones con fecha, asignatura y detalle. |
| `src/data/calendario-escolar.json` | Curso 2026-2027: inicio y fin de las clases, festivos, días no lectivos y vacaciones (sacado del calendario escolar oficial del Principado de Asturias). |

Para añadir otro grupo: crear `src/data/grupos/<grupo>/` con su `horario.json` y `examenes.json` y registrarlo en `src/lib/grupos.ts`. Es el único punto de acceso a los datos, pensado para que el día que haya backend solo cambie esa función.

---

## Accesibilidad y rendimiento

- **Movimiento reducido:** con `prefers-reduced-motion` no hay animaciones de entrada, la landing se muestra como página normal, el logo queda quieto y la Agenda aparece sin efecto de escritura.
- **Teclado:** el horario se recorre con ← →, los carruseles también, y todas las zonas del logo son botones reales con su nombre.
- **Lectores de pantalla:** los textos animados (cuenta atrás, escritura) tienen su versión estática en `sr-only`; la lupa y los lienzos decorativos están ocultos para ellos.
- **Móvil primero:** en móvil las celdas se apilan y el panel hace scroll; en escritorio cabe en una pantalla.
- **Rendimiento:** el fondo de puntos se pinta a 30 fps con ondas precalculadas por filas y columnas; el logo 3D se detiene cuando sale de la pantalla (`IntersectionObserver`) y todas las animaciones se pausan con la pestaña en segundo plano; Ajustes y la landing se cargan aparte (*code splitting*) y se precargan cuando el navegador está libre. El JavaScript inicial pesa **~144 kB comprimido**.

---

## Estado actual y limitaciones

Es una **versión 1** con un backend recién estrenado. Lo que conviene saber:

- **Solo hay datos de DAW 1º A.** Los demás grupos muestran un aviso de "sin datos".
- **Moodle del centro conectado:** desde Ajustes → Sincronizar, las entregas pendientes de aula.iesmontenaranco.com aparecen en la Agenda y el Calendario (de momento con el botón "Sincronizar ahora"; la sincronización automática llegará después). Mis Aulas y las tareas de Teams a mano, más adelante.
- **Todo en la cuenta:** ajustes, tareas hechas y entregas se sincronizan entre dispositivos. Se puede **borrar la cuenta** con todos sus datos desde Ajustes.
- **Política de privacidad** publicada en `#/privacidad` (ver [docs/PRIVACIDAD.md](docs/PRIVACIDAD.md)).
- **Datos de prueba:** `examenes.json` incluye entregas **inventadas** (5, 6, 9, 10, 12, 17 y 25 de noviembre; 1 y 3 de diciembre) para probar la Agenda. Hay que quitarlas cuando lleguen las fechas reales.
- **Sin sonido hasta el primer clic:** es la política de autoplay de los navegadores; el audio arranca con el primer clic o tecla.
- **Pendiente conocido:** los módulos apagados se guardan con una clave común a todos los grupos.

---

## Hoja de ruta

### Ahora: las entregas de las plataformas del instituto
El objetivo es que cada alumno vea **todas sus entregas juntas**, vengan de donde vengan. Tras investigar cada plataforma ([docs/INTEGRACIONES.md](docs/INTEGRACIONES.md)):

| Plataforma | Cómo se integra |
|---|---|
| Moodle del centro (aula.iesmontenaranco.com) | API oficial de Moodle, con un token |
| Moodle "Mis Aulas" (aulas2.site) | API apagada → la misma vía interna que usa su web, con la contraseña cifrada |
| Microsoft Teams (Educastur) | No se puede automatizar (Educastur bloquea las apps externas) → **tareas añadidas a mano** |

Hecho: backend en Supabase, tabla `entregas` con RLS y login y registro reales.

Pendiente, en este orden:
1. Formulario para añadir tareas a mano.
2. Conectar Moodle (método A).
3. Sincronización cada 30 minutos.
4. Método B.

### Otras ideas
- Datos de todos los grupos.
- Teams automático con el calendario ICS o Power Automate (aparcado, ver [INTEGRACIONES.md §4](docs/INTEGRACIONES.md#4-teams-qué-se-ha-probado-y-por-qué-no-se-puede-automatizar)).
- Política de privacidad antes de abrirlo a más alumnos.
- Despliegue automático en cada `push` (GitHub Actions → S3).
- Tests automáticos (las comprobaciones de este proyecto se hicieron con scripts de Puppeteer fuera del repositorio).

---

## Documentación detallada

- **[docs/PROCESO.md](docs/PROCESO.md):** cómo se hizo, paso a paso: las fases, las decisiones de diseño, los mayores retos técnicos y lo aprendido.
- **[docs/BACKEND.md](docs/BACKEND.md):** el backend con Supabase: por qué, cómo se montó, la tabla `entregas`, la seguridad (claves, permisos, RLS), el login y las pruebas.
- **[docs/PRIVACIDAD.md](docs/PRIVACIDAD.md):** la política de privacidad (la misma que la página `#/privacidad`).
- **[docs/INTEGRACIONES.md](docs/INTEGRACIONES.md):** la investigación para leer las entregas de Moodle y Teams, cómo se llegó a cada conclusión y el plan.
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md):** cómo está hecho por dentro: flujo de datos, cada módulo y cada técnica (z-buffer, shaders, dithering, ScrollTrigger, Web Audio…).

---

## Créditos

- **Logo** del IES Monte Naranco, usado como base del diseño de este proyecto de alumno.
- **Sonidos de interfaz:** [SND](https://snd.dev) de Dentsu Lab Tokyo (kits 01 "Sine" y 03 "Industrial"). El viento, la canica, la marimba y el timbre se sintetizan en el propio proyecto.
- **Tipografías:** Montserrat (la que usa la web del instituto), Inter y JetBrains Mono, vía [Fontsource](https://fontsource.org).
- **Lupa de cristal:** basada en un shader de referencia de tipo *liquid glass*, adaptado para doblar el HTML del horario.
- **Desarrollo:** hecho por un alumno de DAW como proyecto de aprendizaje, programando con ayuda de IA ([Claude Code](https://claude.com/claude-code)). El objetivo era aprender entendiendo cada paso, no solo terminar la web; el proceso está contado en [docs/PROCESO.md](docs/PROCESO.md).
