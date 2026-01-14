-- ========================================
-- Создание суперпользователя для админ-панели
-- ========================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Откройте Supabase Dashboard > SQL Editor
-- 2. Скопируйте и выполните этот скрипт
-- 3. После выполнения пользователь будет создан
-- 4. Используйте указанные email и пароль для входа
--
-- ВАЖНО: После первого входа смените пароль!
-- ========================================

-- Создание пользователя через Supabase Auth
-- Примечание: В Supabase пользователи создаются через Auth API или Dashboard
-- Этот скрипт показывает, как создать пользователя через SQL (если включена функция)

-- Вариант 1: Создание через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)
-- 1. Перейдите в Supabase Dashboard > Authentication > Users
-- 2. Нажмите "Add user" > "Create new user"
-- 3. Заполните:
--    - Email: admin@robustino.ru (или ваш email)
--    - Password: создайте надежный пароль (минимум 8 символов)
--    - Auto Confirm User: включите (чтобы не требовалась подтверждение email)
-- 4. Сохраните

-- Вариант 2: Создание через SQL (если функция включена)
-- Раскомментируйте, если у вас есть права на создание пользователей через SQL

/*
-- Создание пользователя (требует расширенных прав)
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Создаем пользователя в auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@robustino.ru',
    crypt('ВашПароль123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '',
    ''
  )
  RETURNING id INTO user_id;

  -- Создаем запись в auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    format('{"sub":"%s","email":"%s"}', user_id::text, 'admin@robustino.ru')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );
END $$;
*/

-- ========================================
-- Обновление RLS политик для админа
-- ========================================
-- После создания пользователя, убедитесь, что политики настроены правильно

-- Если нужно дать конкретному пользователю полный доступ,
-- можно создать политику с проверкой email:

/*
-- Пример политики для конкретного email (не рекомендуется для продакшена)
CREATE POLICY "Admin full access by email"
  ON products FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'admin@robustino.ru'
  );

-- Или лучше использовать кастомные claims в JWT токене
-- Настройте это в Supabase Dashboard > Authentication > Policies
*/

-- ========================================
-- Рекомендуемый подход: Использование кастомных ролей
-- ========================================
-- 
-- 1. В Supabase Dashboard > Authentication > Users
--    Найдите созданного пользователя и добавьте в metadata:
--    {
--      "role": "admin"
--    }
--
-- 2. Обновите RLS политики для проверки роли:
--
-- DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
-- CREATE POLICY "Admin can manage products"
--   ON products FOR ALL
--   USING (
--     (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
--   );
--
-- ========================================

-- ========================================
-- Проверка созданного пользователя
-- ========================================
-- Выполните этот запрос, чтобы проверить, что пользователь создан:
-- (Работает только если у вас есть доступ к auth.users)

-- SELECT 
--   id,
--   email,
--   created_at,
--   email_confirmed_at,
--   raw_user_meta_data
-- FROM auth.users
-- WHERE email = 'admin@robustino.ru';

-- ========================================
-- Сброс пароля (если забыли)
-- ========================================
-- В Supabase Dashboard > Authentication > Users
-- Найдите пользователя > Reset Password
-- Или используйте функцию восстановления пароля на странице входа

