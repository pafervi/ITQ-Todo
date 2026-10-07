# Delete files that are no longer referenced anywhere (calc status, paste queue, old paper tracker).
# Run from repo root: powershell -ExecutionPolicy Bypass -File .\delete-orphans.ps1
$ErrorActionPreference = "SilentlyContinue"
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
