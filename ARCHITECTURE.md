# Архитектура проекта ROBUSTINO

> Документация по структуре и ключевым решениям проекта

## 📁 Структура проекта

```
ROBUSTINO/
├── src/
│   ├── components/         # React компоненты
│   │   ├── common/        # Header, Footer, ContactsSection, …
│   │   ├── chat/          # SiteChatFab, ChatWindow (сайт ↔ админ)
│   │   ├── home/          # Hero, каталог, FAQ, …
│   │   ├── 3d/            # ChairModel, ModelViewer
│   │   ├── product/       # Navbar
│   │   └── admin/         # AdminLayout, upload, ProtectedRoute, …
│   │
│   ├── pages/             # Страницы + Admin/* (в т.ч. AdminChat)
│   ├── hooks/             # useSiteChat, useChatAttachments, GSAP, …
│   ├── utils/             # api.js, http.js, chatDaySeparator.js
│   ├── store/             # Zustand
│   ├── config/            # buckets.js
│   ├── styles/            # global.css + Tailwind
│   ├── App.jsx
│   └── main.jsx
│
├── shared/                # Общие константы FE+API (siteChatLimits.js)
├── server/                # Express API
│   └── src/
│       ├── chat/          # guest/admin routes, storage, session, service
│       └── routes/        # тонкие mount-точки (/api/chat → chat/)
├── db/                    # schema.sql, migrations (site_chat_*)
├── public/
├── ARCHITECTURE.md
├── PROJECT_STRUCTURE.md
└── package.json
```

---

## 🛠 Технологический стек

### Frontend Core
- **Vite** - сборщик и dev server (быстрый, современный)
- **React 18** - UI библиотека
- **React Router** - клиентский роутинг

### Стилизация
- **Tailwind CSS** - utility-first CSS framework
- **PostCSS + Autoprefixer** - обработка CSS

### 3D визуализация
- **Three.js** - библиотека для 3D графики
- **React Three Fiber** - React renderer для Three.js
- **@react-three/drei** - хелперы для React Three Fiber (Environment, Center, useGLTF)

### Анимации
- **GSAP** - профессиональная библиотека анимаций
- **ScrollTrigger** - scroll-based анимации (плагин GSAP)
- **Оптимизации**: `will-change` для GPU-ускорения, поддержка `prefers-reduced-motion`

### Backend & Database
- **PostgreSQL** (Docker на VPS, порт `127.0.0.1:5433`)
- **Express API** (`server/`, pm2 `robustino-api`, `127.0.0.1:4000`)
  - JWT-сессия в **httpOnly cookie** (TTL ~8ч)
  - CRUD контента + upload в `/var/www/html/media`
- **nginx**: `/api` → API, `/media` → файлы, `/` → SPA (`serve` / pm2 `robustino`)

Канон схемы: [`db/schema.sql`](db/schema.sql). Исторический RLS Cloud: [`db/rls.supabase.sql`](db/rls.supabase.sql) (только справочно).

### State Management
- **Zustand** - легковесный state manager

### Rich Text Editor
- **react-quill** - WYSIWYG редактор для админ панели

---

## 🗄️ Структура базы данных

**Канон:** [`db/schema.sql`](db/schema.sql).  
Доступ: публичное чтение published/active на API; запись — только admin-сессия.

### Таблицы (кратко)

| Таблица | Назначение | Связи |
|--------|------------|--------|
| `products` | Товары (`draft` / `published` / `link_only`) | self-FK `parent_product_id` |
| `articles` | Блог | — |
| `projects` | Реализованные объекты | `product_id` → products |
| `product_projects` | M2M продукт ↔ проект (UNIQUE pair) | FK на оба |
| `faq` | FAQ (`is_active`) | — |
| `faq_links` | Документы / внутренние страницы FAQ | — |
| `presentation` | PDF презентация | — |
| `upholstery_collections` | Коллекции обивки | — |
| `upholstery_variants` | Варианты обивки | `collection_id` → collections |
| `site_chat_conversations` | Диалог гостя (cookie) ↔ админ | — |
| `site_chat_messages` | Сообщения (`CUSTOMER` / `STAFF`) | → conversations |
| `site_chat_attachments` | Вложения сообщений | → messages |

Полные колонки, CHECK, UNIQUE и индексы — только в `db/schema.sql`.

### Media (бывшие Storage buckets)
Файлы на диске: `/var/www/html/media/{models,images,articles,projects,documents}/`  
Публичный URL: `https://robustino.ru/media/...`  
Вложения чата: `/media/documents/chat/{conversationId}/…`

---

## 💬 Site chat (гость ↔ админ)

