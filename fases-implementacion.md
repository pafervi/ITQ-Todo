# Fases: implementación en ITQ-Todo

> Draft generado el 2026-10-19. Mockup visual de referencia: Artifact "Fases: dos vistas" (dos vistas sobre los mismos datos, timeline con marcadores y feed cronológico).

## Objetivo

Añadir un segundo tipo de proyecto, `phased`, para trabajo científico donde el checklist no basta. Un proyecto phased tiene fases solapables en el tiempo, cada una con su checklist dentro, y un log cronológico tipado de eventos (hito, decisión, bloqueo, nota). Dos vistas sobre los mismos datos: Timeline (Gantt ligero) y Feed.

Los proyectos actuales siguen siendo checklist y no cambian.

## 1. Modelo de datos

### Project (campo nuevo)
```js
{
  // ...campos actuales
  type: 'checklist' | 'phased',  // default 'checklist'
  startDate: Date | null,         // solo relevante en 'phased'
  endDate: Date | null,           // solo relevante en 'phased'
}
```

### Phase (entidad nueva)
```js
{
  id: string,
  projectId: string,
  name: string,
  startDate: Date,
  endDate: Date,
  status: 'pending' | 'active' | 'done' | 'blocked',
  order: number,
  color: string,  // auto desde paleta p1..p5
}
```

### LogEntry (entidad nueva)
```js
{
  id: string,
  projectId: string,
  phaseId: string | null,
  date: Date,
  kind: 'note' | 'milestone' | 'decision' | 'block',
  text: string,
  blockEndDate: Date | null,  // solo si kind==='block' y ya resuelto
}
```

### Task (campo nuevo)
```js
{
  // ...campos actuales
  phaseId: string | null,
}
```

## 2. Componentes a crear

Bajo `src/components/project/phased/`:
- `PhasedProjectView.vue`: contenedor con toggle Timeline/Feed, cabecera del proyecto, botón "añadir entrada log", botón "añadir fase".
- `PhaseTimeline.vue`: pinta el Gantt. Grid de dos columnas, label | track con barras y marcadores. Ver mockup, Vista A.
- `PhaseBar.vue`: una barra del Gantt. Props: `phase`, `rangeStart`, `rangeEnd`. Pinta la barra y los marcadores vinculados a esa fase.
- `PhaseFeed.vue`: lista cronológica de LogEntry. Ver mockup, Vista B.
- `LogEntryItem.vue`: entrada individual con icono por kind.
- `AddLogEntryModal.vue`: form modal (fecha, kind, texto, fase opcional).
- `PhaseEditor.vue`: form modal (nombre, fechas inicio/fin, estado).

## 3. Componentes a modificar

- `ProjectView.vue` (o equivalente): branch por `project.type`. Si `phased` → `PhasedProjectView`, si no, lo actual.
- Diálogo "nuevo proyecto": radio para elegir tipo. Si phased, pedir también fechas startDate/endDate.
- Lista lateral de proyectos: iconografía distinta para phased (barras horizontales en vez de check).

## 4. Lógica del timeline

Posicionar en el track por porcentaje del rango total:
```js
function pct(date, rangeStart, rangeEnd) {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  return ((date.getTime() - rangeStart.getTime()) / total) * 100;
}
```

Línea de "hoy":
```js
const todayPct = pct(new Date(), rangeStart, rangeEnd);
// no pintar si fuera de [0, 100]
```

Barras:
```html
<div class="bar"
     :style="{ left: pct(phase.startDate, ...) + '%',
               width: (pct(phase.endDate, ...) - pct(phase.startDate, ...)) + '%' }">
```

Marcadores: posición en `left: pct(entry.date, ...) + '%'`, dentro del `.track` de la fase correspondiente.

Bloques: la franja rayada va desde `pct(entry.date, ...)` hasta `pct(entry.blockEndDate ?? today, ...)`.

## 5. Estilo

Añadir tokens al theme (ver `:root` del mockup):
```css
--milestone, --decision, --block, --today
--p1, --p2, --p3, --p4, --p5
```

CSS de marcadores y block-strip: copiar directo del mockup. No usar librerías externas.

## 6. Automatismos

- Al cambiar `phase.status` a `done`, crear LogEntry automática: `{ kind: 'milestone', text: '<nombre fase> cerrada', phaseId, date: now }`.
- Al cambiar `phase.status` a `blocked`, abrir AddLogEntryModal con `kind: 'block'` prepopulado.
- Al desbloquear la fase, pedir fecha de fin del bloqueo y actualizar `blockEndDate` del último block de esa fase.

## 7. Orden de implementación recomendado

1. Modelo de datos y migración. Añadir campos sin UI, verificar que proyectos checklist existentes siguen funcionando.
2. Vista Feed. Más simple, solo lista cronológica. Permite empezar a usarla con un proyecto phased dummy.
3. CRUD de fases y de log entries (modales).
4. Vista Timeline sin marcadores. Barras posicionadas correctamente.
5. Marcadores sobre las barras (hito, decisión, bloqueo).
6. Automatismos del punto 6.
7. Icono y entrada en el diálogo "nuevo proyecto".

## 8. No romper

- `project.type` defaultea a `'checklist'`. Proyectos antiguos no se tocan.
- `task.phaseId` es opcional. Tareas sueltas siguen funcionando igual.
- No añadir dependencias nuevas al package.json. Gantt a mano con CSS, sin librerías de charting.

## 9. Decisiones pendientes

- ¿El feed muestra también las tareas completadas como entradas implícitas, o solo los LogEntry explícitos?
- ¿Convertir checklist → phased in-place, o solo elegir el tipo al crear?
- Snapshot semanal automático (recordatorio los lunes), ¿esta ronda o posterior?

## Referencia visual

Mockup publicado como Artifact "Fases: dos vistas". Contiene los dos layouts con datos del proyecto ficticio "Al-pair stability en MFI", 5 fases solapables, marcadores de hito/decisión/bloqueo sobre las barras del timeline.
