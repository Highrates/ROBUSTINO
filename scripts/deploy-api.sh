#!/usr/bin/env bash
# Deploy Express API from monorepo → /root/robustino-api
# Usage on VPS: bash /root/robustino/scripts/deploy-api.sh
set -euo pipefail

SRC="${1:-/root/robustino}"
DST="${2:-/root/robustino-api}"

if [[ ! -d "$SRC/server/src" ]]; then
  echo "No server at $SRC/server"
  exit 1
fi

echo "Sync $SRC/server → $DST (keep .env, node_modules)"
rsync -a --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude .git \
  "$SRC/server/" "$DST/"

# Imports from src/chat use ../../../shared → /root/shared when DST=/root/robustino-api
# Imports from src use ../../shared → /root/shared
SHARED_LINK="$(dirname "$DST")/shared"
if [[ -d "$SRC/shared" ]]; then
  ln -sfn "$SRC/shared" "$SHARED_LINK"
  echo "symlink $SHARED_LINK → $SRC/shared"
fi

cd "$DST"
npm install --omit=dev

echo "Check modules:"
test -f "$DST/src/db.js" && echo "  src/db.js OK"
test -f "$DST/src/chat/telegramNotify.js" && echo "  telegramNotify.js OK"
test -f "$SHARED_LINK/siteChatLimits.js" && echo "  shared OK ($SHARED_LINK)"

echo "Restart: pm2 restart robustino-api --update-env"
pm2 restart robustino-api --update-env
pm2 show robustino-api | grep -E "status|exec cwd" || true
curl -sS -o /dev/null -w "health HTTP %{http_code}\n" http://127.0.0.1:4000/api/health || true

echo "Telegram reachability:"
curl -sS -o /dev/null -w "api.telegram.org HTTP %{http_code}\n" --connect-timeout 5 https://api.telegram.org || echo "Telegram: UNREACHABLE from this VPS"
