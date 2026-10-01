"use strict";

import { app, protocol, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";

const Config = require("electron-config");
const config = new Config();

const isDevelopment = process.env.NODE_ENV !== "production";
const gotTheLock = app.requestSingleInstanceLock();
const isServeMode = () => {
  return process.env.WEBPACK_DEV_SERVER_URL;
};

let mainWindow = null;
var tray = null;
var trayContextMenu = null;
var trayMenuTemplate = null;
var SplashScreenIsHidden = true;
const path = require("path");

// Linux: an AppImage cannot use the setuid chrome-sandbox helper, and recent
// Ubuntu releases block unprivileged user namespaces, so Electron aborts at
// start-up with "chrome-sandbox ... not configured correctly". The app only
// loads its own bundled pages, so disabling the sandbox for the AppImage is
// low risk. The .deb ships a setuid helper and keeps the sandbox.
if (process.platform === "linux") {
  if (process.env.APPIMAGE) app.commandLine.appendSwitch("no-sandbox");
  // Let Chromium pick Wayland or X11 automatically.
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
}

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { secure: true, standard: true, stream: true } }]);

async function createWindow() {
  let opts = {
    minWidth: 1000,
    minHeight: 600,
    show: !config.get("runInBackground"),
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: false,
    },
  };

  Object.assign(opts, config.get("winBounds"));

  mainWindow = new BrowserWindow(opts);
  mainWindow.removeMenu();

   mainWindow.webContents.setWindowOpenHandler((details) => {
    require("electron").shell.openExternal(details.url);
    return { action: 'deny' }
  })

  ipcMain.on("show-current-window", showCurrentWindow);
  ipcMain.on("is-windows-visible", isWindowsVisible);
  ipcMain.on("match-open-on-startup", matchOpenOnStartup);
  ipcMain.on("set-open-on-startup", setOpenOnStartup);
  ipcMain.on("set-run-in-background", setRunInBackground);
  ipcMain.on("set-tray-context-menu-label", setTrayContextMenuLabel);
  ipcMain.on("set-dark-tray-icon", setDarkTrayIcon);
  ipcMain.on("clear-config", clearConfig);

  if (typeof config.get("runInBackground") == "undefined") {
    // Linux desktops often lack a tray: closing the window quits there.
    config.set("runInBackground", process.platform !== "linux");
  }

  mainWindow.on("close", function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      config.set("winBounds", mainWindow.getBounds());
      config.set("isMaximized", mainWindow.isMaximized());
      if (config.get("runInBackground")) {
        hideWindow(mainWindow);
      } else {
        closeApp();
      }
    }

    return false;
  });

  mainWindow.on("restore", function () {
    setTimeout(hideSplashScreen, 4500);
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
  } else {
    createProtocol("app");
    mainWindow.loadURL("app://./index.html");
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      } else {
        if (config.get("isMaximized")) mainWindow.maximize();
      }
      showWindow(mainWindow);
    } else {
      createWindow();
    }
    setTimeout(hideSplashScreen, 5000);
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (!app.dock.isVisible()) {
      showWindow(mainWindow);
    }
  });

  app.on("ready", async () => {
    createTray();
    createWindow();

    // GPU / rendering diagnostic: writes a gpu-status.log once the window has
    // loaded, so we can confirm whether this machine is compositing on the GPU
    // or falling back to software (the suspected cause of the flat header and
    // the typing/scrolling lag). Best-effort; never blocks startup.
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.once("did-finish-load", function () {
        writeGpuLog();
      });
    }

    if (isDevelopment && !process.env.IS_TEST) {
      try {
        await installExtension(VUEJS_DEVTOOLS);
      } catch (e) {
        console.error("Vue Devtools failed to install:", e.toString());
      }
    }
  });

  if (isDevelopment) {
    if (process.platform === "win32") {
      process.on("message", (data) => {
        if (data === "graceful-exit") {
          app.quit();
        }
      });
    } else {
      process.on("SIGTERM", () => {
        app.quit();
      });
    }
  }
}

