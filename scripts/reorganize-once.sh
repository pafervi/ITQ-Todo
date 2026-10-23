#!/usr/bin/env bash
# One-shot cleanup for the repo reorganization. The new copies of these
# files already live under scripts/ and docs/. This script git-rm's the
# legacy top-level copies and yarn.lock so the working tree matches the
# intended layout.
#
# Run ONCE from the repo root:
#   bash scripts/reorganize-once.sh
#
# Safe to re-run.

set -euo pipefail
cd "$(dirname "$0")/.."

remove() {
  local f="$1"
  if [ -e "$f" ]; then
    git rm -f "$f" >/dev/null
    echo "removed: $f"
  else
    echo "skip  (not found): $f"
  fi
}

remove build-app.sh
remove build-app.bat
remove cleanup.ps1
remove delete-orphans.ps1
remove restore.ps1
remove session-2026-10-20.md
remove fases-implementacion.md
remove yarn.lock

echo
echo "Done. Review with 'git status', then commit."
