@echo off
setlocal enabledelayedexpansion

set "NODE_DIR=C:\Users\pafervi2\Downloads\node-v24.21.0-win-x64"
set "PROJECT_DIR=%~dp0"

echo Looking for a complete Node.js (node.exe + bundled npm) inside %NODE_DIR% ...
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
    echo ERROR: could not find a complete Node.js install inside %NODE_DIR%
    pause
    exit /b 1
)

for %%d in ("%NODE_EXE%") do set "NODE_EXE_DIR=%%~dpd"
set "NPM_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npm-cli.js"
set "NPX_CLI=%NODE_EXE_DIR%node_modules\npm\bin\npx-cli.js"

cd /d "%PROJECT_DIR%"

if not exist "node_modules\vitest" (
    echo.
    echo Installing/updating dependencies (this project now uses vitest for tests)...
    echo.
    "%NODE_EXE%" "%NPM_CLI%" install --ignore-scripts
)

echo.
echo Running unit tests...
echo.
"%NODE_EXE%" "%NPX_CLI%" vitest run

pause