async function writeGpuLog() {
  try {
    const fs = require("fs");
    const nodePath = require("path");
    let lines = [];
    lines.push("ITQ Todo - GPU / rendering diagnostic");
    lines.push("Generated: " + new Date().toISOString());
    lines.push(
      "Runtime: " + process.platform + " " + process.arch + " | Electron " + process.versions.electron + " | Chromium " + process.versions.chrome
    );
    lines.push("");

    // The authoritative answer. Look especially at "gpu_compositing" and
    // "2d_canvas"/"rasterization": values like "enabled" mean the GPU is used;
    // "disabled_software", "software_only" or "disabled" mean CPU rendering.
    lines.push("== app.getGPUFeatureStatus() ==");
    try {
      let status = app.getGPUFeatureStatus();
      Object.keys(status).forEach((k) => lines.push("  " + k + ": " + status[k]));
    } catch (e) {
      lines.push("  error: " + e.message);
    }
    lines.push("");

    lines.push("== app.getGPUInfo('basic') ==");
    try {
      let info = await app.getGPUInfo("basic");
      lines.push(JSON.stringify(info, null, 2));
    } catch (e) {
      lines.push("  error: " + e.message);
    }
    lines.push("");

    // The actual WebGL renderer string. "SwiftShader", "Software" or "llvmpipe"
    // here means there is no working GPU acceleration.
    lines.push("== WebGL renderer (SwiftShader/Software/llvmpipe = no GPU) ==");
    try {
      let probe =
        "(function(){try{var c=document.createElement('canvas');" +
        "var gl=c.getContext('webgl')||c.getContext('experimental-webgl');" +
        "if(!gl)return JSON.stringify({webgl:false});" +
        "var d=gl.getExtension('WEBGL_debug_renderer_info');" +
        "return JSON.stringify({webgl:true," +
        "vendor:d?gl.getParameter(d.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)," +
        "renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)});" +
        "}catch(e){return JSON.stringify({error:e.message});}})()";
      let webgl = await mainWindow.webContents.executeJavaScript(probe);
      lines.push(webgl);
    } catch (e) {
      lines.push("  probe error: " + e.message);
    }
    lines.push("");

    lines.push("== How to read this ==");
    lines.push(
      "If gpu_compositing is 'disabled_software'/'disabled', or the WebGL renderer is SwiftShader/Software/llvmpipe, this machine composites on the CPU. That is the likely cause of the flat header glass and the laggy typing/scrolling. Fix: turn ON 'Performance mode' in Settings (it drops all blur to solid surfaces)."
    );

    let dir = app.getPath("userData");
    let file = nodePath.join(dir, "gpu-status.log");
    fs.writeFileSync(file, lines.join("\n"), "utf8");
    console.log("[ITQ Todo] GPU diagnostic written to: " + file);
  } catch (e) {
    console.error("[ITQ Todo] writeGpuLog failed: " + (e && e.message));
  }
}

function hideSplashScreen() {
  mainWindow.webContents.executeJavaScript(
    "if(document.getElementById('splashScreen')) document.getElementById('splashScreen').classList.add('hiddenSplashScreen');"
  );
}

function showCurrentWindow(event) {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (config.get("isMaximized")) mainWindow.maximize();
  showWindow(win);
}

function isWindowsVisible(event) {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  event.returnValue = win.isVisible();
}

const AUTOLAUNCH_NAME = "ITQ Todo";
// Entry name used before the app was renamed; removed on the fly so users
// upgrading from it do not end up with two startup entries.
const LEGACY_AUTOLAUNCH_NAME = "WeekToDo Planner";

function getAutoLauncher(name) {
  let AutoLaunch = require("auto-launch");
  // Inside an AppImage the real executable is a temporary mount that changes on
  // every run; APPIMAGE points to the stable .AppImage file itself.
  return new AutoLaunch({ name, path: process.env.APPIMAGE || app.getPath("exe") });
}

