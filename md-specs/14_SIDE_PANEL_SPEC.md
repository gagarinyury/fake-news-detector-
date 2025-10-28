# 14_SIDE_PANEL_SPEC — Side Panel для AI анализа

**Цель:** реализовать Side Panel для полного AI-анализа с персистентной сессией и прогресс-баром.

## Задачи
1. Создать Side Panel UI (`src/sidepanel/panel.html`, `panel.js`, `panel.css`).
2. Вызывать Chrome Built-in AI APIs напрямую из Side Panel:
   - `self.ai.languageModel` — анализ текста
   - `self.ai.summarizer` — суммаризация
   - `self.translation.languageDetector` — определение языка
3. Показывать прогресс анализа (download model, analyzing).
4. Отправлять результат в background для кэширования.
5. Обрабатывать ошибки gracefully (AI unavailable, quota exceeded, timeout).

## Требования

### HTML (`src/sidepanel/panel.html`)
- Заголовок "Fake News Detector - Full Analysis"
- Прогресс-бар с текстовым статусом
- Кнопка "Analyze Current Page"
- Блоки результатов: Score, Verdict, Red Flags, Claims, Summary, Language
- Кнопка "Copy Report (JSON)"

### JavaScript (`src/sidepanel/panel.js`)
- **Проверка AI доступности** при загрузке
- **Создание AI сессии** (`ai.languageModel.create()`)
- **Получение текста страницы** через background → content
- **Анализ текста** с прогрессом
- **Кэширование результата** через background
- **Обработка ошибок** с использованием `errorHandler.js`

### CSS (`src/sidepanel/panel.css`)
- Ширина: 400px
- Прогресс-бар: анимированный
- Цветовая индикация score (зелёный/жёлтый/красный)
- Responsive для разных высот экрана

## Протокол сообщений

**Side Panel → Background:**
```javascript
// Запрос текста страницы
chrome.runtime.sendMessage({
  type: 'REQUEST_PAGE_TEXT',
  data: { tabId }
}) → { ok, text, url, title }

// Сохранение результата в кэш
chrome.runtime.sendMessage({
  type: 'CACHE_RESULT',
  data: { url, result }
}) → { ok }
```

**Side Panel (прямые AI вызовы):**
```javascript
// Проверка доступности
const availability = await self.ai.languageModel.availability();

// Создание сессии
const session = await self.ai.languageModel.create({
  systemPrompt: "...",
  monitor: (m) => {
    m.addEventListener('downloadprogress', (e) => {
      const percentage = Math.round(e.loaded / e.total * 100);
      updateProgress(percentage);
    });
  }
});

// Анализ текста
const response = await session.prompt(text);
```

## Обработка ошибок

1. **AI_UNAVAILABLE** — показать "AI not available. Check chrome://on-device-internals/"
2. **QUOTA_EXCEEDED** — показать "Not enough disk space (22 GB required)"
3. **TIMEOUT** — показать "Analysis timed out. Try again."
4. **JSON_PARSE_FAILED** — показать partial result + warning

## Acceptance
- Side Panel открывается из popup при клике "Full Analysis".
- AI APIs вызываются успешно (проверено на 5+ страницах).
- Прогресс-бар показывает download model и analyzing.
- Результат кэшируется в background.
- Ошибки обрабатываются gracefully.
