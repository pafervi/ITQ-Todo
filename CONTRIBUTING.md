# Contributing

Thanks for the interest. This project is primarily a personal tool, but
contributions that fit the "lab notebook for computational catalysis" scope
are welcome.

## Development workflow

1. Fork the repo and create a topic branch.
2. `npm install --ignore-scripts`.
3. `npm run electron:serve` for hot-reload dev.
4. Make the change. Keep it narrow, split unrelated changes into separate
   commits.
5. Run `npm run lint` and `npm run test:unit`.
6. Run a full `./scripts/build-app.sh` (Linux) or `scripts\build-app.bat`
   (Windows). The webpack build runs ESLint strict and will catch issues
   that `npm run lint` sometimes misses.
7. Open a pull request against `master`.

## Code style

- **Language**: JavaScript, Vue 3 single-file components with Options API
  (no `<script setup>` yet, keep it consistent).
- **Comments, variable names, docstrings**: English only.
- **Narrative in commits and PRs**: English preferred, Spanish accepted.
- **Indentation**: 2 spaces, no tabs.
- **Line length**: no hard cap, but wrap prose and long object literals
  around 100 columns.

## Hard rules

These were all learned from build crashes, so take them seriously:

- No duplicate top-level option keys in a Vue component (`data`, `computed`,
  `methods` can only appear once each). ESLint `no-dupe-keys` is strict.
- No sparse arrays (`[, "x"]` or `["x", ,]`). Use `["", "x"]` instead.
  ESLint `no-sparse-arrays`.
- Empty `catch` blocks must contain a comment explaining the intent, or
  ESLint `no-empty` fires.
- JSON i18n files under `src/assets/languages/` must be valid JSON (no
  trailing commas, no comments). The build does not validate them, but a
  broken file silently breaks that locale.

## Data-model changes

- Add a new `v2_x_y` migration function in `src/migrations/migrations.js`;
  never rewrite an older one.
- Keep new fields optional with safe defaults so previous migrations still
  parse historical state.
- When adding an IndexedDB store, bump the database version in
  `src/repositories/dbRepository.js`; otherwise the store will not exist
  for upgrading users.
- Never change `package.json`'s `name` field. The Electron userData folder
  path depends on it and renaming orphans everyone's existing data.

## Commit messages

Short imperative subject line, blank line, body with the rationale.
Reference the specific files or feature touched. See the commit history
for the house style.

## Issues and discussion

Open an issue before working on anything larger than a bug fix, so we can
agree on the approach first.
