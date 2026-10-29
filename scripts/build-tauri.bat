@echo off
setlocal enabledelayedexpansion

rem Builds the Tauri installer for Windows (NSIS + MSI) using the
rem portable Node.js and the user-level Rust toolchain.

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

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" (
    set "PATH=%CARGO_BIN%;%PATH%"
) else (
    where cargo >nul 2>nul
    if errorlevel 1 (
        echo.
        echo ERROR: Rust toolchain not found.
        echo Install it from https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe ^(no admin required^).
        echo.
        pause
        exit /b 1
    )
)

rem Use the MinGW toolchain for linking because the user does not have
rem Visual Studio Build Tools. See dev-tauri.bat for details.
set "MINGW_BIN=%USERPROFILE%\Downloads\mingw64\bin"
if exist "%MINGW_BIN%\ld.exe" (
    set "PATH=%MINGW_BIN%;%PATH%"
) else (
    echo.
    echo ERROR: MinGW toolchain not found at %MINGW_BIN%
    echo Run the setup-mingw.ps1 helper to install it ^(no admin required^).
    pause
    exit /b 1
)
rem Ensure the GNU target is installed. We pass --target explicitly to
rem tauri below, which overrides the host default (msvc).
"%CARGO_BIN%\rustup.exe" target list --installed 2>nul | find "x86_64-pc-windows-gnu" >nul
if errorlevel 1 (
    echo Installing x86_64-pc-windows-gnu Rust target...
    "%CARGO_BIN%\rustup.exe" target add x86_64-pc-windows-gnu
    if errorlevel 1 (
        echo ERROR: failed to add x86_64-pc-windows-gnu target. Check network/proxy.
        pause
        exit /b 1
    )
)

cd /d "%PROJECT_DIR%"

set "DO_INSTALL="
if not exist "node_modules" set "DO_INSTALL=1"
if exist "node_modules\.package-lock.json" (
    for %%a in ("package.json") do set "PKG_MTIME=%%~ta"
    for %%b in ("node_modules\.package-lock.json") do set "LOCK_MTIME=%%~tb"
    if "!PKG_MTIME!" GTR "!LOCK_MTIME!" set "DO_INSTALL=1"
)

if defined DO_INSTALL (
    if exist "node_modules" (
        echo package.json changed; removing stale node_modules...
        rmdir /s /q "node_modules"
    )
    if exist "package-lock.json" del /q "package-lock.json"
    echo Installing Node dependencies...
    "%NODE_EXE%" "%NPM_CLI%" install --ignore-scripts
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo Building ITQ Todo with Tauri (NSIS installer + MSI). First build compiles Rust and may take 10-15 minutes.
echo.
rem The `--` separates npm args from the args forwarded to the tauri CLI.
"%NODE_EXE%" "%NPM_CLI%" run tauri:build -- --target x86_64-pc-windows-gnu
if errorlevel 1 (
    echo ERROR: tauri build failed.
    pause
    exit /b 1
)

echo.
echo Done. Look inside src-tauri\target\x86_64-pc-windows-gnu\release\bundle\ for the installers:
echo   - nsis\ITQ Todo_^<version^>_x64-setup.exe
echo   - msi\ITQ Todo_^<version^>_x64_en-US.msi
echo.
pause
