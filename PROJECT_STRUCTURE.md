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
│   │       ├── FileUpload.jsx      ✅ Загрузка файлов в Supabase Storage
│   │       ├── ImageUpload.jsx     ✅ Загрузка изображений
│   │       ├── ProtectedRoute.jsx  ✅ Защита роутов админки
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
│   │   └── api.js                  ✅ API методы для Supabase (с retry логикой)
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
│   │   └── supabase.js             ✅ Конфигурация Supabase клиента
│   │
│   ├── styles/
│   │   └── global.css              ✅ Глобальные стили + Tailwind + кастомные классы
│   │
│   ├── assets/                     # Статичные файлы (опционально)
│   │
│   ├── App.jsx                     ✅ Главный компонент приложения (роутинг)
│   └── main.jsx                    ✅ Entry point
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
│   ├── vite.config.js              ✅ Vite конфиг с алиасами
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
├── SQL Scripts:
│   ├── supabase-schema.sql         ✅ Основная схема БД
│   ├── supabase-full-schema.sql    ✅ Полная схема БД
│   ├── FIX_STORAGE_RLS_DOCUMENTS.sql ✅ Исправление RLS для документов
│   └── create-admin-user.sql      ✅ Создание админ пользователя
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
- [x] State management (8 Zustand stores)
- [x] Supabase конфигурация
- [x] GSAP анимации с оптимизациями (will-change, prefers-reduced-motion)
- [x] Модальные окна для проектов
- [x] Full-screen image viewer
- [x] Rich text editor для админки

### Backend (Supabase)
- [x] Таблицы: products, articles, projects, faq, faq_links, presentation, upholstery_variants
- [x] Storage buckets: models, images, articles, projects, documents
- [x] Row Level Security (RLS) policies
- [x] Аутентификация для админ панели

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

**Статус:** Проект в активной разработке ✅  
**Дата последнего обновления:** 11 января 2026
