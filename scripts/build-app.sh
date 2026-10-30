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

# Vite 5 and vite-plugin-electron need Node >= 18. We target Node 20 LTS;
# abort on anything older.
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node $NODE_MAJOR detected, need Node 18+ (20 LTS recommended)." >&2
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash" >&2
  echo "  source ~/.nvm/nvm.sh && nvm install 20 && nvm use 20" >&2
  exit 1
fi

# Install deps if node_modules is missing, incomplete, OR package.json is
# newer than the installed tree. The three checks catch (a) a fresh clone,
# (b) a broken node_modules missing its .bin shims (which makes `npm run`
# fail with "vite: not found"), and (c) a dependency bump since the last
# install.
need_install=0
if [ ! -d node_modules ]; then
  need_install=1
elif [ ! -x node_modules/.bin/vite ]; then
  echo "node_modules/.bin/vite missing; node_modules is incomplete."
  need_install=1
elif [ -f node_modules/.package-lock.json ] && [ package.json -nt node_modules/.package-lock.json ]; then
  need_install=1
fi

if [ "$need_install" -eq 1 ]; then
  # A stale node_modules + package-lock.json can block npm from resolving
  # a new dependency tree (ERESOLVE on peer deps). Wipe both when
  # package.json has changed so npm rebuilds from scratch.
  if [ -d node_modules ]; then
    echo "package.json changed; removing stale node_modules..."
    rm -rf node_modules
  fi
  [ -f package-lock.json ] && rm -f package-lock.json
  echo "Installing dependencies..."
  npm install --ignore-scripts
fi

# Vite + rollup do not need --openssl-legacy-provider. The flag was a
# workaround for webpack 4, which this project no longer uses.
export EP_PRE_RELEASE=false

echo "Building ITQ Todo (AppImage + deb)..."
npm run electron:build -- --linux AppImage deb --publish never

echo
echo "Done. Look inside release/ for:"
ls -1 release/*.AppImage release/*.deb 2>/dev/null || true
echo
echo "Install the .deb with:   sudo apt install ./release/itq-todo_*_amd64.deb"
echo "or run the AppImage:     chmod +x release/*.AppImage && ./release/*.AppImage"
