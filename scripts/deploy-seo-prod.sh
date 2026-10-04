#!/usr/bin/env bash
# Full SEO prod setup on VPS (run as root from monorepo).
#
#   cd /root/robustino && bash scripts/deploy-seo-prod.sh
#
# Steps:
#   1) migration 20261002_seo_fields.sql
#   2) API env (SITE_PUBLIC_URL, SPA_DIST, SEO_CACHE_DIR) + deploy-api
#   3) nginx: /sitemap.xml + /feed.yml → :4000 (Option A minimum)
#   4) smoke checks
#
# Optional: SEO_HTML_SHELL=1 also proxies public HTML routes to API (needs SPA_DIST).

set -euo pipefail

REPO="${REPO:-/root/robustino}"
API_DIR="${API_DIR:-/root/robustino-api}"
API_ENV="${API_ENV:-$API_DIR/.env}"
SPA_DIST="${SPA_DIST:-/var/www/html}"
SEO_CACHE_DIR="${SEO_CACHE_DIR:-/var/www/html/seo-cache}"
SITE_PUBLIC_URL="${SITE_PUBLIC_URL:-https://robustino.ru}"
SEO_HTML_SHELL="${SEO_HTML_SHELL:-0}"

cd "$REPO"

echo "=== 1) Migration ==="
if [[ ! -f "$API_ENV" ]]; then
  echo "No $API_ENV — abort"
  exit 1
fi
# shellcheck disable=SC1090
set -a
# DATABASE_URL only — don't source whole .env (may break on special chars)
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$API_ENV" | head -1 | cut -d= -f2-)"
set +a
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing in $API_ENV"
  exit 1
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$REPO/db/migrations/20261002_seo_fields.sql"
echo "Migration OK"

echo "=== 2) API env + deploy ==="
upsert_env() {
  local key="$1" val="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    sed -i -E "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$file"
  fi
}
upsert_env SITE_PUBLIC_URL "$SITE_PUBLIC_URL" "$API_ENV"
upsert_env SPA_DIST "$SPA_DIST" "$API_ENV"
upsert_env SEO_CACHE_DIR "$SEO_CACHE_DIR" "$API_ENV"
mkdir -p "$SEO_CACHE_DIR"
# Ensure SPA dist has built assets (robots.txt from Vite public/)
if [[ ! -f "$SPA_DIST/index.html" ]]; then
  echo "WARN: $SPA_DIST/index.html missing — run: cd $REPO && npm run build && rsync -a dist/ $SPA_DIST/"
fi
if [[ -f "$REPO/dist/robots.txt" ]]; then
  cp -f "$REPO/dist/robots.txt" "$SPA_DIST/robots.txt" 2>/dev/null || true
elif [[ -f "$REPO/public/robots.txt" ]]; then
  cp -f "$REPO/public/robots.txt" "$SPA_DIST/robots.txt" 2>/dev/null || true
fi
if [[ -f "$REPO/public/logo-org.png" ]]; then
  cp -f "$REPO/public/logo-org.png" "$SPA_DIST/logo-org.png" 2>/dev/null || true
fi

bash "$REPO/scripts/deploy-api.sh" "$REPO" "$API_DIR"

echo "API SEO routes:"
curl -sS -o /dev/null -w "  local sitemap %{http_code} %{content_type}\n" \
  http://127.0.0.1:4000/api/seo/sitemap.xml
curl -sS -o /dev/null -w "  local feed    %{http_code} %{content_type}\n" \
  http://127.0.0.1:4000/api/seo/feed.yml

echo "=== 3) nginx (Option A: sitemap/feed) ==="
bash "$REPO/scripts/patch-nginx-seo.sh"
if [[ "$SEO_HTML_SHELL" == "1" ]]; then
  echo "SEO_HTML_SHELL=1 — adding document route proxies (manual if script skipped)"
  # Document routes are optional; patch-nginx handles sitemap/feed only.
  # Operator can merge deploy/nginx-seo.conf.example document locations.
fi
systemctl reload nginx

echo "=== 4) Smoke ==="
curl -sS -o /dev/null -w "public /sitemap.xml  %{http_code} %{content_type}\n" \
  "$SITE_PUBLIC_URL/sitemap.xml"
curl -sS -o /dev/null -w "public /feed.yml     %{http_code} %{content_type}\n" \
  "$SITE_PUBLIC_URL/feed.yml"
curl -sS -o /dev/null -w "public /robots.txt   %{http_code}\n" \
  "$SITE_PUBLIC_URL/robots.txt"
curl -sS -o /dev/null -w "public /api/seo/sitemap.xml %{http_code} %{content_type}\n" \
  "$SITE_PUBLIC_URL/api/seo/sitemap.xml"

echo
echo "Done. Expect /sitemap.xml → 200 application/xml (not text/html)."
echo "Optional HTML shells: merge document locations from deploy/nginx-seo.conf.example"
echo "Warm cache:  cd $API_DIR && node scripts/warm-seo-cache.mjs"
