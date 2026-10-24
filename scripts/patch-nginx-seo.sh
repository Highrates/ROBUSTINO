#!/usr/bin/env bash
# Patch nginx: sitemap/feed + public HTML SEO shells → Express :4000.
# Inserts before EVERY catch-all `location / {` (http + https).
#
# Usage on VPS (as root):
#   cd /root/robustino && git pull
#   # ensure SPA_DIST in API .env, then:
#   bash scripts/deploy-api.sh
#   bash scripts/patch-nginx-seo.sh
#
# Verify:
#   curl -sA 'YandexBot/3.0' https://robustino.ru/products | grep -E '<title|canonical|seo-content'

set -euo pipefail

SITE_CONF="${1:-}"
if [[ -z "$SITE_CONF" ]]; then
  for c in /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/robustino \
           /etc/nginx/sites-available/default /etc/nginx/sites-available/robustino; do
    if [[ -f "$c" ]]; then SITE_CONF="$c"; break; fi
  done
fi

if [[ -z "${SITE_CONF:-}" || ! -f "$SITE_CONF" ]]; then
  echo "Не найден nginx site conf. Передайте путь:"
  echo "  bash $0 /etc/nginx/sites-enabled/YOUR_SITE"
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
  exit 1
fi

python3 - "$SITE_CONF" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()

snippet = """    # robustino-seo-routes
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:4000/api/seo/sitemap.xml;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location = /feed.yml {
        proxy_pass http://127.0.0.1:4000/api/seo/feed.yml;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location = / {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Accept $http_accept;
    }
    location ~ ^/(products|about|articles|projects|upholstery)/?$ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Accept $http_accept;
    }
    location ~ ^/(product|article|page)/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Accept $http_accept;
    }

"""

# Drop any previous SEO block(s) (old sitemap-only or full)
text2 = re.sub(
    r"[ \t]*# robustino-seo-routes\n(?:[ \t]*location[^\n]+\n(?:[ \t]+[^\n]+\n)*[ \t]*\}\n*)+",
    "",
    text,
    flags=re.M,
)

# Insert before each top-level `location / {` (not /api, /media, …)
pattern = re.compile(r'(^[ \t]*location[ \t]+/[ \t]*\{)', re.M)
matches = list(pattern.finditer(text2))
if not matches:
    print("Не нашёл location / { — вставьте блок вручную из deploy/nginx-seo.conf.example")
    raise SystemExit(2)

out = []
last = 0
for m in matches:
    out.append(text2[last:m.start()])
    out.append(snippet)
    out.append(m.group(1))
    last = m.end()
out.append(text2[last:])
open(path, "w").write("".join(out))
print(f"Patched {path}: SEO HTML shell before {len(matches)}× location /")
PY

nginx -t
systemctl reload nginx
echo "Reloaded nginx."

echo "--- local API (needs SPA_DIST) ---"
curl -sS -o /dev/null -w "GET /            %{http_code} size=%{size_download}\n" \
  -H 'Accept: text/html' http://127.0.0.1:4000/ || true
curl -sS -o /dev/null -w "GET /products    %{http_code} size=%{size_download}\n" \
  -H 'Accept: text/html' http://127.0.0.1:4000/products || true

echo "--- public bot view ---"
UA='Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
for path in / /products; do
  echo ">>> $path"
  curl -sS -A "$UA" "https://robustino.ru$path" \
    | grep -iE '<title>|rel="canonical"|id="seo-content"|<h1' | head -8 || true
done
SLUG="$(curl -sS https://robustino.ru/sitemap.xml | grep -oE 'https://robustino.ru/product/[^<]+' | head -1 | sed 's|https://robustino.ru||')"
if [[ -n "${SLUG:-}" ]]; then
  echo ">>> $SLUG"
  curl -sS -A "$UA" "https://robustino.ru$SLUG" \
    | grep -iE '<title>|rel="canonical"|id="seo-content"|<h1' | head -8 || true
fi
echo
echo "Expect: unique title/canonical per URL and #seo-content with H1 (not bare SPA shell)."
