@echo off
setlocal enabledelayedexpansion

rem Launches Vite + Tauri in dev mode (hot reload) using the portable
rem Node.js and the user-level Rust toolchain installed via rustup.
rem No admin rights required for either.

set "NODE_DIR=C:\Users\pafervi2\Downloads\node-v24.21.0-win-x64"
set "PROJECT_DIR=%~dp0.."

rem --- Locate Node ---
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

rem --- Locate Rust (cargo) ---
rem rustup installs under %USERPROFILE%\.cargo\bin; also honor an existing PATH entry.
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" (
    set "PATH=%CARGO_BIN%;%PATH%"
) else (
    where cargo >nul 2>nul
    if errorlevel 1 (
        echo.
        echo ERROR: Rust toolchain not found.
        echo.
        echo Install it from your user account ^(no admin required^):
        echo   1. Download https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe
        echo   2. Run it. Choose "1" ^(Proceed with standard installation^).
        echo   3. Close and reopen the terminal, then run this script again.
        echo.
        pause
        exit /b 1
    )
)

rem --- Locate MinGW (ld.exe linker) ---
rem We use the x86_64-pc-windows-gnu Rust target because the user does
rem not have Visual Studio Build Tools (which provides link.exe for the
rem MSVC target). MinGW ships with ld.exe and gcc.exe, and comes as a
rem portable zip at winlibs.com -- no installer or admin required.
set "MINGW_BIN=%USERPROFILE%\Downloads\mingw64\bin"
if exist "%MINGW_BIN%\ld.exe" (
    set "PATH=%MINGW_BIN%;%PATH%"
) else (
    echo.
    echo ERROR: MinGW toolchain not found at %MINGW_BIN%
    echo Run the setup-mingw.ps1 helper from PowerShell to install it ^(no admin required^).
    echo.
    pause
    exit /b 1
)
rem Install the full stable-x86_64-pc-windows-gnu toolchain (rustc +
rem cargo + std) if missing. We need the whole gnu toolchain, not just
rem the gnu target, because cargo compiles each dependency's build.rs
rem for the HOST, and with a msvc host those build scripts fail at
rem link time looking for link.exe. The existing msvc toolchain stays
rem installed and remains the default for other projects.
"%CARGO_BIN%\rustup.exe" toolchain list 2>nul | find "stable-x86_64-pc-windows-gnu" >nul
if errorlevel 1 (
    echo Installing stable-x86_64-pc-windows-gnu toolchain ^(~300 MB download, 1-2 min^)...
    "%CARGO_BIN%\rustup.exe" toolchain install stable-x86_64-pc-windows-gnu
    if errorlevel 1 (
        echo ERROR: failed to install gnu toolchain. Check network/proxy.
        pause
        exit /b 1
    )
)

cd /d "%PROJECT_DIR%"

rem Pin src-tauri/ to the gnu toolchain so build scripts also compile
rem with gcc as the linker. The override is per-directory and survives
rem across runs; it does not affect any other project on this machine.
"%CARGO_BIN%\rustup.exe" override set --path "%PROJECT_DIR%\src-tauri" stable-x86_64-pc-windows-gnu >nul

rem --- Install Node deps if package.json changed ---
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
    echo Installing Node dependencies, this can take a few minutes the first time...
    "%NODE_EXE%" "%NPM_CLI%" install --ignore-scripts
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

echo Starting ITQ Todo in dev mode (Vite + Tauri). First run compiles Rust (~5-10 min).
rem --target is not needed any more: the per-directory rustup override
rem above makes gnu the host toolchain for src-tauri/, so both build
rem scripts and the main crate build with gcc.
"%NODE_EXE%" "%NPM_CLI%" run tauri:dev
