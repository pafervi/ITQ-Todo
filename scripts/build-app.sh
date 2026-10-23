#!/usr/bin/env bash
# Builds ITQ Todo for Linux: AppImage (portable) + .deb (installable).
# Run from the project root or from inside scripts/:
#   ./scripts/build-app.sh
set -euo pipefail

# Move to the project root (one level up from scripts/).
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20 LTS (nvm recommended) and retry." >&2
  exit 1
fi

# Webpack 4 needs OpenSSL legacy (Node 17+); electron-builder, vite tooling, vue-i18n
# all require Node >= 18. We target Node 20 LTS; abort on anything older.
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node $NODE_MAJOR detected, need Node 18+ (20 LTS recommended)." >&2
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash" >&2
  echo "  source ~/.nvm/nvm.sh && nvm install 20 && nvm use 20" >&2
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
