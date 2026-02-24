#!/usr/bin/env bash
# Применяет CORS и client_max_body_size для Supabase в /etc/nginx/sites-available/default.
# Запускать на сервере с sudo: sudo bash apply-nginx-supabase-cors.sh

set -e
NGINX_DEFAULT="/etc/nginx/sites-available/default"
BACKUP="${NGINX_DEFAULT}.bak.$(date +%Y%m%d%H%M%S)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$NGINX_DEFAULT" ]]; then
  echo "Файл $NGINX_DEFAULT не найден."
  exit 1
fi

cp "$NGINX_DEFAULT" "$BACKUP"
echo "Резервная копия: $BACKUP"

python3 << 'PYTHON'
import re
path = "/etc/nginx/sites-available/default"
with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

# Блок map для CORS (один раз в начале)
map_block = """map $http_origin $cors_origin {
    default "";
    "https://robustino.ru" $http_origin;
    "http://localhost:3000" $http_origin;
    "http://localhost:3001" $http_origin;
}

"""

# Старый блок location /supabase-api/ (без CORS и без client_max_body_size)
old_location = """        location /supabase-api/ {
                rewrite ^/supabase-api/(.*) /$1 break;
                proxy_pass http://127.0.0.1:8000;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_buffering off;
                proxy_read_timeout 86400;
        }"""

# Новый блок (с CORS и client_max_body_size)
new_location = """        location /supabase-api/ {
                client_max_body_size 50M;
                proxy_hide_header Access-Control-Allow-Origin;
                proxy_hide_header Access-Control-Allow-Methods;
                proxy_hide_header Access-Control-Allow-Headers;
                proxy_hide_header Access-Control-Allow-Credentials;
                add_header Access-Control-Allow-Origin $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, x-client-info, accept-profile, content-profile" always;
                add_header Access-Control-Allow-Credentials "true" always;

                if ($request_method = OPTIONS) {
                        return 204;
                }

                rewrite ^/supabase-api/(.*) /$1 break;
                proxy_pass http://127.0.0.1:8000;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_buffering off;
                proxy_read_timeout 86400;
        }"""

changed = False

# 0) Если map уже есть, но без localhost:3001 — добавить
if "map $http_origin $cors_origin" in content and "localhost:3001" not in content:
    content = re.sub(
        r'("http://localhost:3000"\s+\$http_origin;)',
        r'\1\n    "http://localhost:3001" $http_origin;',
        content,
        count=1
    )
    changed = True
    print("Добавлен origin http://localhost:3001 в CORS map.")

# 1) Добавить map перед "# Default server configuration", если ещё нет
if "map $http_origin $cors_origin" not in content:
    content = content.replace(
        "# Default server configuration\n#\nserver {",
        "# Default server configuration\n#\n" + map_block + "server {",
        1
    )
    changed = True
    print("Добавлен блок map для CORS.")
else:
    print("Блок map уже есть.")

# 2) Заменить оба location /supabase-api/ (регулярка — любое форматирование)
# Блок без client_max_body_size и без add_header Access-Control (пробелы/табы любые)
old_pattern = re.compile(
    r'(\s+)location\s+/supabase-api/\s+\{\s+'
    r'rewrite\s+\^/supabase-api/\(\.\*\)\s+/\$1\s+break;\s+'
    r'proxy_pass\s+http://127\.0\.0\.1:8000;\s+'
    r'proxy_http_version\s+1\.1;\s+'
    r'proxy_set_header\s+Host\s+\$host;\s+'
    r'proxy_set_header\s+X-Real-IP\s+\$remote_addr;\s+'
    r'proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;\s+'
    r'proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;\s+'
    r'proxy_buffering\s+off;\s+'
    r'proxy_read_timeout\s+86400;\s+'
    r'\1\}',
    re.MULTILINE
)
# Если уже есть CORS, но без accept-profile — дополняем заголовки (для Supabase REST)
if "add_header Access-Control-Allow-Origin $cors_origin" in content and "accept-profile" not in content and "apikey, x-client-info" in content:
    content = content.replace(
        'add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, x-client-info" always;',
        'add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, x-client-info, accept-profile, content-profile" always;',
        2
    )
    changed = True
    print("Добавлены заголовки accept-profile, content-profile в CORS.")
elif "client_max_body_size 50M" in content and "accept-profile" in content and "proxy_hide_header Access-Control-Allow-Origin" in content:
    print("Блоки location /supabase-api/ уже с полным CORS — пропуск.")
elif "add_header Access-Control-Allow-Origin $cors_origin" in content and "proxy_hide_header Access-Control-Allow-Origin" not in content:
    hide_block = (
        "proxy_hide_header Access-Control-Allow-Origin;\n                "
        "proxy_hide_header Access-Control-Allow-Methods;\n                "
        "proxy_hide_header Access-Control-Allow-Headers;\n                "
        "proxy_hide_header Access-Control-Allow-Credentials;\n                "
    )
    content = re.sub(
        r'(client_max_body_size 50M;\s+)add_header Access-Control-Allow-Origin',
        r'\1' + hide_block + 'add_header Access-Control-Allow-Origin',
        content,
        count=2
    )
    changed = True
    print("Добавлен proxy_hide_header — в ответе только один CORS origin.")
elif old_pattern.search(content):
    content = old_pattern.sub(
        r'''        location /supabase-api/ {
                client_max_body_size 50M;
                proxy_hide_header Access-Control-Allow-Origin;
                proxy_hide_header Access-Control-Allow-Methods;
                proxy_hide_header Access-Control-Allow-Headers;
                proxy_hide_header Access-Control-Allow-Credentials;
                add_header Access-Control-Allow-Origin $cors_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, x-client-info, accept-profile, content-profile" always;
                add_header Access-Control-Allow-Credentials "true" always;

                if ($request_method = OPTIONS) {
                        return 204;
                }

                rewrite ^/supabase-api/(.*) /$1 break;
                proxy_pass http://127.0.0.1:8000;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_buffering off;
                proxy_read_timeout 86400;
        }''',
        content
    )
    changed = True
    print("Заменены блоки location /supabase-api/ (CORS + client_max_body_size 50M).")
else:
    print("Блок location /supabase-api/ не найден в ожидаемом виде — возможно, правки уже применены или конфиг изменён.")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

PYTHON

echo "Проверка nginx..."
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  echo "Nginx перезагружен. Готово."
else
  echo "Ошибка в конфиге nginx. Восстановите: sudo cp $BACKUP $NGINX_DEFAULT"
  exit 1
fi
