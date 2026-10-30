import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron/simple";
import renderer from "vite-plugin-electron-renderer";
import { fileURLToPath, URL } from "node:url";
import { createRequire } from "node:module";
import { builtinModules } from "node:module";

// Vite 5 config for ITQ Todo.
//
// Keeps nodeIntegration enabled on the renderer so src/helpers/exportTool.js
// can keep calling require("electron"|"fs"|"os"|"path") from the renderer.
// The vite-plugin-electron-renderer plugin wires the externals that make
// those requires work inside Vite's bundle.
//
// package.json intentionally omits "type": "module" so Electron can
// load dist-electron/main.js as CommonJS. vite.config.mjs stays ESM
// through its explicit .mjs extension.
const nodeRequire = createRequire(import.meta.url);
const pkg = nodeRequire("./package.json");

// Everything in dependencies gets externalized so the main-process
// bundle stays small. electron-builder packages the real modules from
// node_modules into the installer.
const mainExternals = [
  "electron",
  "electron-devtools-installer",
  ...Object.keys(pkg.dependencies || {}),
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  publicDir: "public",
  // Expose package.json's version as __APP_VERSION__ in the renderer source
  // so src/App.vue can trigger data-model migrations when the installed
  // build moves to a new version. Avoids a separate public/version.json
  // that drifts out of sync.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    // Vue CLI / webpack 4 added ".vue" to the default extension list, so
    // imports like `import toDoList from "./components/toDoList"` worked
    // without the explicit extension. Vite does not do that by default,
    // which breaks a production build (dev mode is more forgiving). We
    // restore ".vue" at the end of the list so the rest of the resolution
    // order is unchanged. The clean fix is to rewrite every bare SFC
    // import across src/ to include ".vue"; that lands in a later tidy-up.
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // Electron 25 ships Chromium 114; narrowing the target avoids
    // transpilation we don't need and keeps bundle size down.
    target: "chrome114",
  },
  server: {
    port: 8080,
    strictPort: true,
  },
  plugins: [
    vue(),
    electron({
      main: {
        entry: "electron/main.js",
        vite: {
          build: {
            outDir: "dist-electron",
            emptyOutDir: true,
            sourcemap: "inline",
            minify: false,
            rollupOptions: {
              output: {
                format: "cjs",
                entryFileNames: "[name].js",
                inlineDynamicImports: true,
              },
              external: mainExternals,
            },
          },
          optimizeDeps: { exclude: mainExternals },
          ssr: { noExternal: [] },
        },
      },
    }),
    renderer({
      // Lets renderer code use require("electron"|"fs"|"os"|"path"), etc.
      // Matches the previous Electron behavior (nodeIntegration: true).
      nodeIntegration: true,
    }),
  ],
});
