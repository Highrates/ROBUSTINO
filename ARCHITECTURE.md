# Архитектура проекта ROBUSTINO

> Документация по структуре и ключевым решениям проекта

## 📁 Структура проекта

```
ROBUSTINO/
├── src/
│   ├── components/         # React компоненты
│   │   ├── common/        # Общие компоненты (Header, Footer, Button, Loader, ContactsSection, ErrorBoundary)
│   │   ├── home/          # Компоненты главной страницы (Hero, AboutSection, ProductCatalog, ProjectsSection, BlogSection, FAQSection)
│   │   ├── 3d/            # 3D компоненты (ChairModel, ModelViewer, ErrorBoundary)
│   │   ├── product/      # Компоненты продуктов (Navbar)
│   │   └── admin/         # Компоненты админ панели (AdminLayout, FileUpload, ImageUpload, ProtectedRoute, RichTextEditor)
│   │
│   ├── pages/             # Страницы приложения
│   │   ├── Home.jsx       # Главная страница
│   │   ├── Products.jsx   # Страница всех продуктов
│   │   ├── ProductPage.jsx # Страница одного продукта с 3D моделью
│   │   ├── Articles.jsx   # Страница всех статей
│   │   ├── Article.jsx   # Страница одной статьи
│   │   ├── Projects.jsx   # Страница всех проектов
│   │   ├── About.jsx     # О компании
│   │   ├── Page.jsx      # Динамические страницы для FAQ ссылок
│   │   └── Admin/         # Страницы админки (Dashboard, Products, Articles, Projects, FAQ, Upholstery, FAQLinks, Presentation)
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useGSAP.js            # GSAP анимации
│   │   └── useIntersectionObserver.js
│   │
│   ├── utils/             # Утилиты
│   │   ├── animations.js  # GSAP анимации
│   │   └── api.js         # API методы для работы с Supabase
│   │
│   ├── store/             # State management (Zustand)
│   │   ├── productsStore.js
│   │   ├── articlesStore.js
│   │   ├── projectsStore.js
│   │   ├── faqStore.js
│   │   ├── faqLinksStore.js
│   │   ├── presentationStore.js
│   │   ├── upholsteryStore.js
│   │   └── authStore.js
│   │
│   ├── config/            # Конфигурация
│   │   └── supabase.js    # Supabase клиент
│   │
│   ├── styles/            # Стили
│   │   └── global.css     # Глобальные стили + Tailwind
│   │
│   ├── assets/            # Статичные файлы
│   │
│   ├── App.jsx            # Главный компонент приложения
│   └── main.jsx           # Entry point
│
├── public/                # Публичные файлы (модели, изображения, иконки)
├── ARCHITECTURE.md       # Этот файл - архитектура проекта
├── PROJECT_STRUCTURE.md  # Структура проекта
└── package.json          # Зависимости проекта
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
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL база данных
  - Аутентификация
  - Storage для файлов (GLB модели, изображения, документы)
  - Row Level Security (RLS) для защиты данных

### State Management
- **Zustand** - легковесный state manager

### Rich Text Editor
- **react-quill** - WYSIWYG редактор для админ панели

---

## 🗄️ Структура базы данных (Supabase)

### Таблицы

#### `products` - Товары
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
type            TEXT
description     TEXT
model_url       TEXT  -- URL GLB модели из Storage
images          TEXT[] -- Массив URL изображений
status          TEXT DEFAULT 'draft' -- 'draft' | 'published'
display_order   INTEGER
delivery_time   TEXT
volume_m3       NUMERIC
weight_kg       NUMERIC
in_stock        TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `articles` - Статьи блога
```sql
id              UUID PRIMARY KEY
title           TEXT NOT NULL
subtitle        TEXT
content         TEXT NOT NULL -- Rich text (HTML)
cover_image     TEXT
status          TEXT DEFAULT 'draft'
display_order   INTEGER
article_date    DATE
published_at    TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `projects` - Реализованные объекты
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
description     TEXT -- Rich text (HTML)
images          TEXT[] -- Массив URL изображений
seats_count     INTEGER
product_id      UUID REFERENCES products(id)
upholstery_variant TEXT
display_order   INTEGER
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `faq` - Часто задаваемые вопросы
```sql
id              UUID PRIMARY KEY
question        TEXT NOT NULL
answer          TEXT NOT NULL
display_order   INTEGER DEFAULT 0
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `faq_links` - Ссылки в секции FAQ
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
document_url    TEXT
is_internal_page BOOLEAN DEFAULT false
page_content    TEXT -- Rich text для внутренних страниц
display_order   INTEGER
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `presentation` - Презентация кресел PDF
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
document_url    TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `upholstery_variants` - Варианты обивки
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
image_url       TEXT
description     TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### Storage Buckets
- `models` - для GLB файлов (3D модели)
- `images` - для изображений продуктов
- `articles` - для изображений статей
- `projects` - для фотографий проектов
- `documents` - для PDF документов и других файлов

---

## 🔄 Потоки данных (Data Flow)

### Получение данных (Frontend → Supabase)
```
Component → Zustand Store → API Utils → Supabase → Response
```

Пример:
```jsx
// В компоненте
const { products, fetchProducts } = useProductsStore()

useEffect(() => {
  fetchProducts() // Вызывается метод из store
}, [])

// Store вызывает API
// API делает запрос к Supabase
// Данные сохраняются в store
// Компонент получает данные через store
```

### Создание/обновление данных
```
Admin Component → Form → Zustand Store → API Utils → Supabase
                                      ↓
                        Upload Files → Supabase Storage
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
2. Supabase Auth проверяет данные
3. Получаем JWT токен
4. Токен хранится в localStorage через `authStore`
5. Защищенные роуты проверяют наличие токена через `ProtectedRoute`

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

### Переменные окружения (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Vite Config
- **Алиасы** настроены для удобного импорта:
  - `@` → `src/`
  - `@components` → `src/components/`
  - `@pages` → `src/pages/`
  - `@hooks` → `src/hooks/`
  - `@utils` → `src/utils/`
  - `@store` → `src/store/`
  - `@assets` → `src/assets/`

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
6. **Supabase** - готовое backend решение с RLS
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
*Последнее обновление: 11 января 2026*