function removeLegacyAutoLaunch() {
  getAutoLauncher(LEGACY_AUTOLAUNCH_NAME)
    .isEnabled()
    .then((isEnabled) => {
      if (isEnabled) getAutoLauncher(LEGACY_AUTOLAUNCH_NAME).disable();
    })
    .catch(() => {});
}

function setOpenOnStartup(event, openOnStartup) {
  let autoLauncher = getAutoLauncher(AUTOLAUNCH_NAME);
  removeLegacyAutoLaunch();
  if (openOnStartup) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
}

function clearConfig() {
  config.set("runInBackground", process.platform !== "linux");
}

function setRunInBackground(event, runInBackground) {
  config.set("runInBackground", runInBackground);
}

function setDarkTrayIcon(event, darkTrayIcon) {
  config.set("darkTrayIcon", darkTrayIcon);
  tray.setImage(creatTrayIconPath());
}

function setTrayContextMenuLabel(event, labels) {
  config.set("openLabel", labels.open);
  config.set("quitLabel", labels.quit);
  trayMenuTemplate[0].label = labels.open;
  trayMenuTemplate[1].label = labels.quit;
  const menu = Menu.buildFromTemplate(trayMenuTemplate);
  tray.setContextMenu(menu);
}

function matchOpenOnStartup(event, openOnStartup) {
  let autoLauncher = getAutoLauncher(AUTOLAUNCH_NAME);
  removeLegacyAutoLaunch();

  autoLauncher
    .isEnabled()
    .then((isEnabled) => {
      if (openOnStartup != isEnabled) {
        if (openOnStartup) {
          autoLauncher.enable();
        } else {
          autoLauncher.disable();
        }
      }
    })
    .catch(function (err) {
      throw err;
    });
}

function showWindow(window) {
  if (process.platform === "darwin") app.dock.show();
  window.show();
  if (SplashScreenIsHidden) {
    SplashScreenIsHidden = false;
    setTimeout(function () {
      mainWindow.webContents.send("initial-checks");
    }, 4000);
  }
}

function hideWindow(window) {
  window.hide();
  if (process.platform === "darwin") app.dock.hide();
}

function closeApp() {
  app.isQuiting = true;
  config.set("winBounds", mainWindow.getBounds());
  config.set("isMaximized", mainWindow.isMaximized());
  app.quit();
}

function createTray() {
  if (!config.get("darkTrayIcon")) {
    config.set("darkTrayIcon", false);
  }

  var iconPath = creatTrayIconPath();
  tray = new Tray(iconPath);

  if (!config.get("openLabel")) {
    config.set("openLabel", "Open");
    config.set("quitLabel", "Quit");
  }

  trayMenuTemplate = [
    {
      label: config.get("openLabel"),
      click() {
        if (config.get("isMaximized")) mainWindow.maximize();
        showWindow(mainWindow);
        setTimeout(hideSplashScreen, 5000);
      },
    },
    {
      label: config.get("quitLabel"),
      click() {
        app.isQuiting = true;
        config.set("winBounds", mainWindow.getBounds());
        config.set("isMaximized", mainWindow.isMaximized());
        app.quit();
      },
    },
  ];

  trayContextMenu = Menu.buildFromTemplate(trayMenuTemplate);
  tray.setToolTip("ITQ Todo");
  tray.setContextMenu(trayContextMenu);
  tray.on("click", () => {
    tray.popUpContextMenu();
  });
}

function creatTrayIconPath() {
  const path = require("path");
  const darkPrefix = config.get("darkTrayIcon") ? "Dark" : "";

  var iconPath;
  if (process.platform === "win32") {
    app.setAppUserModelId("ITQTodo");
    iconPath = path.join(__dirname, `/trayIcon${darkPrefix}.ico`);
  } else if (process.platform === "darwin") {
    iconPath = nativeImage.createFromPath(path.join(__dirname, `/trayIcon${darkPrefix}.png`));
  } else {
    iconPath = isServeMode()
      ? path.join(__dirname, `/bundled/trayIcon${darkPrefix}@3x.png`)
      : path.join(__dirname, `/trayIcon${darkPrefix}@3x.png`);
  }
  return iconPath;
}