Назначение: посетитель пишет с сайта (sticky FAB / CTA «Написать» в `#contacts`), админ отвечает в `/admin/chat`.

| Слой | Путь |
|------|------|
| UI сайт | `src/components/chat/SiteChatFab.jsx` + `ChatWindow` |
| UI админ | `src/pages/Admin/AdminChat.jsx`, бейдж unread в `AdminLayout` |
| Хуки | `useSiteChat` (delta-poll `?after=`), `useChatAttachments` |
| Лимиты FE+API | `shared/siteChatLimits.js` |
| API | `server/src/chat/` — `guestRoutes`, `adminRoutes`, `storage`, `session`, `service` |
| Mount | `server/src/routes/chat.js` → `/api/chat` |

**Идентичность гостя:** httpOnly cookie `robustino_chat` (UUID). Диалог в БД создаётся при **первом** сообщении или upload, не при открытии окна.  
**Realtime:** без Socket.IO — REST + polling дельты (~3.5 с).  
**Миграция:** `db/migrations/20260825_site_chat.sql`.

Публичные эндпоинты: `GET/POST /api/chat/messages`, `POST /api/chat/read`, `GET /api/chat/unread-count`, `POST /api/chat/upload`.  
Админ: `/api/chat/admin/…` (requireAuth).

---

## 🔄 Потоки данных (Data Flow)

### Получение данных (Frontend → API → Postgres)
```
Component → Zustand Store → api.js / http.js → GET /api/... → Express → Postgres
```

### Создание/обновление (админка)
```
Admin Form → Store → POST/PATCH /api/... (cookie session)
                 ↓
            POST /api/upload/:bucket → /var/www/html/media/...
```

---

## 🎨 Принципы дизайна

### Адаптивность
- **Mobile First** подход
- Breakpoints:
  - `< 768px` - Mobile
  - `768px - 1024px` - Tablet
  - `> 1024px` - Desktop

### Цветовая схема
- **main-bg**: `#F1F2F0` (основной фон)
- **second-bg**: `#D5D7D4` (вторичный фон)
- **main-text**: `#363636` (основной текст)
- **second-text**: `#A9A9A9` (вторичный текст)

### Типографика
- **Шрифт**: `Commissioner` (sans-serif)
- Заголовки: `font-weight: 450`, `text-transform: uppercase`
- Основной текст: `font-weight: 450`

### Spacing
- 8px grid system (кратно 8: 8, 16, 24, 32, 48, 64, 86, 124...)

---

## 🎬 GSAP Анимации

### Основные паттерны

#### 1. Fade In при загрузке
```javascript
gsap.to(element, {
  opacity: 1,
  y: 0,
  duration: 0.8,
  ease: 'power3.out'
})
```

#### 2. Scroll-triggered анимации
```javascript
gsap.to(element, {
  opacity: 1,
  y: 0,
  scrollTrigger: {
    trigger: sectionRef.current,
    start: 'top 80%',
    toggleActions: 'play none none none'
  }
})
```

#### 3. Stagger для списков
```javascript
gsap.to(cards, {
  opacity: 1,
  x: 0,
  scale: 1,
  stagger: 0.15,
  ease: 'power2.out'
})
```

### Оптимизации анимаций

#### `will-change` для GPU-ускорения
```javascript
// Перед анимацией
gsap.set(element, { willChange: 'opacity, transform' })

// После анимации
gsap.set(element, { willChange: 'auto' })
```

#### Поддержка `prefers-reduced-motion`
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (prefersReducedMotion) {
  // Пропускаем анимации, устанавливаем финальные значения
  gsap.set(element, { opacity: 1, y: 0 })
} else {
  // Запускаем анимации
  gsap.to(element, { ... })
}
```

---

## 🎮 3D модели - Best Practices

### Оптимизация GLB моделей
- **Размер файла:** максимум 5MB
- **Полигоны:** 10k-50k для desktop, < 10k для mobile
- **Текстуры:** использовать Draco compression
- **Формат:** GLB (не GLTF) - всё в одном файле

### Использование в компонентах
```jsx
import ModelViewer from '@components/3d/ModelViewer'

<ModelViewer 
  modelPath={product.model_url}
  enableControls={true}
  autoRotate={autoRotate}
  zoomLevel={zoomLevel}
  cameraPosition={[0, 0.65, 3]}
  modelRotation={[0, -0.15, 0]}
  scale={1.1}
