#!/usr/bin/env bash
# Diagnose + force-fix SEO nginx routes on VPS.
#   bash /root/robustino/scripts/fix-seo-nginx.sh

set -euo pipefail

echo "=== API ==="
pm2 describe robustino-api 2>/dev/null | grep -E 'status|script path|exec cwd|unstable' || true
curl -sS -o /dev/null -w "health: %{http_code}\n" http://127.0.0.1:4000/api/health || echo "health: FAIL"
curl -sS -o /dev/null -w "seo:    %{http_code} %{content_type}\n" http://127.0.0.1:4000/api/seo/sitemap.xml || echo "seo: FAIL"

echo
echo "=== shared export (API crash cause) ==="
for f in /root/shared/siteChatLimits.js /root/robustino/shared/siteChatLimits.js; do
  if [[ -f "$f" ]]; then
    echo -n "$f: "
    grep -c 'SITE_CHAT_VISITOR_LABEL_MIN' "$f" || echo 0
  else
    echo "$f: MISSING"
  fi
done
ls -la /root/shared 2>/dev/null || true

echo
echo "=== nginx sites ==="
ls -la /etc/nginx/sites-enabled/
echo
echo "=== sitemap locations in nginx -T ==="
nginx -T 2>/dev/null | grep -n 'sitemap\|feed\.yml\|robustino-seo\|server_name\|listen ' | head -80

echo
echo "=== which server answers Host robustino.ru ==="
nginx -T 2>/dev/null | awk '
  /server_name/ { sn=$0 }
  /listen/ { li=$0 }
  /location = \/sitemap.xml/ { print "SITEMAP_IN_BLOCK:", li, "|", sn }
'

CONF=/etc/nginx/sites-enabled/default
echo
echo "=== Force-insert into EVERY server{} that has location /api/ ==="
python3 - "$CONF" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()

snippet = """
    # robustino-seo-routes
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
"""

# Drop old SEO blocks
text = re.sub(
    r"[ \t]*# robustino-seo-routes\n"
    r"[ \t]*location = /sitemap\.xml \{.*?\}[ \t]*\n"
    r"[ \t]*location = /feed\.yml \{.*?\}[ \t]*\n?",
    "",
    text,
    flags=re.S,
)

# Split by server blocks (naive but ok for this conf)
parts = re.split(r'(?=server\s*\{)', text)
out = []
n = 0
for part in parts:
    if not part.strip().startswith('server'):
        out.append(part)
        continue
    if 'location /api' not in part and 'location /api/' not in part:
        out.append(part)
        continue
    # Insert SEO block immediately AFTER opening server { line, before other locations —
    # more reliable than before location / (avoids wrong nesting)
    m = re.search(r'(server\s*\{[^\n]*\n)', part)
    if not m:
        out.append(part)
        continue
    # Prefer insert right before location /api
    m2 = re.search(r'([ \t]*location[ \t]+/api)', part)
    if m2:
        part = part[:m2.start()] + snippet + "\n" + part[m2.start():]
        n += 1
    else:
        part = part[:m.end()] + snippet + "\n" + part[m.end():]
        n += 1
    out.append(part)

open(path, 'w').write(''.join(out))
print(f'Patched {n} server block(s) in {path}')
PY

nginx -t
systemctl reload nginx

echo
echo "=== Verify ==="
curl -sS -o /dev/null -w "local seo:  %{http_code} %{content_type}\n" http://127.0.0.1:4000/api/seo/sitemap.xml || true
curl -sS -k -o /dev/null -w "https local Host: %{http_code} %{content_type}\n" \
  -H 'Host: robustino.ru' https://127.0.0.1/sitemap.xml || true
curl -sS -o /dev/null -w "public:     %{http_code} %{content_type}\n" https://robustino.ru/sitemap.xml || true
curl -sS https://robustino.ru/sitemap.xml | head -3 || true
