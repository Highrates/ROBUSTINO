# Архитектура проекта ROBUSTINO

> Документация по структуре и ключевым решениям проекта

## 📁 Структура проекта

```
ROBUSTINO/
├── src/
│   ├── components/         # React компоненты
│   │   ├── common/        # Общие компоненты (Header, Footer, Button, Loader)
│   │   ├── home/          # Компоненты главной страницы
│   │   ├── 3d/            # 3D компоненты (ChairModel, ModelViewer)
│   │   ├── product/       # Компоненты продуктов
│   │   ├── blog/          # Компоненты блога
│   │   └── admin/         # Компоненты админ панели
│   │
│   ├── pages/             # Страницы приложения
│   │   ├── Home.jsx
│   │   ├── ProductPage.jsx
│   │   ├── About.jsx
│   │   ├── Articles.jsx
│   │   ├── Article.jsx
│   │   ├── Contacts.jsx
│   │   └── Admin/         # Страницы админки
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
│   │   └── authStore.js (будет добавлен)
│   │
│   ├── config/            # Конфигурация
│   │   └── supabase.js    # Supabase клиент
│   │
│   ├── styles/            # Стили
│   │   └── global.css     # Глобальные стили + Tailwind
│   │
│   ├── assets/            # Статичные файлы
│   │   ├── models/        # GLB модели кресел
│   │   ├── images/        # Изображения
│   │   └── icons/         # Иконки
│   │
│   ├── App.jsx            # Главный компонент приложения
│   └── main.jsx           # Entry point
│
├── public/                # Публичные файлы
├── PLAN.md               # Полный план разработки
├── ARCHITECTURE.md       # Этот файл - архитектура проекта
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
- **@react-three/drei** - хелперы для React Three Fiber

### Анимации
- **GSAP** - профессиональная библиотека анимаций
- **ScrollTrigger** - scroll-based анимации (плагин GSAP)

### Backend & Database
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL база данных
  - Аутентификация
  - Storage для файлов (GLB модели, изображения)
  - Realtime (опционально)

### State Management
- **Zustand** - легковесный state manager

---

## 🗄️ Структура базы данных (Supabase)

### Таблицы

#### `products` - Товары
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name            TEXT NOT NULL
slug            TEXT UNIQUE NOT NULL
description     TEXT
full_description TEXT
category        TEXT
model_url       TEXT  -- URL GLB модели
images          TEXT[] -- Массив URL изображений
specifications  JSONB -- Характеристики (размеры, материалы и т.д.)
status          TEXT DEFAULT 'draft' -- 'draft' | 'published'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### `articles` - Статьи блога
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
title           TEXT NOT NULL
slug            TEXT UNIQUE NOT NULL
content         TEXT NOT NULL
excerpt         TEXT
cover_image     TEXT
author          TEXT
category        TEXT
tags            TEXT[]
status          TEXT DEFAULT 'draft'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
published_at    TIMESTAMP
```

#### `projects` - Реализованные объекты
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name            TEXT NOT NULL
client          TEXT
description     TEXT
images          TEXT[]
logo_url        TEXT
date            DATE
created_at      TIMESTAMP DEFAULT NOW()
```

#### `faq` - Часто задаваемые вопросы
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
question        TEXT NOT NULL
answer          TEXT NOT NULL
order           INTEGER DEFAULT 0
created_at      TIMESTAMP DEFAULT NOW()
```

#### `contacts` - Обращения с формы контактов
```sql
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name            TEXT NOT NULL
email           TEXT NOT NULL
phone           TEXT
message         TEXT NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
```

### Storage Buckets
- `models` - для GLB файлов (3D модели)
- `images` - для изображений продуктов
- `articles` - для изображений статей
- `projects` - для фотографий проектов

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

### Цветовая схема (будет обновлена под брендбук)
- Primary: `#0ea5e9` (голубой)
- Secondary: `#64748b` (серый)
- Дополнительные цвета определяются из дизайна

### Типографика
- Заголовки: **Montserrat** (font-heading)
- Основной текст: **Inter** (font-sans)

### Spacing
- 8px grid system (кратно 8: 8, 16, 24, 32, 48, 64...)

---

## 🎬 GSAP Анимации

### Основные паттерны

#### 1. Fade In при загрузке
```javascript
import { fadeIn } from '@utils/animations'

useGSAP(() => {
  fadeIn('.hero-title', { delay: 0.3 })
}, [])
```

#### 2. Scroll-triggered анимации
```javascript
import { scrollAnimation } from '@utils/animations'

useGSAP(() => {
  scrollAnimation('.product-card')
}, [])
```

#### 3. Stagger для списков
```javascript
import { staggerIn } from '@utils/animations'

useGSAP(() => {
  staggerIn('.article-card', { stagger: 0.2 })
}, [])
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
  modelPath="/models/chair-1.glb"
  enableControls={true}
  autoRotate={false}
/>
```

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
4. Токен хранится в localStorage
5. Защищенные роуты проверяют наличие токена

### Защита роутов
```jsx
// Будет реализовано
<PrivateRoute>
  <AdminDashboard />
</PrivateRoute>
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
npm run dev          # Запуск dev сервера (порт 3000)
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
- WebP формат
- Lazy loading
- Responsive images

### 3D модели
- Suspense для загрузки
- Упрощенные модели на мобильных
- Кэширование загруженных моделей

---

## 🎯 Ключевые особенности

1. **Информационный сайт** - без e-commerce (корзины, оплаты)
2. **12-15 товаров** - небольшой каталог
3. **3D модели** - интерактивные GLB модели кресел
4. **GSAP анимации** - плавные, современные анимации
5. **Простая админка** - CRUD для товаров, статей, проектов, FAQ
6. **Supabase** - готовое backend решение

---

## 📖 Следующие шаги

После инициализации проекта:
1. Настроить Supabase (создать таблицы, бакеты)
2. Добавить брендовые цвета в Tailwind config
3. Загрузить GLB модели в `/src/assets/models/`
4. Интегрировать дизайн из Figma
5. Начать разработку компонентов

---

*Дата создания: 21 октября 2025*
*Последнее обновление: 21 октября 2025*

