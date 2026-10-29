#!/usr/bin/env bash
# Builds ITQ Todo with Tauri on Linux: AppImage + .deb.
# Run from the project root or from inside scripts/:
#   ./scripts/build-tauri.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20 LTS (nvm recommended)." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "ERROR: Rust toolchain not found." >&2
  echo "Install from your user account (no root required):" >&2
  echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal" >&2
  echo "  source \"\$HOME/.cargo/env\"" >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node $NODE_MAJOR detected, need Node 18+." >&2
  exit 1
fi

# System dev dependencies Tauri needs on Debian/Ubuntu for webkit2gtk.
# We only check and warn; installing them requires sudo.
missing=""
for pkg in libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev build-essential pkg-config; do
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    missing="$missing $pkg"
  fi
done
if [ -n "$missing" ]; then
  echo "WARNING: these system packages are missing and Tauri may fail to link:" >&2
  echo "  $missing" >&2
  echo "Install with: sudo apt install$missing" >&2
fi

need_install=0
if [ ! -d node_modules ]; then
  need_install=1
elif [ -f node_modules/.package-lock.json ] && [ package.json -nt node_modules/.package-lock.json ]; then
  need_install=1
fi

if [ "$need_install" -eq 1 ]; then
  if [ -d node_modules ]; then
    echo "package.json changed; removing stale node_modules..."
    rm -rf node_modules
  fi
  [ -f package-lock.json ] && rm -f package-lock.json
  echo "Installing Node dependencies..."
  npm install --ignore-scripts
fi

echo "Building ITQ Todo with Tauri (AppImage + deb). First build compiles Rust and may take 10-15 minutes."
npm run tauri:build

echo
echo "Done. Look inside src-tauri/target/release/bundle/ for:"
ls -1 src-tauri/target/release/bundle/appimage/*.AppImage src-tauri/target/release/bundle/deb/*.deb 2>/dev/null || true
