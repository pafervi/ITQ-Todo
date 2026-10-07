# ITQ-Todo restore: move back the 6 "orphan" files that were in fact imported.
# The audit I trusted was wrong. The duplicated weektodo\ folder and the stale
# public\img\logo-*.svg stay in _to_delete\, those are safe to remove.
# Run from the repo root:
#   cd C:\Users\pafervi2\Documents\GitHub\ITQ-Todo
#   powershell -ExecutionPolicy Bypass -File .\restore.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$trash = Join-Path $repoRoot "_to_delete"

# Files that were falsely flagged as unused; relative to repo root.
$items = @(
    "src\helpers\initialDataCreator.js",
    "src\helpers\markdownTargetBlankLinks.js",
    "src\helpers\listTemplates.js",
    "src\helpers\slurmParser.js",
    "src\repositories\repeatingEventByDateRepository.js",
    "src\components\productivityHeatmap.vue"
)

foreach ($rel in $items) {
    $src = Join-Path $trash $rel
    $dst = Join-Path $repoRoot $rel
    if (-not (Test-Path $src)) {
        Write-Host "SKIP (not in _to_delete): $rel" -ForegroundColor Yellow
        continue
    }
    $dstDir = Split-Path -Parent $dst
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }
    Move-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "RESTORED: $rel" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. _to_delete\ still holds the duplicated weektodo\ folder and" -ForegroundColor Cyan
Write-Host "the stale public\img\logo-color.svg / logo-white.svg, which are safe" -ForegroundColor Cyan
Write-Host "to delete. Rebuild to confirm:" -ForegroundColor Cyan
Write-Host "  .\build-app.bat" -ForegroundColor Cyan
