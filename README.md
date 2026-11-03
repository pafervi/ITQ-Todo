# LatticeTodo

Planificador personal y cuaderno de laboratorio para investigación en
catálisis computacional. Semana en una pantalla, proyectos con contexto
científico, ninguna conexión a ningún servidor: toda la información se
queda en tu ordenador.

![Vista semanal con proyectos de investigación](docs/screenshots/01-hero.png)

---

## Instalación

Descarga el instalador para tu sistema desde la página de releases:

**[Descargar la última versión →](https://github.com/pafervi/ITQ-Todo/releases/latest)**

En esa página verás varios ficheros. Elige el que corresponda a tu sistema:

### Windows

Baja `LatticeTodo Setup <versión>.exe` y haz doble click.

> La primera vez Windows mostrará "Windows protegió el equipo". Pulsa
> **Más información → Ejecutar de todas formas**. Es porque la app no está
> firmada con un certificado corporativo, no porque haya nada raro.

Si prefieres la versión portable (no instala nada, se abre desde el fichero),
baja `LatticeTodo <versión>.exe` en lugar del Setup.

### Linux (Ubuntu / Debian / derivados)

Baja `latticetodo_<versión>_amd64.deb` y abre un terminal donde esté el fichero:

```bash
sudo apt install ./latticetodo_<versión>_amd64.deb
```

Aparecerá en el menú de aplicaciones como "LatticeTodo".

### Linux (otras distros, portable)

Baja `LatticeTodo-<versión>.AppImage`, dale permiso de ejecución y lánzala:

```bash
chmod +x LatticeTodo-*.AppImage
./LatticeTodo-*.AppImage
```

### macOS

Baja `LatticeTodo-<versión>.dmg`, ábrelo y arrastra la app a la carpeta
Aplicaciones.

> La primera vez macOS dirá "no se puede abrir porque el desarrollador no
> está identificado". Haz click derecho sobre la app en Aplicaciones y
> elige **Abrir → Abrir**. Solo pasa la primera vez.

---

## Primeros pasos

Al abrir por primera vez, la app crea una base de datos vacía en tu
ordenador. Los datos nunca salen de aquí; si cambias de equipo tienes que
**exportar y re-importar** desde el menú de configuración.

En el menú de configuración encontrarás también:

- **Idioma**: inglés, castellano o catalán.
- **Tema**: claro u oscuro.
- **Copia de seguridad diaria**: elige una carpeta sincronizada con la
  nube (OneDrive, Google Drive, Dropbox) y la app guardará una copia
  cada día.

Dentro de la app, pulsa **?** en cualquier momento para ver los atajos de
teclado y abrir la guía de funciones.

---

## Qué puedes hacer con la app

### El día a día

La pantalla principal muestra Hoy y los proyectos activos a la vez. Las
tareas sin terminar de días anteriores pasan solas a Hoy cuando abres la
app o cuando el reloj cruza medianoche con la app abierta. La franja
superior deja saltar a cualquier día de la semana con un clic, o cambiar
entre vista **Today** (sólo el día centrado) y **Week** (siete días en
columna).

Para crear una tarea rápida pulsas **N** desde cualquier sitio, tecleas
el texto y Enter. Si pegas texto multilínea, se crea una tarea por
línea. Con **doble clic** en el círculo de estado de una tarea entras en
modo foco: una sola tarea en pantalla, cronómetro simple, `Esc` para
salir.

### Proyectos con contexto

Cada proyecto es su propia lista, con nombre, color, una carpeta
enlazada (que abres con un clic en el icono de carpeta), notas en
Markdown y opcionalmente un *kind* (reunión, ciclo de active learning…)
que le da identidad visual propia. Las plantillas iniciales cubren los
flujos típicos de investigación: proyecto nuevo, becario / estudiante,
viaje, cierre de paper, preparación de reunión, ciclo de active
learning.

Pulsa el título de un proyecto y se abre su **cristal**: estadísticas,
próxima fecha límite, tareas abiertas y la zeolita (framework) asociada
al proyecto.

![Cristal del proyecto MFI Defect Engineering](docs/screenshots/03-project-crystal.png)

### Deadlines y radar de urgencia

Cada tarea puede tener una fecha límite. La lista de **Deadlines**
agrupa todas las pendientes por urgencia (vencidas, hoy, pronto, más
tarde) con el proyecto de origen a la vista.

![Deadlines agrupadas por urgencia](docs/screenshots/04-deadlines.png)

Para una vista espacial del mismo material, el **radar de vencimientos**
coloca cada deadline como un punto en anillos concéntricos: más cerca del
centro, más urgente. Las fechas de papers se pintan en color distinto;
si has configurado una charla próxima, se destaca en rojo.

### Mission control

Un tablero bento con todo lo que importa a la vez: tareas de hoy,
próximas fechas límite (7 días), reuniones activas y un mapa de calor de
tu actividad en las últimas 12 semanas.

![Mission control con hoy, deadlines, meetings y actividad](docs/screenshots/05-mission-control.png)

### Gente: quién te espera y a quién esperas

Si escribes `@nombre` dentro de una tarea, esa persona aparece en el
panel de **Gente**, con tres columnas: a quién le debes algo, quién te
espera a ti, y qué compartís. Los tags `#waiting` y `#owe` ajustan
quién va a qué columna. No hay que configurar nada: las menciones se
leen al momento, y el mismo nombre con o sin acentos y mayúsculas se
agrupa en una sola persona.

![Panel Gente con menciones a Mercedes, Rafa y Veronique](docs/screenshots/06-people.png)

### Identidad científica

Cada día la app elige una **zeolita del día**. La silueta del framework
pinta el fondo del splash y la carátula de los proyectos. Puedes
clicar la insignia de la sidebar para abrir la ficha, que indica el
tamaño del anillo mayor del framework y si fue descubierta en el ITQ.

![Ficha de zeolita del día: ITH (ITQ-13)](docs/screenshots/07-zeolite-of-day.png)

Además de zeolitas, hay temas alternativos (química orgánica, óxidos
metálicos, fotoquímica) con sus propias siluetas del día. Se cambian
desde Ajustes → Display.

### Caja rápida: buscar y ejecutar

Pulsa **Ctrl+K** (o **/**) desde cualquier parte: te abre una caja que
busca tareas en todos los proyectos y, con el prefijo `>`, ejecuta
comandos (ir a Mission control, abrir Deadlines, cambiar tema, cambiar
vista, abrir el resumen diario o semanal…). Con el prefijo `+` crea una
tarea al vuelo entendiendo fecha (`tomorrow 10am`), tag (`#dft`),
prioridad (`!1`, `!2`, `!3`) y proyecto (`/ceo2`).

![Caja rápida con atajos a cada acción](docs/screenshots/08-search.png)

### Resúmenes y cierre semanal

A partir de las 17:00 la app te ofrece el **resumen del día** (lo que
has cerrado y lo que toca mañana). Los viernes a partir de las 17:00 se
abre el **Cierre del viernes**: lo que acabaste, lo que arrastras al
lunes, y tres preguntas cortas para dejar la semana ordenada. En la
sidebar se lleva la cuenta de la **racha** de días completos al 100%.

### Personalización

Desde Ajustes puedes cambiar idioma (inglés / castellano / catalán),
tema claro u oscuro, densidad (aireada o densa), tipografía, color de
acento y ancho de tarjeta de proyecto. Hay un **modo rendimiento** que
desactiva los fondos difuminados si tu equipo rinde justo con la GPU
integrada.

![Ajustes con los controles principales](docs/screenshots/10-settings.png)

### Dónde viven tus datos

Todo se guarda localmente, en la base de datos IndexedDB del navegador
embebido. Nada se envía a ningún servidor. Para migrar a otro equipo
usas **Exportar / Importar** desde Ajustes → Datos, o la **copia de
seguridad automática** diaria a una carpeta sincronizada con la nube.

### Guía dentro de la app

Si quieres ver todo lo anterior con ejemplos y pasos concretos, la
**Guía de funciones** está dentro de la app (sidebar → tres puntos →
Feature guide). Tiene una pestaña por cada bloque, con ejemplos reales
de uso.

![Guía de funciones con ejemplos de Gente](docs/screenshots/11-feature-guide.png)

---

## Atajos de teclado

Los esenciales (los puedes ver en cualquier momento pulsando **?**):

| Tecla | Acción |
|---|---|
| `N` | Enfoca el campo de nueva tarea del día centrado |
| `T` | Vuelve a Hoy |
| `← / →` | Mueve un día atrás / adelante |
| `/` | Abre la búsqueda |
| `Ctrl+K` | Abre la caja rápida de comandos |
| `D` | Abre deadlines |
| `?` | Muestra esta ayuda |
| `Esc` | Cierra el diálogo abierto |

![Modal de atajos de teclado](docs/screenshots/12-shortcuts.png)

---

## Problemas y sugerencias

Abre un issue en el repositorio o escríbeme directamente.

## Licencia

GPL-3.0. Basado en [WeekToDo](https://github.com/manuelernestog/weektodo)
de Manuel Ernesto García, ampliado para flujo diario de investigación.
