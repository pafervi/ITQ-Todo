@echo off
setlocal enabledelayedexpansion

rem Launches Vite + Electron in dev mode (hot reload) using the same
rem portable Node.js that build-app.bat uses. No global Node needed.

set "NODE_DIR=C:\Users\pafervi2\Downloads\node-v24.21.0-win-x64"
set "PROJECT_DIR=%~dp0.."

set "NODE_EXE="
for /r "%NODE_DIR%" %%f in (node.exe) do (
    if not defined NODE_EXE (
        if exist "%%~dpfnode_modules\npm\bin\npm-cli.js" (
            set "NODE_EXE=%%f"
        )
    )
)

if not defined NODE_EXE (
    echo ERROR: could not find a complete Node.js install inside %NODE_DIR%
    pause
    exit /b 1
)

for %%d in ("%NODE_EXE%") do set "NODE_EXE_DIR=%%~dpd"
set "PATH=%NODE_EXE_DIR%;%PATH%"
set "NPM_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npm-cli.js"

cd /d "%PROJECT_DIR%"

set "DO_INSTALL="
if not exist "node_modules" set "DO_INSTALL=1"
if exist "node_modules\.package-lock.json" (
    for %%a in ("package.json") do set "PKG_MTIME=%%~ta"
    for %%b in ("node_modules\.package-lock.json") do set "LOCK_MTIME=%%~tb"
    if "!PKG_MTIME!" GTR "!LOCK_MTIME!" set "DO_INSTALL=1"
)

if defined DO_INSTALL (
    rem A stale node_modules + package-lock.json can block npm from
    rem resolving a new dependency tree (ERESOLVE on peer deps). Wipe
    rem both when package.json has changed so npm rebuilds from scratch.
    if exist "node_modules" (
        echo package.json changed; removing stale node_modules...
        rmdir /s /q "node_modules"
    )
    if exist "package-lock.json" del /q "package-lock.json"
    echo Installing dependencies, this can take a few minutes the first time...
    "%NODE_EXE%" "%NPM_CLI%" install --ignore-scripts
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

rem Download the Electron runtime whenever it is missing from node_modules,
rem not only right after an npm install. --ignore-scripts skips Electron's
rem own postinstall, so we have to run its install.js by hand.
if exist "node_modules\electron\install.js" (
    if not exist "node_modules\electron\dist\electron.exe" (
        echo Downloading the Electron runtime...
        "%NODE_EXE%" "node_modules\electron\install.js"
        if errorlevel 1 (
            echo ERROR: could not download the Electron runtime.
            pause
            exit /b 1
        )
    )
)

echo Starting ITQ Todo in dev mode (Vite + Electron). Close the window to stop.
"%NODE_EXE%" "%NPM_CLI%" run dev
