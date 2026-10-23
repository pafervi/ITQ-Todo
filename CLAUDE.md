# ITQ-Todo working rules for Claude

This file is read automatically at the start of every Claude Code session
on this repo. Treat the rules below as hard requirements, not suggestions.

## 1. Never commit code that will not install

Pau builds the app with `scripts/build-app.bat` (Windows) or
`scripts/build-app.sh` (Linux). Both run Vue CLI + webpack with ESLint
strict. Pau has to look at a crashed terminal every time a commit fails
the build, which is expensive and avoidable. Before sending any change
back to the user's folder with `device_commit_files`, run the following
checks for every file you touched this round:

### Hard checks (block the commit if any fails)

- **JavaScript syntax**: `node -c <file.js>` for every `.js` under
  `src/helpers/`, `src/store/`, `src/repositories/`, `src/migrations/`.
- **Vue single-file component**: extract the `<script>` block, strip
  `import` lines and the leading `export default`, wrap as `var _c = ...`,
  and feed to `new Function(js)`. Must not throw.
- **Duplicate top-level option keys** in Vue files: `grep -cE
  "^  (data|computed|methods|mounted|unmounted|props|emits|components|
  watch|beforeCreate|beforeMount|created):"` for each key, every count
  must be `<= 1`. ESLint's `no-dupe-keys` fires on this and crashes the
  build (this bit us at least twice).
- **Sparse arrays** (`[, "x"]`, `["x", ,]`): regex
  `grep -nE '\[[[:space:]]*,|,[[:space:]]*(\]|,)'`. ESLint
  `no-sparse-arrays` crashes the build. Always use `["", "x"]`.
- **Empty `catch` blocks**: ESLint `no-empty` fires on `catch (e) {}`.
  Add at least a comment inside the braces, e.g.
  `catch (e) { /* ignored: fall through */ }`.
- **JSON validity** for `src/assets/languages/*.json`: `python3 -c
  "import json; json.load(open('<path>'))"`.
- **No reference to removed symbols**: if you removed an import, grep
  the file for the symbol name and make sure nothing still uses it.

### Soft checks (fix if you see them, do not block)

- Un-used imports (webpack warns but does not fail).
- Overlong lines, inconsistent spacing (ESLint style rules, usually
  warnings only).

### Workflow

Group the stage + check + commit into one Bash call so the checks run
on the exact bytes going to the user's disk. If any hard check fails,
fix the file, re-stage, re-check. Only call `device_commit_files` once
every hard check passes. Say in the reply what you checked.

## 2. Do not re-break what the previous round fixed

When editing a Vue component, re-grep for the symptoms you fixed in
earlier rounds (duplicate `computed` blocks, sparse arrays in the
dataset lists, orphan imports, empty catch blocks) so a merge-style
edit does not reopen them. The history of this file is littered with
the same classes of regression.

## 3. Preferences

- Pau writes narrative in Spanish (castellano) and expects answers in
  Spanish. Code, comments, variable names and docstrings in English.
- Terse and technical. No "quizás", no filler. Give the fix.
- When something is unclear, diagnose from the logs first, ask one
  specific question only if the logs are not enough.
- Deliver complete ready-to-paste code, not snippets.

## 4. Repo layout quick reference

```
ITQ-Todo/
├── src/                    Vue app source
│   ├── components/
│   │   ├── phased/         Phased-project panel (timeline, feed)
│   │   └── layout/
│   ├── views/              Modals and full-screen views
│   ├── store/modules/      Vuex modules
│   ├── repositories/       IndexedDB adapters
│   ├── helpers/            Pure helpers (themes, dates, parsers)
│   ├── migrations/         Versioned data-model migrations
│   └── assets/languages/   i18n JSON (en, es)
├── scripts/                Build + maintenance scripts
│   ├── build-app.sh
│   ├── build-app.bat
│   └── windows/            PowerShell helpers (cleanup, restore)
├── docs/                   Internal docs
│   ├── architecture.md
│   ├── fases-implementacion.md
│   └── sessions/           Development session notes
├── build/                  electron-builder icons
├── public/
└── dist_electron/          Build output (gitignored)
```

- Phased projects feature: `src/components/phased/`,
  `src/views/phaseEditorModal.vue`, `addLogEntryModal.vue`,
  `snapshotPromptModal.vue`, `src/store/modules/phase.store.js`,
  `src/store/modules/logEntry.store.js`,
  `src/repositories/phaseRepository.js`,
  `src/repositories/logEntryRepository.js`,
  `src/helpers/phasedProjectHelper.js`.
- Science themes: `src/helpers/themesHelper.js` plus `zeoliteHelper.js`,
  `organicHelper.js`, `oxideHelper.js`, `photochemHelper.js`, consumed
  by `src/components/splashScreen.vue`, `src/components/toDoList.vue`
  (project cover), and `src/views/zeoliteInfoModal.vue`.
- Migrations are additive in `src/migrations/migrations.js`; always add
  a new `v2_x_y` function and call it from `migrate()` rather than
  rewriting an older one.
- IndexedDB stores live in `src/repositories/dbRepository.js`; bump the
  database version when adding a store or the new store will not exist
  for users upgrading.

## 5. Current conventions

- Data model fields that are new go in with safe defaults so the
  previous migration still parses.
- Field `cTodoListIds[i].zeoliteFramework` is reused as the project's
  theme-item code (kept its old name for backwards compat; now it holds
  a code from the active theme, not just zeolites).
- `config.activeTheme` is one of `"zeolites" | "organic" | "oxides" |
  "photochem"`, default `"zeolites"`. Switching re-renders the splash
  and all project covers reactively.
- Phased project panel elevates via a Vue 3 `Teleport` to body (so
  `position: fixed` works regardless of any transformed ancestor).

## 6. What NOT to do

- Do not run `scripts/windows/cleanup.ps1` from Pau's PowerShell
  helpers without being asked.
- Do not force-push, do not amend commits made in earlier sessions
  without reading them first.
- Do not change the `name` field of `package.json` (the data folder
  path depends on it).
- Do not touch workflow files under `.github/workflows/` without Pau
  asking: the push PAT has no `workflow` scope and GitHub rejects.
- Do not re-commit `yarn.lock`. The project pins through
  `package-lock.json` only; `yarn.lock` is listed in `.gitignore`.
