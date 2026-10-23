# Drag reorder y background tematizado, método y gotchas

Este documento recoge cómo se consiguió finalmente que (1) los proyectos
se reordenen con el ratón sin recargar y (2) el fondo del tablero
responda al theme activo, no sólo el splash. Si alguno de los dos vuelve
a romperse, pasar primero por los pasos marcados "VERIFICAR" antes de
tocar nada.

---

## 1. Reordenar proyectos arrastrando

### El síntoma típico cuando falla

Arrastras la cabecera de un proyecto encima de otro, el placeholder se
pinta, sueltas, nada se mueve. Si recargas la app (o cambias de día),
el orden sí aparece aplicado. Eso es la pista: la mutación en la store
corre, pero la vista no reacciona.

### Las piezas que tienen que estar bien, en orden

1. **Fuente del drag** en `src/components/listHeader.vue`.
   El `<div>` interno del título lleva `:draggable="customTodoList && !editing"`
   y `@dragstart="onHeaderDragStart"`. El handler escribe el índice
   origen en tres MIME types a la vez para sobrevivir al Chromium viejo
   de Electron: `list-reorder-index`, `application/x-itq-list-reorder`
   y `text/plain` con prefijo `itq-list-reorder:`.
   Los tres bloques `catch (e) { ... }` DEBEN llevar un comentario
   dentro. ESLint `no-empty` crashea el build si están vacíos.

2. **Zona de drop** en `src/components/toDoList.vue`.
   Los handlers viven en el root `.to-do-list-container`
   (`@dragover="onProjectDragOver"`, `@drop="onProjectDrop"`,
   `@dragenter="onProjectDragEnter"`, `@dragleave="onProjectDragLeave"`),
   NO sólo en el header. Si limitas al header, el browser cancela el
   drop en cuanto el puntero cruza un icono interno.
   Los handlers filtran por `event.dataTransfer.types`, aceptando sólo
   payloads de reorder, dejando pasar los drags de tasks al handler de
   la drop-zone interna.

3. **La mutación** `reorderCustomTodoLists` en
   `src/store/modules/todolist.store.js` reemplaza el array con `.slice()`:
   ```js
   let next = list.slice();
   let moved = next.splice(from, 1)[0];
   next.splice(to, 0, moved);
   state.cTodoListIds = next;
   ```
   Asignación de referencia nueva, no mutación en sitio. Vue reactividad
   depende de esto para disparar los computed consumidores.

4. **(La trampa que mató las rondas 1-3)** El consumidor en `App.vue`
   DEBE leer el array por **computed**, no por **data**. En data,
   `cTodoList: this.$store.getters.cTodoListIds` captura la REFERENCIA
   del array al mount y la congela. Cuando la mutación asigna una
   referencia nueva, data sigue apuntando al array viejo, el `v-for`
   no se recomputa y la pantalla se queda igual. Un simple:
   ```js
   computed: {
     cTodoList: function () {
       return this.$store.getters.cTodoListIds || [];
     },
   }
   ```
   lo arregla. `visibleCTodoList` y `archivedCount` dependen de este
   `cTodoList`, así que al pasarlo a computed, todos reaccionan.

5. **Repository update** después de la mutación: `onProjectDrop` y
   `onHeaderDrop` llaman a `customToDoListIdsRepository.update(...)`
   para persistir el nuevo orden en IndexedDB. Si saltas este paso,
   funciona en la sesión actual y se pierde al reabrir.

### VERIFICAR si vuelve a no funcionar

- Que `cTodoList` en `App.vue` esté en `computed`, no en `data()`.
  Grep rápido:
  ```bash
  grep -nE "cTodoList:\s*this\.\$store" src/App.vue
  ```
  Si matchea en data(), ESA es la regresión. Devuélvelo a computed.
- Que la mutación haga `state.cTodoListIds = next` (reemplazo), no
  `list.splice(...)` directo (mutación en sitio invisible a Vue 3 fuera
  del DOM reactivo).
- Que los handlers de drop vivan en `.to-do-list-container`, no sólo
  en `.weekly-to-do-header`.
- Abrir DevTools y poner un `console.log("project drop", fromIndex, toIndex)`
  justo antes del commit en `onProjectDrop`. Si NO imprime, el drop
  no está llegando (fuente del drag, dataTransfer types, o preventDefault
  en dragover). Si imprime pero la pantalla no cambia, el problema está
  en la reactividad (paso 4).

---

## 2. Fondo del tablero tematizado

### El síntoma típico cuando falla

Cambias de theme en Settings (zeolites → organic, por ejemplo). El
splash reflejará el cambio inmediatamente. El fondo del tablero principal
sigue siendo el hex de MFI o el patrón del theme anterior. Las covers de
los proyectos sí cambian.

### Las piezas que tienen que estar bien

1. **El layer tiled** vive en `.mesh-bg::before` (en `App.vue`, bloque
   `<style>`). Toma la máscara repetida como CSS variable:
   ```css
   -webkit-mask-image: var(--lattice-mask, url("...default..."));
   mask-size: var(--lattice-size, 28px 49px);
   ```
   El default es la hex de MFI, así se ve algo si por lo que sea no se
   pasan las variables.

