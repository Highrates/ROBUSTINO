# 🎨 ROBUSTINO Style Guide

> **Просмотр в браузере:** Откройте [http://localhost:3000/styleguide](http://localhost:3000/styleguide) для визуального просмотра всех стилей

---

## Цветовая палитра

### Фоновые цвета
```css
main-bg: #F1F2F0    /* Основной фон */
second-bg: #D5D7D4  /* Вторичный фон */
```

**Tailwind классы:**
- `bg-main-bg` - основной фон
- `bg-second-bg` - вторичный фон

**Использование:**
```jsx
<div className="bg-main-bg">Основной фон</div>
<div className="bg-second-bg">Вторичный фон</div>
```

---

### Текстовые цвета
```css
main-text: #363636   /* Основной текст */
second-text: #A9A9A9 /* Вторичный текст */
```

**Tailwind классы:**
- `text-main-text` - основной текст (темный)
- `text-second-text` - вторичный текст (светлый)

**Использование:**
```jsx
<h1 className="text-main-text">Заголовок</h1>
<p className="text-second-text">Второстепенный текст</p>
```

---

## Типографика

### Шрифт
**Commissioner** - используется для всего сайта

**Доступные начертания:**
- 100 (Thin)
- 200 (Extra Light)
- 300 (Light)
- 400 (Regular)
- 500 (Medium)
- 600 (Semi Bold)
- 700 (Bold)
- 800 (Extra Bold)
- 900 (Black)

**Tailwind классы:**
```jsx
<p className="font-commissioner">Текст шрифтом Commissioner</p>

{/* Начертания */}
<p className="font-thin">Thin (100)</p>
<p className="font-extralight">Extra Light (200)</p>
<p className="font-light">Light (300)</p>
<p className="font-normal">Regular (400)</p>
<p className="font-medium">Medium (500)</p>
<p className="font-semibold">Semi Bold (600)</p>
<p className="font-bold">Bold (700)</p>
<p className="font-extrabold">Extra Bold (800)</p>
<p className="font-black">Black (900)</p>
```

---

## Контейнеры и отступы

### Класс `.padding-global`

Основной контейнер для контента страниц.

**CSS:**
```css
.padding-global {
  padding-left: 2.5rem;     /* 40px */
  padding-right: 2.5rem;    /* 40px */
  margin-left: auto;
  margin-right: auto;
  max-width: 1536px;        /* 2xl breakpoint */
}
```

**Использование:**
```jsx
<div className="padding-global">
  {/* Весь контент страницы */}
</div>
```

**В компонентах:**
```jsx
// Секция с padding-global
<section className="padding-global py-16">
  <h2>Заголовок секции</h2>
  <p>Контент</p>
</section>
```

---

## Примеры использования

### Типичная секция
```jsx
<section className="bg-main-bg padding-global py-20">
  <div className="max-w-4xl mx-auto">
    <h2 className="text-4xl font-bold text-main-text mb-6">
      Заголовок секции
    </h2>
    <p className="text-lg text-second-text">
      Описание секции с вторичным текстом
    </p>
  </div>
</section>
```

### Карточка продукта
```jsx
<div className="bg-second-bg rounded-lg p-6">
  <h3 className="text-2xl font-semibold text-main-text mb-4">
    Название кресла
  </h3>
  <p className="text-second-text mb-4">
    Краткое описание продукта
  </p>
  <button className="bg-main-text text-main-bg px-6 py-3 rounded">
    Подробнее
  </button>
</div>
```

### Hero секция
```jsx
<section className="bg-main-bg padding-global min-h-screen flex items-center">
  <div className="w-full">
    <h1 className="text-6xl font-bold text-main-text mb-6">
      ROBUSTINO
    </h1>
    <p className="text-2xl text-second-text mb-8">
      Премиальные кресла для вашего комфорта
    </p>
  </div>
</section>
```

---

## Responsive Design

### Padding на разных экранах

```jsx
<div className="padding-global">
  {/* На всех экранах: padding-left/right: 2.5rem (40px) */}
</div>
```

Если нужны адаптивные отступы:
```jsx
<div className="px-4 sm:px-6 lg:px-10 max-w-container mx-auto">
  {/* 
    Mobile: 16px
    Tablet: 24px
    Desktop: 40px
  */}
</div>
```

---

## Полезные комбинации классов

### Центрированный контент с ограничением ширины
```jsx
<div className="padding-global">
  <div className="max-w-4xl mx-auto">
    {/* Контент */}
  </div>
</div>
```

### Секция с чередующимися фонами
```jsx
<section className="bg-main-bg padding-global py-20">...</section>
<section className="bg-second-bg padding-global py-20">...</section>
<section className="bg-main-bg padding-global py-20">...</section>
```

### Текст с разными весами
```jsx
<h1 className="text-5xl font-bold text-main-text">Заголовок</h1>
<h2 className="text-4xl font-semibold text-main-text">Подзаголовок</h2>
<p className="text-lg font-normal text-main-text">Параграф</p>
<span className="text-sm font-light text-second-text">Мелкий текст</span>
```

---

## Быстрая справка

| Элемент | Класс | Значение |
|---------|-------|----------|
| Основной фон | `bg-main-bg` | #F1F2F0 |
| Вторичный фон | `bg-second-bg` | #D5D7D4 |
| Основной текст | `text-main-text` | #363636 |
| Вторичный текст | `text-second-text` | #A9A9A9 |
| Шрифт | `font-commissioner` | Commissioner |
| Контейнер | `padding-global` | 40px padding, 1536px max-width |

---

## Обновление компонентов

При обновлении существующих компонентов:

1. Заменить `container-custom` → `padding-global`
2. Заменить `bg-white` → `bg-main-bg` или `bg-second-bg`
3. Заменить стандартные цвета текста → `text-main-text` или `text-second-text`
4. Проверить что используется шрифт Commissioner

---

*Создано: 21 октября 2025*

