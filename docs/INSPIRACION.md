# Inspiración artística

Antes de escribir código reuní **cuatro referencias visuales** (vídeos de interfaces y piezas de *motion design*) y un componente de referencia. No las quería copiar: quería extraer de cada una **una idea concreta** y adaptarla a la identidad del instituto. Las capturas están en [`referencias/`](../referencias/), junto con mis notas originales ([referencias/INSPIRACION.md](../referencias/INSPIRACION.md)).

Este documento cuenta qué tomé de cada referencia, en qué se convirtió y qué descarté.

---

## Resumen

| Referencia | La idea | En qué se convirtió |
|---|---|---|
| 1. Peces de puntos | Formas hechas de puntos, un solo color de acento | El **fondo de puntos** y el **logo 3D** en halftone |
| 2. Faro de caracteres | Tipografía monoespaciada, un "foco" que destaca algo | Las **horas y cuentas atrás en monoespaciada** (el haz de luz se descartó) |
| 3. Cubo "pensando" | Una interfaz que enseña que está pensando | El **estado "pensando" y la escritura** de la Agenda |
| 4. Flor ASCII | Landing clara, titular grande y ASCII de decoración | La **landing clara** con titular grande |
| Componente *ASCII wake* | Un rastro del ratón que convierte puntos en caracteres | La **estela del ratón** sobre el logo 3D |

---

## 1. Peces de puntos

<img src="../referencias/inspiracion1-peces-1.jpg" alt="Peces dibujados con una cuadrícula de puntos ámbar sobre negro" width="420">

**Qué es:** peces dorados dibujados con una **cuadrícula de puntos** (halftone) sobre fondo negro, que nadan dejando partículas sueltas.

**Qué tomé:** que una forma puede construirse **solo con puntos**, y que un único color de acento sobre fondo oscuro basta para dar identidad.

**En qué se convirtió:**
- **El logo 3D:** el logo del instituto, reconstruido punto a punto como un objeto 3D. La luz de cada cara decide cuántos puntos se dibujan, con un tramado ordenado (matriz de Bayer).
- **El fondo de puntos** que recorre toda la web, con ondas suaves.
- **El color de acento:** en lugar del ámbar, los colores del propio logo (arena, coral y verde), cada uno con un significado fijo.

---

## 2. Faro de caracteres

<img src="../referencias/inspiracion2-faro-1.jpg" alt="Faro dibujado con caracteres lila y una tabla monoespaciada" width="420">

**Qué es:** un faro dibujado con caracteres y una tabla de datos en **tipografía monoespaciada**. Un **haz de luz** gira y, donde pasa, el texto se "rompe" en caracteres aleatorios y se recompone.

**Qué tomé:** la estética de terminal para los **datos** (horas, códigos, tiempos) y la idea de un **foco** que destaca lo importante.

**En qué se convirtió:**
- **JetBrains Mono** para horas, cifras y cuentas atrás. Además de la estética, tiene una razón práctica: los números no "bailan" al cambiar.
- **El foco en una asignatura:** al pulsarla, se queda iluminada y el resto se atenúa.

**Qué descarté:**
- **El haz de luz barriendo la próxima prueba:** era demasiado efecto para un dato.
- **El texto que se "rompe" (*scramble*):** llegué a usarlo en la Agenda, pero parecía "hacker". Lo sustituí por un efecto de escritura (ver la referencia 3).

---

## 3. Cubo "pensando"

<img src="../referencias/inspiracion3-cubo-pensando-1.jpg" alt="Interfaz de chat con un objeto de puntos y un bloque 'Thinking' con pasos" width="420">

**Qué es:** una interfaz clara tipo chat. A la izquierda, un objeto de puntos que se transforma; a la derecha, un bloque **"Thinking… 3.1s… 9.0s"** con pasos que aparecen uno a uno, y al final la respuesta escribiéndose.

**Qué tomé:** que **la espera puede explicarse en vez de esconderse.** Una interfaz que enseña que está "pensando" se siente más viva que un *spinner*.

**En qué se convirtió:** **la Agenda.** Al cambiar de día aparece un breve estado de "pensando" y después las tareas se **escriben**.
- Tiene también una razón técnica: no se monta ninguna tarea hasta que te quedas un momento en un día. Pasando días rápido, el coste es prácticamente cero.
- El efecto de escritura se reescribió una vez por rendimiento: la primera versión creaba un elemento por letra y daba tirones ([PROCESO.md §3.3](PROCESO.md#33-los-tirones-al-cambiar-de-día)).

---

## 4. Flor ASCII

<img src="../referencias/inspiracion4-flor-ascii-1.jpg" alt="Landing clara con titular grande y flores en ASCII gris" width="420">

**Qué es:** una landing **clara**, con un titular grande en sans y un campo tipo chat con sombra suave. Alrededor flotan flores dibujadas en **ASCII gris** que giran.

**Qué tomé:** el contraste entre una página limpia y luminosa y una decoración hecha con caracteres.

**En qué se convirtió:**
- **La landing clara**, con un tema propio ("papel") que la distingue del panel oscuro. Lleva un titular grande en Montserrat ("Todas tus tareas. Un mismo sitio.") y la tarjeta de acceso como único elemento interactivo.
- **El ASCII** acabó en el logo 3D, en lugar de como decoración suelta (ver el componente siguiente).

---

## Componente de referencia: *ASCII wake*

**Qué es:** un componente de [bencho.dev](https://bencho.dev). Una forma en halftone de puntos donde el ratón deja un **rastro**: bajo el cursor, los puntos se convierten en caracteres cada vez más densos (`. : - = + * # % @`) y, al alejarse, se "enfrían" y vuelven a ser puntos.

**Qué tomé:** la **técnica**, no el código. Una rejilla de valores de "calor" que el ratón calienta y que se enfría en cada fotograma, y una rampa que convierte el calor en caracteres.

**En qué se convirtió:** **la estela del ratón sobre el logo 3D.** Fue lo que más iteraciones necesitó: pasó tres veces por "demasiado intensa". El ajuste final fue poner el calor del cursor **justo por encima** del umbral que convierte un punto en carácter, de modo que solo el centro de la mancha lo supera y el rastro apenas se ve ([PROCESO.md §3.1](PROCESO.md#31-un-motor-3d-a-mano-para-el-logo)).

---

## Lo que aprendí de este proceso

- **Una referencia vale por la idea que extraes, no por lo que copias.** Cada vídeo aportó una sola cosa concreta.
- **El efecto tiene que servir al dato.** Lo que solo decoraba (el haz del faro, el *scramble*) acabó fuera.
- **La identidad manda sobre la referencia.** Las técnicas vinieron de fuera; los colores, la forma (el logo) y la tipografía de los títulos vinieron del instituto.
