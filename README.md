# ITQ Todo

Planificador personal y cuaderno de laboratorio para investigación en química
computacional, pensado para el día a día en el ITQ (UPV-CSIC). Toda la
información se queda en tu ordenador, no sale a ningún servidor.

## Instalación

Descarga el instalador para tu sistema desde la página de releases:

**[Descargar la última versión →](https://github.com/pafervi/ITQ-Todo/releases/latest)**

En esa página verás varios ficheros. Elige el que corresponda a tu sistema:

### Windows

Baja `ITQ Todo Setup <versión>.exe` y haz doble click.

> La primera vez Windows mostrará "Windows protegió el equipo". Pulsa
> **Más información → Ejecutar de todas formas**. Es porque la app no está
> firmada con un certificado corporativo, no porque haya nada raro.

Si prefieres la versión portable (no instala nada, se abre desde el fichero),
baja `ITQ Todo <versión>.exe` en lugar del Setup.

### Linux (Ubuntu / Debian / derivados)

Baja `itq-todo_<versión>_amd64.deb` y abre un terminal donde esté el fichero:

```bash
sudo apt install ./itq-todo_<versión>_amd64.deb
```

Aparecerá en el menú de aplicaciones como "ITQ Todo".

### Linux (otras distros, portable)

Baja `ITQ-Todo-<versión>.AppImage`, dale permiso de ejecución y lánzala:

```bash
chmod +x ITQ-Todo-*.AppImage
./ITQ-Todo-*.AppImage
```

### macOS

Baja `ITQ Todo-<versión>.dmg`, ábrelo y arrastra la app a la carpeta
Aplicaciones.

> La primera vez macOS dirá "no se puede abrir porque el desarrollador no
> está identificado". Haz click derecho sobre la app en Aplicaciones y
> elige **Abrir → Abrir**. Solo pasa la primera vez.

## Primeros pasos

Al abrir por primera vez, la app crea una base de datos vacía en tu
ordenador. Los datos nunca salen de aquí; si cambias de equipo tienes que
**exportar y re-importar** desde el menú de configuración.

En el menú de configuración encontrarás también:

- **Idioma**: inglés, castellano o catalán.
- **Tema**: claro u oscuro.
- **Copia de seguridad diaria**: elige una carpeta sincronizada con la nube
  (OneDrive, Google Drive, Dropbox) y la app guardará una copia cada día.
- **Cargar datos de ejemplo**: carga unos proyectos de muestra para
  explorar las funciones sin empezar de cero.

Dentro de la app, pulsa **?** en cualquier momento para ver los atajos de
teclado y la guía de funciones.

## Problemas y sugerencias

Abre un issue en el repositorio o escríbeme directamente.

## Licencia

GPL-3.0. Basado en [WeekToDo](https://github.com/manuelernestog/weektodo)
de Manuel Ernesto García.