2. **El hero overlay** es un `<svg>` grande en `App.vue:1`
   (`.lattice-field`), con un `<g class="lattice-rotor">` que rota
   lentamente. Dentro del `<g>` se inyecta la forma del theme via
   `v-html="todayThemeItem.svgShape"`. El `viewBox` del `<svg>` se
   bindea a `todayThemeItem.viewBox` para que cada theme encaje
   correctamente (todos los helpers usan `"0 0 100 100"`).

3. **Fuente única**: computed `todayThemeItem` en `App.vue` llama a
   `themesHelper.getTodayItem(config)`, NO a `zeoliteHelper.getTodayLattice()`.
   El import en lo alto de App.vue tiene que ser:
   ```js
   import themesHelper from "./helpers/themesHelper";
   ```
   y NO zeoliteHelper. zeoliteHelper es un detalle de implementación de
   un solo theme, routeado por themesHelper.

4. **Reactividad al cambio de theme**: el computed `todayThemeItem` DEBE
   tocar `config.activeTheme` para que Vue lo marque como dependencia.
   `themesHelper.getTodayItem(cfg)` ya lee `cfg.activeTheme`, pero por
   claridad del tracker se añade una línea explícita:
   ```js
   let _theme = cfg && cfg.activeTheme; // eslint-disable-line no-unused-vars
   ```
   dentro del computed. Sin esto, Vue a veces no refresca el fondo al
   cambiar de theme.

5. **El shape SVG inyectado** debe usar `currentColor` para que herede
   el accent color via `.lattice-field { color: var(--accent-color) }`.
   Todos los helpers (`zeoliteHelper`, `organicHelper`, `oxideHelper`,
   `photochemHelper`) ya lo hacen. Si añades un theme nuevo, imita el
   patrón.

6. **El `maskSize` del theme** debe ser string CSS válido (`"40px 40px"`),
   no un número suelto. zeolite lo compone en `build()` como
   `fw.size + "px " + fw.size + "px"`; organic, oxides y photochem lo
   exponen directamente. themesHelper.normalizeZeoliteItem toma ese
   string como `maskSize`. Si pasas `maskSize: 40` (sin px) el browser
   invalida la declaración y el mask queda sin tamaño.

### VERIFICAR si vuelve a no funcionar

- `grep "zeoliteHelper" src/App.vue` — si aparece importado o usado en
  el computed, mala señal: debe ir todo por themesHelper.
- Que el `<svg class="lattice-field">` use `:viewBox="todayThemeItem.viewBox..."`
  y `v-html="todayThemeItem.svgShape"`. Si todavía tiene
  `<polygon :points="todayLattice.polygonPoints">`, es el patrón viejo
  hardcoded a zeolite.
- En DevTools, inspeccionar `.mesh-bg` → style tab → confirmar que
  `--lattice-mask` tiene un `url(data:image/svg+xml,...)` que coincide
  con el theme activo. Si está vacía, el computed no se re-ejecutó
  (falta la dependencia activeTheme).

---

## 3. Método de debug general cuando algo "no se refresca"

El 90% de los casos de "cambio Settings y la UI no reacciona" en esta
app son el mismo bug: un consumidor que lee del store en `data()` en
lugar de en `computed`. En Vue 3, `data()` corre una vez al mount y
captura referencias; computed se re-evalúa cuando sus dependencias
reactivas cambian.

Checklist al diagnosticar:

1. Localizar el **componente que debería actualizar**.
2. Grep `data()` en ese componente y mirar si alguna línea hace
   `foo: this.$store.getters.X` o `this.$store.state.X`.
3. Si sí, moverla a `computed`.
4. Si el valor cambia por una **mutación que reemplaza el array/objeto
   completo** (no mutación en sitio), el computed lo verá. Si cambia
   por `.push`, `.splice` sin reasignación, Vue 3 también lo ve si el
   array es reactive proxy — pero sólo mientras no haya habido una
   reasignación previa que te deje con una referencia antigua
   congelada.
5. Para theme/config: tocar explícitamente `config.<campo>` dentro del
   computed. Es verboso pero evita regresiones silenciosas.

---

## 4. Archivos tocados en esta ronda

- `src/components/listHeader.vue`: tres `catch (e) {}` → `catch (e) { /* ... */ }`
  (desbloquea ESLint `no-empty`).
- `src/App.vue`:
  - `cTodoList` movido de `data()` a `computed`.
  - `todayLattice` renombrado a `todayThemeItem`, implementado vía
    `themesHelper.getTodayItem(config)`.
  - Import de `zeoliteHelper` sustituido por `themesHelper`.
  - Template de `.lattice-field` usa `:viewBox` y `v-html` del
    themeItem.
  - CSS de `.lattice-rotor` ajustada a `transform-origin: 50% 50%`.
  - CSS muerto `.lattice-ring` y `.lattice-nucleus` sustituido por
    regla genérica para los hijos del rotor.

Build pasa los hard checks de `CLAUDE.md`: node -c, Vue parse,
no-dupe-keys, no-sparse-arrays, no-empty.
