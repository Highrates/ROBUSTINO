#!/usr/bin/env bash
# Diagnose / restore /var/www/html/media after accidental rsync --delete.
# Run on VPS as root.
set -euo pipefail

SPA_DIST="${SPA_DIST:-/var/www/html}"
MEDIA="$SPA_DIST/media"

echo "=== nginx media location ==="
grep -Rn "location.*/media\|alias.*media\|root.*/var/www" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -40 || true

echo
echo "=== media on disk ==="
if [[ -d "$MEDIA" ]]; then
  echo "dir: $MEDIA"
  ls -la "$MEDIA" | head -20
  echo "files: $(find "$MEDIA" -type f | wc -l | tr -d ' ')"
else
  echo "MISSING: $MEDIA"
fi

echo
echo "=== possible backups ==="
find /root /var/backups /home /opt -maxdepth 4 \( -name '*media*.tgz' -o -name '*media*.tar*' -o -name '*media*.zip' -o -type d -name 'media' \) 2>/dev/null | head -40 || true

echo
echo "=== sample API image vs disk ==="
SAMPLE="$(curl -sS http://127.0.0.1:4000/api/products 2>/dev/null | python3 -c '
import sys,json
items=json.load(sys.stdin)
for p in items:
  imgs=p.get("images") or []
  if imgs:
    print(imgs[0]); break
' 2>/dev/null || true)"
echo "API sample: ${SAMPLE:-none}"
if [[ -n "${SAMPLE:-}" ]]; then
  rel="${SAMPLE#https://robustino.ru/media/}"
  rel="${rel#http://robustino.ru/media/}"
  echo "disk path: $MEDIA/$rel"
  ls -la "$MEDIA/$rel" 2>&1 || true
  curl -sS -o /dev/null -w "public HTTP %{http_code}\n" "$SAMPLE" || true
fi

echo
echo "If media was wiped by: rsync -a --delete dist/ /var/www/html/"
echo "restore from the newest backup, e.g.:"
echo "  mkdir -p $MEDIA"
echo "  tar -xzf /root/backups/media-YYYYMMDD.tgz -C $SPA_DIST"
echo "  chown -R www-data:www-data $MEDIA"
echo "  find $MEDIA -type f | wc -l"
echo
echo "Going forward use: bash scripts/deploy-front.sh  (excludes media from --delete)"
