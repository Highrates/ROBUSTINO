#!/usr/bin/env bash
# Patch nginx for SEO routes (sitemap/feed → Express :4000).
# Inserts before EVERY catch-all `location /` (http + https server blocks).
#
# Usage on VPS:
#   bash /root/robustino/scripts/patch-nginx-seo.sh
#   curl -sI https://robustino.ru/sitemap.xml | head -8

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
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location = /feed.yml {
        proxy_pass http://127.0.0.1:4000/api/seo/feed.yml;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

"""

# Remove any previous half-applied blocks so we can re-insert cleanly in every server
text2 = re.sub(
    r"\n?[ \t]*# robustino-seo-routes\n"
    r"[ \t]*location = /sitemap\.xml \{.*?\n[ \t]*\}\n"
    r"[ \t]*location = /feed\.yml \{.*?\n[ \t]*\}\n?",
    "\n",
    text,
    flags=re.S,
)

# Insert before each top-level `location / {` (not location /api, /media, …)
pattern = re.compile(r'(^[ \t]*location[ \t]+/[ \t]*\{)', re.M)
matches = list(pattern.finditer(text2))
if not matches:
    print("Не нашёл location / { — вставьте блок вручную")
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
print(f"Patched {path}: inserted SEO locations before {len(matches)}× location /")
PY

nginx -t
systemctl reload nginx
echo "Reloaded nginx."
echo "--- local API ---"
curl -sS -o /dev/null -w "sitemap local: %{http_code} %{content_type}\n" http://127.0.0.1:4000/api/seo/sitemap.xml || true
echo "--- public ---"
curl -sS -o /dev/null -w "sitemap public: %{http_code} %{content_type}\n" https://robustino.ru/sitemap.xml || true
curl -sS -o /dev/null -w "feed public:    %{http_code} %{content_type}\n" https://robustino.ru/feed.yml || true
