#!/usr/bin/env bash
# Enable SEO HTML shells on prod (API env + nginx document routes).
#
#   cd /root/robustino && bash scripts/enable-seo-html-shell.sh
#
# Does NOT source .env (avoids breaking bcrypt ADMIN_PASSWORD).

set -euo pipefail

REPO="${REPO:-/root/robustino}"
API_DIR="${API_DIR:-/root/robustino-api}"
API_ENV="${API_ENV:-$API_DIR/.env}"
SPA_DIST="${SPA_DIST:-/var/www/html}"
SEO_CACHE_DIR="${SEO_CACHE_DIR:-/var/www/html/seo-cache}"
SITE_PUBLIC_URL="${SITE_PUBLIC_URL:-https://robustino.ru}"

cd "$REPO"

upsert_env() {
  local key="$1" val="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    sed -i -E "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$file"
  fi
}

if [[ ! -f "$API_ENV" ]]; then
  echo "Missing $API_ENV"
  exit 1
fi

echo "=== 1) API env ==="
upsert_env SITE_PUBLIC_URL "$SITE_PUBLIC_URL" "$API_ENV"
upsert_env SPA_DIST "$SPA_DIST" "$API_ENV"
upsert_env SEO_CACHE_DIR "$SEO_CACHE_DIR" "$API_ENV"
mkdir -p "$SEO_CACHE_DIR"

if [[ ! -f "$SPA_DIST/index.html" ]]; then
  echo "ERROR: $SPA_DIST/index.html missing — deploy front first:"
  echo "  cd $REPO && npm run build && bash scripts/deploy-front.sh"
  exit 1
fi

echo "=== 2) Deploy + restart API (clean env) ==="
bash "$REPO/scripts/deploy-api.sh" "$REPO" "$API_DIR"

echo "=== 3) Local shell smoke ==="
for path in / /products; do
  code="$(curl -sS -o /tmp/seo-shell.html -w '%{http_code}' -H 'Accept: text/html' "http://127.0.0.1:4000$path" || true)"
  size="$(wc -c < /tmp/seo-shell.html | tr -d ' ')"
  has="$(grep -c 'id="seo-content"' /tmp/seo-shell.html || true)"
  echo "  $path → HTTP $code size=$size seo-content=$has"
  if [[ "$code" != "200" || "$has" == "0" ]]; then
    echo "FAIL: API SEO shell not working for $path (SPA_DIST?)"
    head -c 400 /tmp/seo-shell.html; echo
    exit 1
  fi
done

echo "=== 4) nginx document routes ==="
bash "$REPO/scripts/patch-nginx-seo.sh"

echo "=== 5) Warm SEO cache (optional) ==="
if [[ -f "$API_DIR/scripts/warm-seo-cache.mjs" ]]; then
  (cd "$API_DIR" && node scripts/warm-seo-cache.mjs) || echo "WARN: warm-cache failed (non-fatal)"
fi

echo
echo "Done. Bot check:"
echo "  curl -sA 'YandexBot/3.0' https://robustino.ru/products | grep -E 'title|canonical|seo-content'"
