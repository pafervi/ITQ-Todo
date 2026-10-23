# ITQ Todo

A personal planner and lab notebook for computational catalysis research at
the [Instituto de Tecnología Química](https://itq.upv-csic.es/) (ITQ, UPV-CSIC).
Built on top of [WeekToDo](https://github.com/manuelernestog/weektodo) by Manuel
Ernesto Garcia and extensively adapted for day-to-day research workflow.

## Features

- Classic weekly planner view with repeating events, due dates, and reminders.
- Phased project panel for long-running research threads: timeline, feed,
  snapshots, and per-phase log entries.
- Science themes (zeolites, organic chemistry, metal oxides, photochemistry)
  that re-skin the splash screen and project covers with chemistry-aware
  visuals.
- Deadline radar with continuous urgency mapping.
- Drag-and-drop reorder of projects and move-task-between-projects.
- Full offline operation, data stored locally via IndexedDB.
- Multilingual UI (English, Spanish).
- Cross-platform desktop builds (Linux `.AppImage` + `.deb`, Windows installer
  + portable, macOS `.dmg` + `.pkg`).

## Requirements

- **Node.js 20 LTS** (18+ works, 20 recommended).
- **npm** (bundled with Node; the project uses `package-lock.json`).
- Linux: `dpkg`-based distro for `.deb` builds, nothing extra for AppImage.
- Windows: no extra tooling.
- macOS: Xcode command line tools for `.dmg`/`.pkg`.

## Quick start

```bash
git clone https://github.com/pafervi/ITQ-Todo.git
cd ITQ-Todo
npm install --ignore-scripts
npm run electron:serve        # dev mode with hot reload
```

The `--ignore-scripts` on install skips the Electron native rebuild step; it
runs automatically on first `electron:serve` / `electron:build`.

## Building a release

Pre-made scripts handle the full pipeline (Node version check, legacy OpenSSL
provider for webpack 4, electron-builder invocation).

### Linux

```bash
./scripts/build-app.sh
```

Produces `dist_electron/ITQ-Todo-<version>.AppImage` and
`dist_electron/itq-todo_<version>_amd64.deb`.

Install the deb:
```bash
sudo apt install ./dist_electron/itq-todo_*_amd64.deb
```

Or run the AppImage:
```bash
chmod +x dist_electron/*.AppImage && ./dist_electron/*.AppImage
```

### Windows

Double-click `scripts\build-app.bat`, or from the project root:

```cmd
scripts\build-app.bat
```

Edit `NODE_DIR` at the top of the file if your Node installation lives
elsewhere. Produces an NSIS installer and a portable `.exe` under
`dist_electron\`.

### macOS

```bash
export NODE_OPTIONS=--openssl-legacy-provider
npm run electron:build -- --mac
```

Produces `.dmg` and `.pkg` under `dist_electron/`.

## Project layout

```
ITQ-Todo/
├── src/                       Vue 3 app source
│   ├── App.vue                Root component (currently monolithic)
│   ├── main.js                Vue bootstrap
│   ├── background.js          Electron main process
│   ├── components/            Reusable components
│   │   ├── phased/            Phased-project panel (timeline, feed)
│   │   └── layout/            Sidebar, header, chrome
│   ├── views/                 Modals and full-screen views
│   ├── store/                 Vuex store and modules
│   ├── repositories/          IndexedDB adapters
│   ├── helpers/               Pure helpers (themes, dates, parsers)
│   ├── migrations/            Versioned data-model migrations
│   └── assets/                i18n strings, images, SCSS
├── public/                    Static assets served as-is
├── build/                     electron-builder assets (icons)
├── scripts/                   Build and maintenance scripts
│   └── windows/               PowerShell helpers (local cleanup)
├── docs/                      Internal documentation
│   └── sessions/              Development session notes
└── dist_electron/             Build output (gitignored)
```

See [`docs/architecture.md`](docs/architecture.md) for a deeper tour of the
code and the data model.

## Running tests

```bash
npm run test:unit         # one-shot
npm run test:unit:watch   # watch mode
```

Vitest is wired up but coverage is thin; most changes are validated by
running the Electron build (`npm run build` or the build scripts above).

## Linting

ESLint runs as part of the webpack build and will fail the build on errors
(not just warnings). To run it standalone:

```bash
npm run lint
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Credits

Fork of [WeekToDo](https://github.com/manuelernestog/weektodo) by
Manuel Ernesto Garcia, GPL-3.0.

## License

GPL-3.0, see [`LICENSE`](LICENSE).
