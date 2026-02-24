#!/usr/bin/env bash
# Проверка переменных окружения для прода на сервере.
# Запуск: на сервере в папке проекта: bash scripts/check-prod-env.sh

set -e
cd "$(dirname "$0")/.."
echo "=== Текущая папка: $(pwd) ==="
echo ""

echo "--- 1. Файл .env в проекте (если есть) ---"
if [[ -f .env ]]; then
  grep -E "VITE_SUPABASE" .env 2>/dev/null || echo "(нет VITE_SUPABASE в .env)"
else
  echo ".env не найден"
fi
echo ""

echo "--- 2. PM2: переменные процесса robustino ---"
if command -v pm2 &>/dev/null; then
  pm2 show robustino 2>/dev/null | grep -A 200 "env\|NODE_ENV\|exec cwd" || echo "pm2 есть, процесс robustino не найден или нет env в выводе"
  echo ""
  echo "Полный env процесса (последние строки — переменные):"
  pm2 env robustino 2>/dev/null | grep -E "VITE_|SUPABASE" || echo "(VITE_/SUPABASE не найдены в pm2 env)"
else
  echo "pm2 не установлен"
fi
echo ""

echo "--- 3. Что зашито в собранный фронт (dist) ---"
if [[ -d dist ]]; then
  echo "Поиск robustino.ru в JS..."
  grep -ro "https://robustino.ru[^\"]*" dist/ 2>/dev/null | sort -u | head -5
  echo "Поиск supabase.co в JS..."
  grep -ro "https://[a-z]*\.supabase\.co[^\"]*" dist/ 2>/dev/null | sort -u | head -5
  echo "Поиск supabase-api в JS..."
  grep -ro "supabase-api[^\"]*" dist/ 2>/dev/null | sort -u | head -5
else
  echo "Папка dist не найдена (сборка в другой директории?)"
fi
echo ""

echo "--- 4. Скрипт/команда запуска (package.json scripts) ---"
grep -A 2 '"build"\|"start"\|"preview"' package.json 2>/dev/null || true
echo ""
echo "Готово. VITE_SUPABASE_URL должен совпадать с Project URL в Dashboard (например https://zopserojkbhrrrrkllhr.supabase.co)."