/>
```

### Настройки освещения
- **Directional Light**: `intensity: 3.7`, `position: [2, 5, 2]`
- **Environment**: `preset: "city"`, `environmentIntensity: 1.3`
- **Camera**: `position: [0, 0.65, 2]`, `fov: 45`

### Lazy Loading
```javascript
// Предзагрузка модели
useGLTF.preload('/models/chair-1.glb')
```

---

## 🔐 Аутентификация (Админ панель)

### Flow
1. Админ вводит email/password
2. `POST /api/auth/login` проверяет bcrypt-хеш, выдаёт JWT
3. JWT кладётся в **httpOnly cookie** (`robustino_session`, TTL ~8ч)
4. `authStore` хранит только `user` / `isAuthenticated` (токен JS не читает)
5. При **401** клиент сбрасывает сессию и редиректит на `/admin/login`
6. `ProtectedRoute` смотрит на `isAuthenticated`

### Защита роутов
```jsx
<ProtectedRoute>
  <AdminDashboard />
</ProtectedRoute>
```

---

## 📝 Naming Conventions

### Файлы и папки
- Компоненты: `PascalCase.jsx` (Header.jsx, ProductCard.jsx)
- Утилиты/хуки: `camelCase.js` (useGSAP.js, animations.js)
- Константы: `UPPER_SNAKE_CASE.js`

### Переменные и функции
- Компоненты: `PascalCase`
- Функции/переменные: `camelCase`
- Константы: `UPPER_SNAKE_CASE`

### CSS классы
- Tailwind utilities + custom классы через BEM при необходимости

---

## 🚀 Команды

### Разработка
```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка для продакшена
npm run preview      # Просмотр production build
npm run lint         # ESLint проверка
```

### Установка зависимостей
```bash
npm install          # Установка всех зависимостей
```

---

## 🔧 Конфигурация

### Переменные окружения

Фронт (`.env`):
```env
VITE_API_URL=/api
```

API (`server/.env` / `/root/robustino-api/.env`): см. `server/.env.example`
(`DATABASE_URL`, `JWT_SECRET`, bcrypt `ADMIN_PASSWORD`, `MEDIA_*`, cookie TTL,
опционально `CHAT_*` — лимиты upload/квоты; дефолты в `shared/siteChatLimits.js`).

### Vite Config
- **Алиасы** настроены для удобного импорта:
  - `@` → `src/`
  - `@components` → `src/components/`
  - `@pages` → `src/pages/`
  - `@hooks` → `src/hooks/`
  - `@utils` → `src/utils/`
  - `@store` → `src/store/`
  - `@assets` → `src/assets/`
  - `@shared` → `shared/` (лимиты чата и др. FE↔API)

---

## 📊 Оптимизация производительности

### Code Splitting
- Lazy loading для страниц
- Dynamic imports для тяжелых компонентов

### Изображения
- WebP формат (опционально)
- Lazy loading
- Responsive images

### 3D модели
- Suspense для загрузки
- ErrorBoundary для обработки ошибок
- Кэширование загруженных моделей

### Анимации
- `will-change` для GPU-ускорения
- Поддержка `prefers-reduced-motion` для доступности
- Оптимизация ScrollTrigger (refresh после DOM обновлений)

### State Management
- Кэширование данных в Zustand stores
- Оптимизация запросов (проверка кэша перед запросом)

---

## 🎯 Ключевые особенности

1. **Информационный сайт** - без e-commerce (корзины, оплаты)
2. **Каталог товаров** - с 3D моделями и детальными страницами
3. **3D модели** - интерактивные GLB модели кресел с контролами
4. **GSAP анимации** - плавные, оптимизированные анимации
5. **Админ панель** - полный CRUD для товаров, статей, проектов, FAQ, вариантов обивки
6. **Свой backend** - Postgres + Express API + `/media` на VPS
7. **Доступность** - поддержка `prefers-reduced-motion`

---

## 📖 Роутинг

### Публичные роуты
- `/` - Главная страница
- `/products` - Все продукты
- `/product/:id` - Страница продукта
- `/articles` - Все статьи
- `/article/:id` - Страница статьи
- `/projects` - Все проекты
- `/about` - О компании
- `/page/:id` - Динамические страницы для FAQ ссылок

### Админ роуты (защищенные)
- `/admin/login` - Вход в админ панель
- `/admin` - Дашборд
- `/admin/products` - Управление продуктами
- `/admin/articles` - Управление статьями
- `/admin/projects` - Управление проектами
- `/admin/faq` - Управление FAQ
- `/admin/upholstery` - Управление вариантами обивки
- `/admin/faq-links` - Управление FAQ ссылками
- `/admin/presentation` - Управление презентацией

---

*Дата создания: 21 октября 2025*
*Последнее обновление: 25 августа 2026*
