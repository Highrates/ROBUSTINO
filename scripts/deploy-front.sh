#!/usr/bin/env bash
# Deploy SPA dist → /var/www/html WITHOUT wiping /media or seo-cache.
# Usage on VPS: bash /root/robustino/scripts/deploy-front.sh
set -euo pipefail

REPO="${1:-/root/robustino}"
SPA_DIST="${SPA_DIST:-/var/www/html}"

cd "$REPO"

if [[ ! -f package.json ]]; then
  echo "No package.json in $REPO"
  exit 1
fi

echo "Build frontend in $REPO"
npm ci
npm run build

if [[ ! -f dist/index.html ]]; then
  echo "ERROR: dist/index.html missing after build"
  exit 1
fi

MEDIA_COUNT_BEFORE="$(find "$SPA_DIST/media" -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "Media files before sync: ${MEDIA_COUNT_BEFORE}"

# Never use bare --delete on $SPA_DIST — that removes /media and seo-cache.
# Exclude persistent dirs; delete only stale SPA assets.
mkdir -p "$SPA_DIST"
rsync -a --delete \
  --exclude media \
  --exclude seo-cache \
  --exclude '.well-known' \
  dist/ "$SPA_DIST/"

MEDIA_COUNT_AFTER="$(find "$SPA_DIST/media" -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "Media files after sync:  ${MEDIA_COUNT_AFTER}"

if [[ "${MEDIA_COUNT_BEFORE}" -gt 0 && "${MEDIA_COUNT_AFTER}" -lt "${MEDIA_COUNT_BEFORE}" ]]; then
  echo "ERROR: media file count dropped (${MEDIA_COUNT_BEFORE} → ${MEDIA_COUNT_AFTER})"
  exit 1
fi

if [[ "${MEDIA_COUNT_AFTER}" -eq 0 ]]; then
  echo "WARN: $SPA_DIST/media has 0 files — catalog images/models will 404."
  echo "  Restore from backup, e.g.:"
  echo "    tar -tzf /root/backups/media-*.tgz | head"
  echo "    tar -xzf /root/backups/media-XXXX.tgz -C /var/www/html"
fi

# Prefer pm2 SPA process if present; nginx static root is enough for many setups
if command -v pm2 >/dev/null 2>&1 && pm2 describe robustino >/dev/null 2>&1; then
  pm2 restart robustino
fi

echo "Done. Spot-check:"
echo "  curl -sI https://robustino.ru/ | head -5"
echo "  curl -sI https://robustino.ru/media/images/products/ | head -5"
