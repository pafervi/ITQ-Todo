# ITQ Todo architecture

A quick tour of the codebase for people who have never opened it.

## Stack

- **Vue 3** with the Options API.
- **Vuex 4** for shared state (project list, config, active phase).
- **IndexedDB** (via a thin adapter in `src/repositories/dbRepository.js`)
  for durable storage.
- **Electron** wraps the Vue app for desktop packaging. The main process
  entry is `src/background.js`.
- **vue-cli-service** (Vue CLI 4) + **webpack 4** drive the build.
  OpenSSL legacy provider is required at build time (handled by the
  wrapper scripts).
- **ESLint** runs strict as part of the webpack build; see
  `.eslintrc.js`.

## Entry points

- `src/main.js` creates the Vue instance, mounts stores, registers i18n.
- `src/App.vue` is the root component. It is intentionally large and
  carries the week-view layout. Component extraction has been incremental
  rather than wholesale.
- `src/background.js` is Electron's main process: window lifecycle, menu,
  auto-launch wiring, IPC.

## State

`src/store/` is the Vuex root. Modules under `src/store/modules/`:

- `todolist.store.js`  — the project list and per-day tasks.
- `phase.store.js`     — phased projects, phases, order.
- `logEntry.store.js`  — log entries attached to phases.

Mutations always replace arrays via `slice()` rather than mutating in
place, so Vue reactivity triggers on reorder.

## Persistence

`src/repositories/` wraps IndexedDB. `dbRepository.js` holds the DB
version and the list of object stores. Add a store ⇒ bump the version ⇒
users get the new store on next open.

`src/migrations/migrations.js` runs on app start. Each `v2_x_y` function
is additive and must leave previously-migrated state readable.

## Features

### Phased projects

Lives in `src/components/phased/` (timeline, feed) and
`src/views/phaseEditorModal.vue`, `addLogEntryModal.vue`,
`snapshotPromptModal.vue`. Helper: `src/helpers/phasedProjectHelper.js`.
The panel elevates via Vue 3 `Teleport` to body so `position: fixed`
works regardless of transformed ancestors.

### Science themes

`src/helpers/themesHelper.js` dispatches to per-theme helpers that each
expose:
- A list of items (zeolite framework, molecule, oxide, photochem concept).
- An `svgShape` + `viewBox` per item for the project cover.
- A repeating-tile `mask` SVG for the splash background.

Themes: `zeoliteHelper.js`, `organicHelper.js`, `oxideHelper.js`,
`photochemHelper.js`. Switched from Settings via `config.activeTheme`.

### Deadlines

`src/views/deadlineRadarModal.vue` and `deadlinesModal.vue`. The radar
maps days-to-deadline to radius continuously via a `sqrt` curve so
urgency reads at a glance.

### i18n

`src/assets/languages/*.json`, bootstrapped by `vue-i18n`. English and
Spanish are the two supported locales. New strings go in both files or
fall back to the key.

## Build

- `npm run electron:serve`: dev server + Electron window with hot reload.
- `npm run electron:build`: production build. Output under `dist_electron/`.

The wrapper scripts (`scripts/build-app.sh`, `scripts/build-app.bat`)
check Node version, set `NODE_OPTIONS=--openssl-legacy-provider`
(required for webpack 4 under Node 17+), and call
`npm run electron:build` with sensible defaults per OS.

## Known rough edges

- `App.vue` is monolithic (~60 KB). Breaking it apart is a long-standing
  TODO.
- Several components mix presentation and state access directly through
  the store rather than props/emits.
- Styles are a mix of scoped SCSS inside SFCs and global rules in
  `src/assets/`.
- Test coverage is thin; most regression safety comes from running a
  full Electron build on every change.
