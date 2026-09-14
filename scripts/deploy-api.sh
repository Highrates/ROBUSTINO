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
  # If /root/shared is a real directory (stale copy), ln -sfn would create
  # /root/shared/shared instead of replacing — wipe and recreate the symlink.
  if [[ -e "$SHARED_LINK" && ! -L "$SHARED_LINK" ]]; then
    echo "Removing stale non-symlink $SHARED_LINK (was blocking shared updates)"
    rm -rf "$SHARED_LINK"
  fi
  ln -sfn "$SRC/shared" "$SHARED_LINK"
  echo "symlink $SHARED_LINK → $(readlink -f "$SHARED_LINK" 2>/dev/null || readlink "$SHARED_LINK")"
  if ! grep -q 'SITE_CHAT_VISITOR_LABEL_MIN' "$SHARED_LINK/siteChatLimits.js"; then
    echo "ERROR: $SHARED_LINK/siteChatLimits.js is outdated (missing SITE_CHAT_VISITOR_LABEL_MIN)"
    exit 1
  fi
fi

cd "$DST"
npm install --omit=dev

echo "Check modules:"
test -f "$DST/src/db.js" && echo "  src/db.js OK"
test -f "$DST/src/chat/telegramNotify.js" && echo "  telegramNotify.js OK"
test -f "$SHARED_LINK/siteChatLimits.js" && echo "  shared OK ($SHARED_LINK)"

echo "Restart: pm2 restart robustino-api --update-env"
pm2 restart robustino-api --update-env
sleep 1
pm2 show robustino-api | grep -E "status|exec cwd" || true
HEALTH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health || true)"
echo "health HTTP ${HEALTH_CODE}"
if [[ "$HEALTH_CODE" != "200" ]]; then
  echo "ERROR: API not healthy after restart — last logs:"
  pm2 logs robustino-api --lines 20 --nostream || true
  exit 1
fi

echo "Telegram reachability:"
curl -sS -o /dev/null -w "api.telegram.org HTTP %{http_code}\n" --connect-timeout 5 https://api.telegram.org || echo "Telegram: UNREACHABLE from this VPS"
