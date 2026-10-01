# ITQ Todo

Planificador semanal y cuaderno de laboratorio de escritorio para investigación en catálisis computacional, pensado para el día a día en el [ITQ (UPV-CSIC)](https://itq.upv-csic.es). Datos locales en el equipo del usuario, sin cuentas ni servidores.

Fork personalizado de [WeekToDo](https://github.com/manuelernestog/weektodo) por [Manuel Ernesto García](https://weektodo.me), bajo licencia GPLv3.

---

## Qué hace

- **Vista semanal** de tareas con proyectos personalizados y plantillas de flujo (active learning, paper, reuniones, viaje).
- **Centro de Control**, bento, mapa de calor de productividad y racha de días con todo cerrado.
- **Estado de cálculo por proyecto** (`calcStatus`), carpeta por proyecto, pegado directo de la cola SLURM y parser de la salida de `squeue`.
- **Auto-tag** por contenido y radar de deadlines.
- **Cuaderno de laboratorio** exportable semanal y mensual (markdown con portada).
- **Resumen semanal** (viernes) y **resumen diario** (17:00) automáticos.
- **Backup diario** a OneDrive (`.wtdb`), compatible entre Windows y Linux.
- **Countdown de charla** y **zeolita del día** (familia ITQ-n con tarjeta de información).
- **Modo foco**, modo rendimiento, modo densidad, selector de tipografía, favicon dinámico.

---

## Stack

- **Vue 3** (Options API) + **Vuex 4**
- **Electron 25** (Chromium 114)
- **vue-cli 4** / **webpack 4**
- **Bootstrap 5** + **iconos Phosphor** autoalojados
- **vue-i18n** (castellano, catalán e inglés como primeros ciudadanos)
- Datos en el almacenamiento del navegador de Electron (`localStorage` + IndexedDB) y backup `.wtdb`

---

## Compilar

### Linux (AppImage y `.deb`)

Requiere **Node 20 LTS** o superior. Para instalar Node sin tocar el sistema, con `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
```

Luego, desde la raíz del proyecto:

```bash
./build-app.sh
```

El script instala dependencias si faltan y lanza `electron-builder` con los targets `AppImage` y `deb`. Los artefactos quedan en `dist_electron/`:

```
dist_electron/ITQ-Todo-2.2.0.AppImage
dist_electron/itq-todo_2.2.0_amd64.deb
```

Para instalar el `.deb`:

```bash
sudo apt install ./dist_electron/itq-todo_2.2.0_amd64.deb
```

Para lanzar el AppImage:

```bash
chmod +x dist_electron/ITQ-Todo-2.2.0.AppImage
./dist_electron/ITQ-Todo-2.2.0.AppImage
```

### Windows (portable)

```cmd
build-app.bat
```

El `.exe` portable queda en `dist_electron\`.

---

## Dónde viven los datos

El `name` interno del paquete sigue siendo `WeekToDo` a propósito, para preservar la ruta histórica de `app.getPath("userData")`:

| SO | Carpeta de datos |
| --- | --- |
| Windows | `%APPDATA%\WeekToDo\` |
| Linux | `~/.config/WeekToDo/` |
| macOS | `~/Library/Application Support/WeekToDo/` |

Esto permite migrar entre máquinas sin perder tareas, listas, backups ni configuración.

---

## Desarrollo

```bash
npm install
npm run electron:serve
```

Build web de verificación:

```bash
NODE_OPTIONS=--openssl-legacy-provider npx vue-cli-service build --mode production
```

Tests:

```bash
npm run test:unit
```

---

## Estructura

```
src/
├── App.vue                       vista raíz, mesh animado, orquestación de modales
├── background.js                 main process de Electron, tray, autoarranque
├── main.js                       bootstrap de Vue, i18n, estilos
├── assets/
│   ├── img/                      iconos y lockups ITQ Todo
│   ├── languages/                diccionarios i18n (en, es, etc.)
│   └── style/                    globalVars, main, phosphorIcons, uiComponents
├── components/                   layout, listas, modales de confirmación
├── helpers/                      autoTag, calcStatus, exportTool, zeolita, SLURM, ...
├── migrations/                   migraciones de config por clave centinela
├── repositories/                 persistencia (localStorage + IndexedDB)
├── store/                        Vuex, módulos por dominio
└── views/                        modales grandes (config, templates, lab notebook, ...)

build/
├── icon.{icns,ico,png}           iconos macOS, Windows y linux fallback
└── linux-icons/                  PNGs 16 a 1024 para el .desktop del .deb

public/
├── index.html                    shell HTML de Electron
├── img/                          logos ITQ Todo (icono y lockup)
├── fonts/phosphor/               iconos autoalojados
└── sounds/                       alertas de notificación
```

---

## Licencia

[GPLv3](LICENSE). Se mantiene en el repositorio por obligación de la licencia original de WeekToDo.
