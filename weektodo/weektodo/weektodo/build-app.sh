#!/usr/bin/env bash
# Builds ITQ Todo for Linux: AppImage (portable) + .deb (installable).
# Run it from the project folder on a Linux machine:  ./build-app.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 18+ (https://nodejs.org) and retry." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first time only)..."
  npm install --ignore-scripts
fi

# Webpack 4 breaks under OpenSSL 3 (Node 17+) without the legacy provider.
export NODE_OPTIONS="--openssl-legacy-provider"
# Never try to publish anything.
export EP_PRE_RELEASE=false

echo "Building ITQ Todo (AppImage + deb)..."
npm run electron:build -- --linux AppImage deb --publish never

echo
echo "Done. Look inside dist_electron/ for:"
ls -1 dist_electron/*.AppImage dist_electron/*.deb 2>/dev/null || true
echo
echo "Install the .deb with:   sudo apt install ./dist_electron/itq-todo_*_amd64.deb"
echo "or run the AppImage:     chmod +x dist_electron/*.AppImage && ./dist_electron/*.AppImage"
