#!/usr/bin/env bash
# Проверка окружения продакшена (свой Postgres + Express API + media).
# Запуск на сервере: bash scripts/check-prod-env.sh

set -e
cd "$(dirname "$0")/.."
echo "=== Текущая папка: $(pwd) ==="
echo ""

echo "--- 1. Frontend .env (VITE_API_URL) ---"
if [[ -f .env ]]; then
  grep -E "^VITE_API_URL" .env 2>/dev/null || echo "(VITE_API_URL не задан — по умолчанию /api)"
else
  echo ".env не найден (для Vite-сборки ок, если URL зашит как /api)"
fi
echo ""

echo "--- 2. API .env (/root/robustino-api/.env или ./server/.env) ---"
API_ENV=""
for p in /root/robustino-api/.env ./server/.env; do
  if [[ -f "$p" ]]; then API_ENV="$p"; break; fi
done
if [[ -n "$API_ENV" ]]; then
  echo "Файл: $API_ENV"
  grep -E "^(PORT|DATABASE_URL|JWT_|ADMIN_EMAIL|MEDIA_|COOKIE_|CORS_|NODE_ENV|TELEGRAM_|SITE_PUBLIC)=" "$API_ENV" \
    | sed -E 's/(PASSWORD|SECRET|DATABASE_URL|TELEGRAM_BOT_TOKEN)=.*/\1=***/' || true
  if grep -q '^TELEGRAM_BOT_TOKEN=.\+' "$API_ENV" 2>/dev/null; then
    if grep -qE '^TELEGRAM_CHAT_ID=-?[0-9]+' "$API_ENV" 2>/dev/null || grep -qE '^TELEGRAM_NOTIFY_USERNAME=.+' "$API_ENV" 2>/dev/null; then
      echo "Telegram notify: token + chat target OK"
    else
      echo "WARNING: TELEGRAM_BOT_TOKEN задан, но нет TELEGRAM_CHAT_ID / TELEGRAM_NOTIFY_USERNAME"
    fi
  else
    echo "Telegram notify: не настроен (опционально)"
  fi
  if grep -q '^ADMIN_PASSWORD=\$2' "$API_ENV"; then
    echo "ADMIN_PASSWORD: bcrypt OK"
  else
    echo "WARNING: ADMIN_PASSWORD должен быть bcrypt-хешем (\$2...)"
  fi
else
  echo "API .env не найден"
fi
echo ""

echo "--- 3. PM2 процессы ---"
if command -v pm2 &>/dev/null; then
  pm2 list
  echo ""
  echo "robustino-api status:"
  pm2 show robustino-api 2>/dev/null | grep -E "status|script path|exec cwd|uptime" || echo "robustino-api не найден"
else
  echo "pm2 не установлен"
fi
echo ""

echo "--- 4. Postgres (localhost:5433) ---"
if command -v docker &>/dev/null; then
  docker ps --filter name=robustino-postgres --format '{{.Names}} {{.Status}} {{.Ports}}' || true
fi
if command -v psql &>/dev/null && [[ -n "$API_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$API_ENV" 2>/dev/null || true; set +a
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -c "SELECT count(*) AS products FROM products;" 2>/dev/null || echo "psql: не удалось подключиться"
  fi
fi
echo ""

echo "--- 5. Health / API / media ---"
curl -sS -o /dev/null -w "api/health HTTP %{http_code}\n" http://127.0.0.1:4000/api/health 2>/dev/null || echo "api: недоступен на :4000"
curl -sS -o /dev/null -w "public /api/health HTTP %{http_code}\n" https://robustino.ru/api/health 2>/dev/null || echo "https health: fail"
curl -sS -o /dev/null -w "media sample HTTP %{http_code}\n" \
  "https://robustino.ru/media/images/projects/1770572000119-0-dsc-0054.jpg" 2>/dev/null || echo "media: fail"
echo ""

echo "--- 6. Сборка фронта (dist) ---"
if [[ -d dist ]]; then
  echo "supabase.co в бандле:"
  grep -ro "supabase\.co" dist/ 2>/dev/null | head -3 || echo "(нет — OK)"
  echo "упоминания /api:"
  grep -ro '"/api' dist/assets/*.js 2>/dev/null | head -3 || echo "(проверьте VITE_API_URL)"
else
  echo "dist не найден"
fi
echo ""
echo "Готово. Ожидаемый стек: nginx → /api → Express :4000 → Postgres :5433; /media → /var/www/html/media."
