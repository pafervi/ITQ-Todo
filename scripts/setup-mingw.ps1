# One-shot setup helper for the MinGW-w64 toolchain. Downloads a portable
# zip from winlibs.com into $HOME\Downloads\mingw64\ and tells rustup to
# add the x86_64-pc-windows-gnu target that Tauri will build against.
#
# No admin required. Run from PowerShell:
#   .\scripts\setup-mingw.ps1
#
# After this, scripts\dev-tauri.bat and scripts\build-tauri.bat find the
# toolchain automatically.

$ErrorActionPreference = "Stop"
Set-Location "$HOME\Downloads"

$zipName = "winlibs-mingw.zip"
$zipUrl  = "https://github.com/brechtsanders/winlibs_mingw/releases/download/14.2.0posix-19.1.1-12.0.0-ucrt-r2/winlibs-x86_64-posix-seh-gcc-14.2.0-mingw-w64ucrt-12.0.0-r2.zip"

if (-not (Test-Path $zipName)) {
    Write-Host "Downloading winlibs mingw-w64 (~160 MB)..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipName
} else {
    Write-Host "winlibs zip already downloaded, skipping fetch."
}

if (-not (Test-Path "mingw64\bin\gcc.exe")) {
    Write-Host "Extracting to $HOME\Downloads\mingw64 (~1 GB)..."
    Expand-Archive -Path $zipName -DestinationPath "." -Force
} else {
    Write-Host "mingw64 already extracted, skipping."
}

Write-Host ""
Write-Host "GCC:" (& "$HOME\Downloads\mingw64\bin\gcc.exe" --version | Select-Object -First 1)
Write-Host "LD:"  ((& "$HOME\Downloads\mingw64\bin\ld.exe" --version | Select-Object -First 1))

Write-Host ""
Write-Host "Adding x86_64-pc-windows-gnu target to Rust..."
& "$HOME\.cargo\bin\rustup.exe" target add x86_64-pc-windows-gnu

Write-Host ""
Write-Host "Done. You can now run scripts\dev-tauri.bat or scripts\build-tauri.bat."
