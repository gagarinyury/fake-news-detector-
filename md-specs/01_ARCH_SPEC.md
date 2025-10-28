# 01_ARCH_SPEC — Архитектура и структура проекта

**Цель:** зафиксировать модули, обмен сообщениями и структуру директорий для Fake News Detector (Chrome Built-in AI APIs, Stable from Chrome 138).

## Требования и принципы
- **Chrome Built-in AI APIs (Stable):** используем `LanguageModel`, `Summarizer`, `LanguageDetector`.
- **HYBRID архитектура:** Popup (быстрый просмотр кэша) + Side Panel (полный AI анализ).
- **AI-вызовы из Side Panel.** Side Panel поддерживает Chrome Built-in AI APIs и сохраняет сессию.
- **Popup:** Quick View для кэшированных результатов, кнопки действий, открывает Side Panel.
- **Background orchestration:** background.js управляет кэшем, badge, координирует Popup ↔ Side Panel.
- **Auto badge:** иконка обновляется автоматически при загрузке страницы.
- Manifest V3, минимум пермишенов: `activeTab`, `storage`, `sidePanel`, `scripting`.
- Кэширование результатов в `chrome.storage.local`.
- Приватность по умолчанию: on-device; офлайн база доверенных сайтов.

## Структура директорий
```
fake-news-detector/
├─ src/
│  ├─ background/
│  │  └─ background.js        # Service worker: badge, cache, orchestration
│  ├─ sidepanel/
│  │  ├─ panel.html           # Side Panel для AI анализа
│  │  ├─ panel.js             # LanguageModel, Summarizer, LanguageDetector
│  │  └─ panel.css
│  ├─ popup/
│  │  ├─ popup.html           # Quick View (кэш + кнопки)
│  │  ├─ popup.js             # Показ кэша, открытие Side Panel
│  │  └─ popup.css
│  ├─ content/
│  │  ├─ content.js           # Извлечение текста, highlights
│  │  └─ overlay.css
│  └─ shared/
│     ├─ knownSites.js        # Офлайн база доверенных сайтов
│     ├─ json.js              # JSON utils
│     ├─ hashing.js
│     └─ errorHandler.js      # Централизованная обработка ошибок
├─ manifest.json
└─ README.md
```

## Компоненты
- **Background (service worker)** — orchestration: tabs.onUpdated, cache management, badge updates, координация Popup ↔ Side Panel.
- **Side Panel** — AI calls (LanguageModel, Summarizer, LanguageDetector), полный анализ, прогресс-бар, персистентная сессия.
- **Popup** — Quick View: показ кэшированных результатов, кнопки действий (Highlight, Clear, Copy), открытие Side Panel.
- **Content script** — извлечение текста, подсветка claims на странице, тултипы.
- **Shared utils** — офлайн база сайтов (knownSites.js), JSON utils, хэш строк, обработка ошибок.

## Протокол сообщений
**Background ↔ Content:**
- `GET_PAGE_TEXT` → content → `{ ok, text, url, title }`
- `HIGHLIGHT_CLAIMS` → content: `{claims[], riskMap{}}` → `{ ok, count }`
- `CLEAR_HIGHLIGHTS` → content → `{ ok }`

**Side Panel → Background:**
- `REQUEST_PAGE_TEXT` → background → `{ok, text, url, title}`
- `CACHE_RESULT` → background: `{url, data}` → `{ok}`

**Side Panel (прямые AI вызовы):**
- `self.ai.languageModel.create()` → AI session
- `session.prompt(text)` → анализ текста
- `self.ai.summarizer.create()` → суммаризация

**Popup ↔ Background:**
- `GET_CACHED_ANALYSIS` → background: `{tabId}` → `{ok, cached, data}`
- `OPEN_SIDE_PANEL` → background → открывает Side Panel
- `HIGHLIGHT_CLAIMS` → background → content
- `CLEAR_HIGHLIGHTS` → background → content

## Критерии приёмки
- ✅ Каталоги/файлы подготовлены (включая src/sidepanel/).
- ✅ Принята HYBRID стратегия: Popup (Quick View) + Side Panel (AI анализ).
- ✅ Сообщения определены и совпадают с реализацией.
- ✅ Side Panel поддерживает Chrome Built-in AI APIs.
