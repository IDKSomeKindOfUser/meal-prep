---
name: Рыночный прилавок
description: Меню недели как прилавок, где у каждого приёма пищи свой цвет
colors:
  ground: "#f4f7ec"
  surface: "#ffffff"
  ink: "#12301f"
  muted: "#4a6152"
  line: "#c5d1bd"
  control: "#6b8073"
  accent: "#8c1d52"
  on-accent: "#ffffff"
  selected: "#0f5b3a"
  on-selected: "#ffffff"
  danger: "#a8201a"
  breakfast: "#f7d84a"
  on-breakfast: "#3a2c00"
  lunch: "#f08a1d"
  on-lunch: "#2b1500"
  dinner: "#0f5b3a"
  on-dinner: "#ffffff"
  snack: "#8c1d52"
  on-snack: "#ffffff"
  ground-dark: "#0e1a13"
  surface-dark: "#18271e"
  ink-dark: "#eaf3e4"
  muted-dark: "#a9bcaa"
  line-dark: "#33463a"
  control-dark: "#7c9485"
  accent-dark: "#f2a3c7"
  on-accent-dark: "#3b0a22"
  selected-dark: "#f7d84a"
  on-selected-dark: "#3a2c00"
  danger-dark: "#ffb0a6"
  breakfast-dark: "#5a4a08"
  on-breakfast-dark: "#fdeeb0"
  lunch-dark: "#7a3d06"
  on-lunch-dark: "#ffe6c8"
  dinner-dark: "#0f4a31"
  on-dinner-dark: "#dff5e6"
  snack-dark: "#6b1640"
  on-snack-dark: "#ffe0ee"
typography:
  title:
    fontFamily: Sofia Sans Variable
    fontSize: 30px
    fontWeight: 800
    lineHeight: 1.1
  heading:
    fontFamily: Sofia Sans Variable
    fontSize: 20px
    fontWeight: 800
    lineHeight: 1.12
  body:
    fontFamily: Sofia Sans Variable
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: Sofia Sans Variable
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.35
rounded:
  s: 10px
  m: 14px
  l: 16px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 32px
  "7": 48px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.m}"
    height: 52px
  day-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.on-selected}"
    rounded: "{rounded.s}"
    height: 48px
---

# Рыночный прилавок

## Overview

Первый экран отвечает на вопрос, что сегодня есть. Четыре блюда лежат друг под другом цветными карточками, как товар на рынке. Крупнее всего видна еда. На фитнес-приложение и на таблицу сайт походить не должен.

Значения лежат в `src/styles/tokens.css`, контраст проверяет `src/styles/tokens.test.ts`. Макет: `.impeccable/mocks/today.html`, тема задаётся параметром `?t=light` или `?t=dark`.

## Colors

| Токен | Светлая | Тёмная | Где |
|---|---|---|---|
| ground | #f4f7ec | #0e1a13 | фон страницы |
| surface | #ffffff | #18271e | карточка, поле ввода |
| ink | #12301f | #eaf3e4 | основной текст |
| muted | #4a6152 | #a9bcaa | второстепенный текст |
| line | #c5d1bd | #33463a | разделители |
| control | #6b8073 | #7c9485 | граница поля ввода |
| accent | #8c1d52 | #f2a3c7 | главная кнопка, активный пункт, фокус |
| on-accent | #ffffff | #3b0a22 | текст на accent |
| selected | #0f5b3a | #f7d84a | выбранный день |
| on-selected | #ffffff | #3a2c00 | текст на selected |
| danger | #a8201a | #ffb0a6 | нехватка денег, ошибка |
| breakfast | #f7d84a | #5a4a08 | поле завтрака |
| on-breakfast | #3a2c00 | #fdeeb0 | текст на нём |
| lunch | #f08a1d | #7a3d06 | поле обеда |
| on-lunch | #2b1500 | #ffe6c8 | текст на нём |
| dinner | #0f5b3a | #0f4a31 | поле ужина |
| on-dinner | #ffffff | #dff5e6 | текст на нём |
| snack | #8c1d52 | #6b1640 | поле перекуса |
| on-snack | #ffffff | #ffe0ee | текст на нём |

Тёмная тема включается вслед за системой. Ручной выбор пишется в `data-theme` на `html`. Поля приёмов пищи в ней те же по тону, но темнее.

Контраст обычного текста не ниже 4,5:1, границы полей ввода не ниже 3:1.

## Typography

Sofia Sans, один шрифт на весь сайт, файлы хранятся в проекте. Заголовок экрана 30px/800, название блюда и раздела 20px/800, текст 16px/400, подписи 14px. Числа табличные (`tabular-nums`).

## Layout

Сначала телефон. Боковой отступ 20px, между разделами 32px, шаги 4, 8, 12, 16, 20, 32, 48px. Карточки блюд идут друг под другом с зазором 12px. Фото внутри карточки: 112px, у обеда с ширины 480px 140px, на экране недели 80px. Внизу четыре пункта навигации.

С ширины 900px навигация уходит влево (180px), блюда встают сеткой 2 на 2, содержимое не шире 1060px. На 320px горизонтальной прокрутки нет.

## Elevation & Depth

Теней нет. Глубину дают цвет карточки и фото еды внутри неё.

## Shapes

Кнопки и служебные карточки 14px, выбранный день 10px. Карточки блюд и экрана готовки 16px, фото в них 14px.

## Components

- Карточка блюда: слева название, под ним чипы (приём пищи, ккал, белок, минуты) и строка, откуда порция; справа квадратное фото. Чипы полупрозрачные цветом текста карточки. Нажимается целиком.
- Экран блюда: фото 4:3 сверху, на компьютере справа.
- Экран готовки: карточки по цвету приёма пищи, миниатюра 72px, чипы и полоска времени (доля от самого долгого блюда).
- Навигация: активный пункт подсвечен фоном и полосой 4px сверху.
- Лента дней: семь кнопок высотой от 48px.
- Главная кнопка: 52px, одна на экран.
- Фокус: обводка 3px цветом accent, отступ 2px. На цветных полях обводка рисуется внутри цветом их текста.
- Движение: один авторский момент, фото блюда перелетает из карточки в шапку экрана блюда и обратно (View Transitions, `view-transition-name: dish-photo`, 0,45 с). Смена дня и недели плавная (0,32 с), выбранный день скользит. Остальное тихое: фото слегка увеличивается при наведении, карточки и кнопки чуть сжимаются при нажатии, покупка зачёркивается плавно. При `prefers-reduced-motion` движения нет.

## Do's and Don'ts

- Цвет приёма пищи везде один: завтрак на экране недели тоже жёлтый.
- Цвет не бывает единственным признаком, рядом всегда есть слово.
- Подпись над названием блюда не ставим.
- Цветные полоски слева, градиентный текст и карточки внутри карточек не используем.
- Если у блюда нет фото, вместо него рисунок `DishArt`.
