# Структура проекта ROBUSTINO

```
ROBUSTINO/
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx          ✅ Шапка сайта с навигацией
│   │   │   ├── Footer.jsx          ✅ Подвал сайта
│   │   │   ├── Button.jsx          ✅ Переиспользуемая кнопка
│   │   │   ├── Loader.jsx          ✅ Индикатор загрузки
│   │   │   ├── ContactsSection.jsx ✅ Секция контактов (переиспользуемая)
│   │   │   └── ErrorBoundary.jsx   ✅ Обработка ошибок React
│   │   │
│   │   ├── home/                   # Секции главной страницы
│   │   │   ├── Hero.jsx            ✅ Hero секция
│   │   │   ├── AboutSection.jsx    ✅ О компании
│   │   │   ├── ProductCatalog.jsx  ✅ Каталог продукции
│   │   │   ├── ProjectsSection.jsx ✅ Реализованные объекты
│   │   │   ├── BlogSection.jsx     ✅ Блог/Статьи
│   │   │   └── FAQSection.jsx      ✅ FAQ с аккордеоном
│   │   │
│   │   ├── 3d/                     # 3D компоненты
│   │   │   ├── ChairModel.jsx      ✅ Компонент 3D модели кресла
│   │   │   ├── ModelViewer.jsx     ✅ 3D viewer с контролами (zoom, rotate)
│   │   │   └── ErrorBoundary.jsx   ✅ Обработка ошибок 3D
│   │   │
│   │   ├── product/                # Компоненты продуктов
│   │   │   └── Navbar.jsx          ✅ Навигация для страниц продуктов
│   │   │
│   │   └── admin/                  # Компоненты админки
│   │       ├── AdminLayout.jsx     ✅ Layout для админ панели
│   │       ├── FileUpload.jsx      ✅ Загрузка файлов в /media
│   │       ├── ImageUpload.jsx     ✅ Загрузка изображений
│   │       ├── ProtectedRoute.jsx  ✅ Cookie-сессия админа
│   │       └── RichTextEditor.jsx  ✅ WYSIWYG редактор (react-quill)
│   │
│   ├── pages/
│   │   ├── Home.jsx                ✅ Главная страница
│   │   ├── Products.jsx            ✅ Все продукты (4-колоночная сетка)
│   │   ├── ProductPage.jsx         ✅ Страница продукта с 3D моделью
│   │   ├── Articles.jsx            ✅ Все статьи (4-колоночная сетка)
│   │   ├── Article.jsx             ✅ Страница одной статьи
│   │   ├── Projects.jsx            ✅ Все проекты с модальными окнами
│   │   ├── About.jsx               ✅ О компании
│   │   ├── Page.jsx                ✅ Динамические страницы для FAQ ссылок
│   │   └── Admin/
│   │       ├── Login.jsx           ✅ Вход в админ панель
│   │       ├── AdminDashboard.jsx  ✅ Главная админки
│   │       ├── AdminProducts.jsx   ✅ Управление товарами
│   │       ├── AdminProductForm.jsx ✅ Форма создания/редактирования товара
│   │       ├── AdminArticles.jsx   ✅ Управление статьями
│   │       ├── AdminArticleForm.jsx ✅ Форма создания/редактирования статьи
│   │       ├── AdminProjects.jsx   ✅ Управление проектами
│   │       ├── AdminProjectForm.jsx ✅ Форма создания/редактирования проекта
│   │       ├── AdminFAQ.jsx        ✅ Управление FAQ
│   │       ├── AdminFAQForm.jsx    ✅ Форма создания/редактирования FAQ
│   │       ├── AdminUpholstery.jsx ✅ Управление вариантами обивки
│   │       ├── AdminUpholsteryForm.jsx ✅ Форма варианта обивки
│   │       ├── AdminFAQLinks.jsx   ✅ Управление FAQ ссылками
│   │       ├── AdminFAQLinkForm.jsx ✅ Форма FAQ ссылки
│   │       └── AdminPresentation.jsx ✅ Управление презентацией PDF
│   │
│   ├── hooks/
│   │   ├── useGSAP.js              ✅ Custom hook для GSAP
│   │   └── useIntersectionObserver.js ✅ Определение видимости элемента
│   │
│   ├── utils/
│   │   ├── animations.js           ✅ GSAP анимации (готовые функции)
│   │   └── api.js                  ✅ HTTP API к Express (retry)
│   │
│   ├── store/
│   │   ├── productsStore.js        ✅ Zustand store для продуктов
│   │   ├── articlesStore.js        ✅ Zustand store для статей
│   │   ├── projectsStore.js       ✅ Zustand store для проектов
│   │   ├── faqStore.js             ✅ Zustand store для FAQ
│   │   ├── faqLinksStore.js        ✅ Zustand store для FAQ ссылок
│   │   ├── presentationStore.js    ✅ Zustand store для презентации
│   │   ├── upholsteryStore.js      ✅ Zustand store для вариантов обивки
│   │   └── authStore.js            ✅ Zustand store для аутентификации
│   │
│   ├── config/
│   │   └── buckets.js              ✅ Имена media-бакетов
│   │
│   ├── styles/
│   │   └── global.css              ✅ Глобальные стили + Tailwind + кастомные классы
│   │
│   ├── assets/                     # Статичные файлы (опционально)
│   │
│   ├── App.jsx                     ✅ Главный компонент приложения (роутинг)
│   └── main.jsx                    ✅ Entry point
│
├── server/                         # Express API
├── db/                             # schema.sql, migrations, rewrite URLs
│
├── public/
│   ├── models/                     # GLB файлы 3D моделей
│   ├── images/                     # Изображения
│   ├── icons/                      # SVG иконки
│   ├── materials/                  # Текстуры материалов
│   └── textures/                   # Текстуры
│
├── Configuration Files:
│   ├── package.json                ✅ Зависимости
│   ├── vite.config.js              ✅ Vite конфиг с алиасами + proxy /api
│   ├── tailwind.config.js          ✅ Tailwind конфиг
│   ├── postcss.config.js           ✅ PostCSS конфиг
│   ├── .eslintrc.cjs               ✅ ESLint конфиг
│   ├── .gitignore                  ✅ Git ignore
│   └── index.html                  ✅ HTML entry
│
├── Documentation:
│   ├── ARCHITECTURE.md             ✅ Архитектура проекта
│   ├── PROJECT_STRUCTURE.md        ✅ Этот файл
│   └── STYLEGUIDE.md               ✅ Гайд по стилям
│
├── SQL / DB:
│   ├── db/schema.sql               ✅ Каноническая схема
│   ├── db/migrations/              ✅ Additive миграции
│   └── create-admin-user.sql       ⚠️ legacy (админ теперь через API env)
│
└── node_modules/                   ✅ Зависимости установлены

```

