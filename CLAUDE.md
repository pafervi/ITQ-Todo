# ITQ-Todo working rules for Claude

This file is read automatically at the start of every Claude Code session
on this repo. Treat the rules below as hard requirements, not suggestions.

## 1. Never commit code that will not install

Pau builds the app with `build-app.bat` (Windows) or `build-app.sh`
(Linux). Both run Vue CLI + webpack with ESLint strict. Pau has to look
at a crashed terminal every time a commit fails the build, which is
expensive and avoidable. Before sending any change back to the user's
folder with `device_commit_files`, run the following checks for every
file you touched this round:

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
dataset lists, orphan imports) so a merge-style edit does not reopen
them. The history of this file is littered with the same classes of
regression.

## 3. Preferences

- Pau writes narrative in Spanish (castellano) and expects answers in
  Spanish. Code, comments, variable names and docstrings in English.
- Terse and technical. No "quizás", no filler. Give the fix.
- When something is unclear, diagnose from the logs first, ask one
  specific question only if the logs are not enough.
- Deliver complete ready-to-paste code, not snippets.

## 4. Repo layout quick reference

- Phased projects feature lives in `src/components/phased/`,
  `src/views/phaseEditorModal.vue`, `addLogEntryModal.vue`,
  `snapshotPromptModal.vue`, `src/store/modules/phase.store.js`,
  `src/store/modules/logEntry.store.js`,
  `src/repositories/phaseRepository.js`,
  `src/repositories/logEntryRepository.js`,
  `src/helpers/phasedProjectHelper.js`.
- Science themes live in `src/helpers/themesHelper.js` +
  `zeoliteHelper.js` / `organicHelper.js` / `oxideHelper.js` /
  `photochemHelper.js`, consumed by `src/components/splashScreen.vue`,
  `src/components/toDoList.vue` (project cover), and
  `src/views/zeoliteInfoModal.vue` (today's item info card).
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

- Do not run `cleanup.ps1` from Pau's PowerShell helpers.
- Do not force-push, do not amend commits made in earlier sessions
  without reading them first.
- Do not change the `name` field of `package.json` (the data folder
  path depends on it).
- Do not touch workflow files under `.github/workflows/` without Pau
  asking: the push PAT has no `workflow` scope and GitHub rejects.
