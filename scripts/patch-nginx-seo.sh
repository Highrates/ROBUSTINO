#!/usr/bin/env bash
# Patch nginx SEO HTML shells — tolerant of various `location /` styles.
# Usage: bash /root/robustino/scripts/patch-nginx-seo.sh [/etc/nginx/sites-enabled/default]

set -euo pipefail

SITE_CONF="${1:-}"
if [[ -z "$SITE_CONF" ]]; then
  for c in /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/robustino \
           /etc/nginx/sites-available/default /etc/nginx/sites-available/robustino; do
    if [[ -f "$c" ]]; then SITE_CONF="$c"; break; fi
  done
fi

if [[ -z "${SITE_CONF:-}" || ! -f "$SITE_CONF" ]]; then
  echo "Не найден nginx site conf"
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
  exit 1
fi

echo "Conf: $SITE_CONF"
echo "--- location / candidates ---"
grep -nE '^\s*location\s+/' "$SITE_CONF" | head -40 || true

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

# Remove previous SEO blocks (marker-based, non-greedy until blank line before next location or EOF of block)
text2 = re.sub(
    r"[ \t]*# robustino-seo-routes\n(?:[ \t]*location[\s\S]*?\n[ \t]*\}\n*)+",
    "",
    text,
)

# Match catch-all SPA root: `location / {` or `location /` then `{` on next line
# Exclude /api /media /assets /supabase etc.
patterns = [
    re.compile(r'(^[ \t]*location[ \t]+/[ \t]*\{)', re.M),
    re.compile(r'(^[ \t]*location[ \t]+/[ \t]*\n[ \t]*\{)', re.M),
]

matches = []
for pat in patterns:
    matches = list(pat.finditer(text2))
    if matches:
        break

# Fallback: insert before every `location /api` is wrong; try location that proxies to serve/pm2
if not matches:
    # Any exact path location / with proxy_pass or try_files
    for m in re.finditer(r'(^[ \t]*location[ \t]+/[ \t].*$)', text2, re.M):
        line = m.group(1)
        if re.search(r'location\s+/[a-zA-Z0-9_\-{]', line):
            continue  # /api /media /product etc.
        if re.match(r'^[ \t]*location[ \t]+/[ \t]*(\{|$)', line) or re.match(r'^[ \t]*location[ \t]+/[ \t]+', line):
            # verify it's really only "/"
            if re.match(r'^[ \t]*location[ \t]+/[ \t]*(\{|;|$)', line) or re.match(r'^[ \t]*location[ \t]+/\s*$', line):
                matches.append(m)
    # de-dup by start
    seen = set()
    uniq = []
    for m in matches:
        if m.start() not in seen:
            seen.add(m.start())
            uniq.append(m)
    matches = uniq

if not matches:
    print("FAIL: не нашёл catch-all location /")
    print("Покажите: grep -nE 'location' " + path)
    raise SystemExit(2)

out = []
last = 0
for m in matches:
    out.append(text2[last:m.start()])
    out.append(snippet)
    out.append(m.group(0) if m.lastindex is None else m.group(1) if m.lastindex >= 1 else m.group(0))
    # If pattern captured only start, need full match
    last = m.end()
# Fix: always use full match span
out = []
last = 0
for m in matches:
    out.append(text2[last:m.start()])
    out.append(snippet)
    out.append(text2[m.start():m.end()])
    last = m.end()
out.append(text2[last:])
open(path, "w").write("".join(out))
print(f"Patched {path}: SEO block before {len(matches)}× location /")
PY

nginx -t
systemctl reload nginx
echo "Reloaded."

UA='Mozilla/5.0 (compatible; YandexBot/3.0)'
echo "--- public ---"
curl -sS -A "$UA" https://robustino.ru/products | grep -iE '<title>|canonical|seo-content' | head -8 || true
curl -sS -o /dev/null -w "products size=%{size_download} code=%{http_code}\n" -A "$UA" https://robustino.ru/products
