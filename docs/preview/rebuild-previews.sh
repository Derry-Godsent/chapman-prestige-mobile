#!/usr/bin/env bash
# Rebuilds both live previews after a workspace reset.
#
# The workspace clears installed files between turns, so this script puts them
# back: the customer app's packages, the staff web system's packages, and the new
# Service Requests page inside the staff system. It does not start the servers.
# Start them with:
#   customer app:  cd chapman-prestige-mobile && npx expo start --port 8081 --offline
#   staff system:  cd /tmp/la && npx vite --config vite.local.config.ts
#
# Usage: bash docs/preview/rebuild-previews.sh

set -euo pipefail

APP_DIR="/home/user/chapman-prestige-mobile"
STAFF_DIR="/tmp/la"
STAFF_REPO="https://github.com/Derry-Godsent/laundry-app.git"
PNPM="node /home/user/.cache/node/corepack/v1/pnpm/9.12.0/bin/pnpm.cjs"

echo "== packages for both projects, in parallel =="

if [ ! -d "$APP_DIR/node_modules" ]; then
  ( corepack prepare pnpm@9.12.0 --activate >/dev/null 2>&1
    cd "$APP_DIR" && $PNPM install --frozen-lockfile >/tmp/app-install.log 2>&1
    echo "customer app packages ready" ) &
fi

if [ ! -d "$STAFF_DIR" ]; then
  ( git clone --depth 1 --filter=blob:none --sparse "$STAFF_REPO" "$STAFF_DIR" >/tmp/staff-clone.log 2>&1
    cd "$STAFF_DIR" && git sparse-checkout set src supabase >/dev/null 2>&1
    npm install --no-audit --no-fund >/tmp/staff-install.log 2>&1
    echo "staff system packages ready" ) &
fi

wait

echo "== the Service Requests page inside the staff system =="
cp "$APP_DIR/docs/staff-web-app/ServiceRequests.tsx" "$STAFF_DIR/src/pages/"
cp "$APP_DIR/docs/staff-web-app/ServiceRequests.css" "$STAFF_DIR/src/pages/"
cp "$APP_DIR/docs/staff-web-app/vite.preview.config.ts" "$STAFF_DIR/vite.local.config.ts"

cd "$STAFF_DIR"
if git apply --check "$APP_DIR/docs/staff-web-app/wiring.patch" 2>/dev/null; then
  git apply "$APP_DIR/docs/staff-web-app/wiring.patch"
  echo "wiring applied"
else
  echo "wiring already in place"
fi

echo "== done, start the servers =="
ls -d "$APP_DIR/node_modules" "$STAFF_DIR/node_modules" >/dev/null