## ✅ Реализованные функции

### Frontend
- [x] Базовая структура проекта
- [x] Конфигурация (Vite, Tailwind, ESLint)
- [x] Роутинг (React Router)
- [x] Общие компоненты (Header, Footer, Button, Loader, ContactsSection)
- [x] Все секции главной страницы
- [x] Страницы: Home, Products, ProductPage, Articles, Article, Projects, About, Page
- [x] 3D компоненты (ChairModel, ModelViewer с контролами)
- [x] Админ панель (полный CRUD для всех сущностей)
- [x] Утилиты (animations, api с retry)
- [x] Хуки (useGSAP, useIntersectionObserver)
- [x] State management (Zustand stores)
- [x] Express API + Postgres + /media
- [x] GSAP анимации с оптимизациями (will-change, prefers-reduced-motion)
- [x] Модальные окна для проектов
- [x] Full-screen image viewer
- [x] Rich text editor для админки

### Backend (свой стек)
- [x] PostgreSQL + `db/schema.sql`
- [x] Express API (`server/`, pm2 `robustino-api`)
- [x] Media на диске `/var/www/html/media`
- [x] httpOnly cookie auth (bcrypt admin)

### Оптимизации
- [x] GPU-ускорение анимаций (will-change)
- [x] Поддержка доступности (prefers-reduced-motion)
- [x] Кэширование данных в stores
- [x] Retry логика для API запросов
- [x] Lazy loading для 3D моделей
- [x] Error boundaries для обработки ошибок

---

## 📊 Статистика проекта

- **Компоненты**: 30+
- **Страницы**: 20+
- **Stores**: 8
- **Роуты**: 30+
- **SQL таблицы**: 7
- **Storage buckets**: 5

---

**Статус:** Продакшен на своём Postgres + API ✅  
**Дата последнего обновления:** 25 августа 2026
