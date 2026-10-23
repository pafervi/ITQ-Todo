# Delete files that are no longer referenced anywhere (calc status, paste queue, old paper tracker).
# Run from repo root: powershell -ExecutionPolicy Bypass -File .\scripts\windows\delete-orphans.ps1
$ErrorActionPreference = "SilentlyContinue"

# Script lives in scripts\windows\, repo root is two levels up.
$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..")
Set-Location $repoRoot

$files = @(
    "src\helpers\calcStatusHelper.js",
    "src\helpers\slurmParser.js",
    "src\views\toDoModal\calcStatusPicker.vue",
    "src\views\pasteQueueModal.vue",
    "src\components\paperTracker.vue"
)
foreach ($f in $files) {
    if (Test-Path $f) {
        Remove-Item -LiteralPath $f -Force
        Write-Host "DELETED: $f" -ForegroundColor Green
    } else {
        Write-Host "SKIP (not present): $f" -ForegroundColor Yellow
    }
}
