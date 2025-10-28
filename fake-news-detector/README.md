# Fake News Detector (Chrome Built-in AI)

On-device анализ новостных страниц с использованием Chrome Built-in AI APIs.

## Возможности

- **Автоматический анализ** при загрузке страниц
- **Credibility Score** (0-100) с цветовой индикацией на badge
- **Red Flags** — выявление подозрительных паттернов
- **Claims Extraction** — извлечение ключевых утверждений
- **Offline Database** — мгновенная оценка известных источников
- **Приватность** — вся обработка on-device, без отправки данных

## Требования

- **Chrome 138+** (Built-in AI APIs Stable)
- **~22 GB** свободного места (для AI модели)
- **Интернет** только для первой загрузки модели

## Установка

1. Скачать/клонировать репозиторий
2. Открыть `chrome://extensions`
3. Включить **Developer mode**
4. **Load unpacked** → выбрать папку `fake-news-detector`

## Структура проекта

```
fake-news-detector/
├── manifest.json                # Manifest V3
├── src/
│   ├── background/
│   │   └── background.js       # Service worker orchestration
│   ├── offscreen/
│   │   ├── offscreen.html      # Offscreen document
│   │   └── offscreen.js        # AI API calls
│   ├── popup/
│   │   ├── popup.html          # UI
│   │   ├── popup.js            # Popup logic
│   │   └── popup.css           # Styles
│   ├── content/
│   │   ├── content.js          # Text extraction, highlighting
│   │   └── overlay.css         # Highlight styles
│   ├── shared/
│   │   ├── knownSites.js       # Offline credibility database
│   │   ├── json.js             # JSON parsing utils
│   │   └── hashing.js          # URL hashing
│   └── assets/
│       └── icons/              # Extension icons
└── README.md
```

## Как это работает

1. **При загрузке страницы:**
   - Background проверяет домен в offline DB → мгновенный badge
   - Извлекает текст через content script
   - Отправляет в offscreen document для AI анализа
   - Обновляет badge с финальным score
   - Кэширует результат на 24 часа

2. **При открытии popup:**
   - Загружает кэшированный анализ (если есть)
   - Показывает: score, verdict, red flags, summary, язык
   - Кнопки: Analyze (повторный), Copy Report, Clear Highlights

3. **AI анализ (offscreen):**
   - Language Detection → определение языка текста
   - Summarization → ключевые пункты
   - Credibility Analysis → score + red flags + claims

## Протокол сообщений

**Background ↔ Content:**
- `GET_PAGE_TEXT` → извлечение текста страницы
- `HIGHLIGHT_CLAIMS` → подсветка утверждений
- `CLEAR_HIGHLIGHTS` → очистка подсветок

**Background ↔ Offscreen:**
- `ANALYZE_TEXT` → AI анализ текста

**Popup ↔ Background:**
- `GET_ANALYSIS` → запрос анализа для вкладки

## Технологии

- **Manifest V3**
- **Chrome Built-in AI APIs:**
  - `ai.languageModel` — credibility analysis
  - `ai.summarizer` — text summarization
  - `translation.languageDetector` — language detection
- **Offscreen Documents** — для AI вызовов
- **chrome.storage.local** — кэширование результатов

## Приватность

- ✅ Вся обработка происходит **on-device**
- ✅ Никакие данные **не отправляются** на серверы
- ✅ Offline база известных сайтов
- ✅ Кэш хранится локально

## Лицензия

MIT
