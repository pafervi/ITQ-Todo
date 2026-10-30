@echo off
setlocal enabledelayedexpansion

rem === Configuration: portable Node.js folder ===
rem Edit NODE_DIR to the folder containing your portable Node.js (the one
rem that holds node.exe and the npm bundled next to it). Vite 5 and
rem vite-plugin-electron work on any Node >= 18; a Node 20 LTS or Node 24
rem portable from nodejs.org is fine.
set "NODE_DIR=%USERPROFILE%\node-portable"

rem Project root is one level up from this script.
set "PROJECT_DIR=%~dp0.."

echo Looking for a complete Node.js (node.exe + bundled npm) inside %NODE_DIR% ...
rem There can be more than one node.exe under NODE_DIR (e.g. a leftover
rem partial copy from an earlier extraction attempt). Only accept one that
rem actually has npm bundled next to it, ignore incomplete copies.
set "NODE_EXE="
for /r "%NODE_DIR%" %%f in (node.exe) do (
    if not defined NODE_EXE (
        if exist "%%~dpfnode_modules\npm\bin\npm-cli.js" (
            set "NODE_EXE=%%f"
        )
    )
)

if not defined NODE_EXE (
    echo.
    echo ERROR: could not find a complete Node.js install ^(node.exe + npm^) inside %NODE_DIR%
    echo Delete that folder, re-download the "Windows Binary ^(.zip^)" from nodejs.org,
    echo and extract it fresh, then try again.
    echo.
    pause
    exit /b 1
)

for %%d in ("%NODE_EXE%") do set "NODE_EXE_DIR=%%~dpd"
echo Found Node.js at: %NODE_EXE%
set "PATH=%NODE_EXE_DIR%;%PATH%"

rem Call npm through its JS entry point directly via node.exe.
rem This avoids relying on npm.cmd, which some locked-down Windows
rem setups block by stripping .CMD from PATHEXT.
set "NPM_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npm-cli.js"

if not exist "%NPM_CLI%" (
    echo.
    echo ERROR: could not find npm-cli.js next to node.exe
    echo Expected at: %NPM_CLI%
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

rem Install dependencies if node_modules is missing OR package.json is
rem newer than the installed tree. The second check catches the Vite
rem migration (and any future dependency bump) so you don't end up
rem running an old node_modules against a new package.json.
set "DO_INSTALL="
if not exist "node_modules" set "DO_INSTALL=1"
rem Catch a broken node_modules missing its .bin shims (makes `npm run`
rem fail with "vite: not found").
if not exist "node_modules\.bin\vite.cmd" if not exist "node_modules\.bin\vite" set "DO_INSTALL=1"
if exist "node_modules\.package-lock.json" (
    for %%a in ("package.json") do set "PKG_MTIME=%%~ta"
    for %%b in ("node_modules\.package-lock.json") do set "LOCK_MTIME=%%~tb"
    if "!PKG_MTIME!" GTR "!LOCK_MTIME!" set "DO_INSTALL=1"
)

if defined DO_INSTALL (
    rem A stale node_modules + package-lock.json can block npm from
    rem resolving a new dependency tree (ERESOLVE on peer deps). When
    rem package.json has changed we wipe both and let npm rebuild from
    rem scratch, which is slower but always correct.
    if exist "node_modules" (
        echo.
        echo package.json changed; removing stale node_modules...
        rmdir /s /q "node_modules"
    )
    if exist "package-lock.json" del /q "package-lock.json"
    echo.
    echo Installing dependencies, this can take a few minutes the first time...
    echo.
    "%NODE_EXE%" "%NPM_CLI%" install --ignore-scripts
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed. See the messages above.
        pause
        exit /b 1
    )
)

if not exist "node_modules\electron\dist\electron.exe" (
    if exist "node_modules\electron\install.js" (
        echo.
        echo Downloading the Electron runtime needed to build the app...
        echo.
        "%NODE_EXE%" "node_modules\electron\install.js"
        if errorlevel 1 (
            echo.
            echo ERROR: could not download the Electron runtime ^(probably blocked
            echo by the network/proxy^). The build cannot continue without it.
            echo.
            pause
            exit /b 1
        )
    )
)

rem Vite + rollup do not need --openssl-legacy-provider. The flag was a
rem workaround for webpack 4, which this project no longer uses.

echo.
echo Building ITQ Todo (installer + portable .exe), this can take a few minutes...
echo.
"%NODE_EXE%" "%NPM_CLI%" run electron:build
if errorlevel 1 (
    echo.
    echo ERROR: the build failed. See the messages above.
    pause
    exit /b 1
)

echo.
echo Done. Look inside the "release" folder for:
echo   - "ITQ Todo Setup ^<version^>.exe"  (the normal installer)
echo   - "ITQ Todo ^<version^>.exe"        (the portable version, no install needed)
echo.
pause
