@echo off
setlocal enabledelayedexpansion

rem === Configuration: portable Node.js folder and project folder ===
set "NODE_DIR=C:\Users\pafervi2\Downloads\node-v24.21.0-win-x64"
set "PROJECT_DIR=%~dp0"

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

rem Call npm/npx through their JS entry points directly via node.exe.
rem This avoids relying on npm.cmd / npx.cmd, which some locked-down
rem Windows setups block by stripping .CMD from PATHEXT.
set "NPM_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npm-cli.js"
set "NPX_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npx-cli.js"

if not exist "%NPM_CLI%" (
    echo.
    echo ERROR: could not find npm-cli.js next to node.exe
    echo Expected at: %NPM_CLI%
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

if not exist ".npmrc" (
    echo Creating .npmrc ...
    (
        echo engine-strict=false
        echo fund=false
        echo audit=false
    ) > ".npmrc"
)

if not exist "node_modules" (
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

rem The project registers an Electron build plugin that vue-cli-service loads
rem for every command, even the plain web "serve". That plugin requires the
rem "electron" package at load time, which needs its runtime binary
rem downloaded. We skip electron-builder's own postinstall (which needs
rem native build tools we don't have here) but still fetch just the plain
rem Electron binary so the plugin does not crash on require.
if not exist "node_modules\electron\dist\electron.exe" (
    if exist "node_modules\electron\install.js" (
        echo.
        echo Downloading the Electron runtime needed by a project plugin...
        echo (only needed once; not used by the web version you are about to test)
        echo.
        "%NODE_EXE%" "node_modules\electron\install.js"
        if errorlevel 1 (
            echo.
            echo WARNING: could not download the Electron runtime ^(probably blocked
            echo by the network/proxy^). Trying to continue anyway, the web version
            echo does not actually need Electron to run.
            echo.
        )
    )
)

rem Webpack 4 (used by this project) calls Node's crypto module in a way
rem that breaks under OpenSSL 3 (Node 17+), the classic
rem "error:0308010C:digital envelope routines::unsupported" crash.
rem This flag switches Node back to the legacy provider for this process only.
set "NODE_OPTIONS=--openssl-legacy-provider"

echo.
echo Starting WeekToDo, this will open your browser automatically...
echo (Leave this window open while you are testing the app. Close it to stop.)
echo.
"%NODE_EXE%" "%NPX_CLI%" vue-cli-service serve --open

pause
