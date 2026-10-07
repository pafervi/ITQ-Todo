# ITQ-Todo cleanup: move detected orphan files and the duplicated nested repo
# into _to_delete\ preserving relative paths, so Pau can review and delete.
# Run from the repo root:
#   cd C:\Users\pafervi2\Documents\GitHub\ITQ-Todo
#   powershell -ExecutionPolicy Bypass -File .\cleanup.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$trash = Join-Path $repoRoot "_to_delete"
if (-not (Test-Path $trash)) {
    New-Item -ItemType Directory -Path $trash | Out-Null
}

# items to move, relative to repo root
$items = @(
    "weektodo",
    "public\img\logo-color.svg",
    "public\img\logo-white.svg",
    "src\components\productivityHeatmap.vue",
    "src\helpers\slurmParser.js",
    "src\helpers\initialDataCreator.js",
    "src\helpers\markdownTargetBlankLinks.js",
    "src\helpers\listTemplates.js",
    "src\repositories\repeatingEventByDateRepository.js"
)

foreach ($rel in $items) {
    $src = Join-Path $repoRoot $rel
    if (-not (Test-Path $src)) {
        Write-Host "SKIP (not found): $rel" -ForegroundColor Yellow
        continue
    }
    $dst = Join-Path $trash $rel
    $dstDir = Split-Path -Parent $dst
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }
    Move-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "MOVED: $rel  ->  _to_delete\$rel" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Review _to_delete\ and remove when happy:" -ForegroundColor Cyan
Write-Host "  Remove-Item -Recurse -Force _to_delete" -ForegroundColor Cyan
