# 05_POPUP_LOGIC_SPEC — Логика попапа (Quick View)

**Цель:** Quick View для кэшированных результатов, кнопки действий, открытие Side Panel.

## Функциональные шаги
1. При открытии popup запросить у background: `GET_CACHED_ANALYSIS` для текущей вкладки.
2. Background проверяет кэш:
   - Если есть → возвращает `{ok: true, cached: true, data: {...}}`
   - Если нет → возвращает `{ok: true, cached: false, data: null}`
3. Popup отображает:
   - **Если есть кэш:** показать результат
   - **Если нет кэша:** показать "No analysis yet. Click 'Full Analysis' to start."
4. Результат (если есть):
   - Credibility score (0-100) с цветовой индикацией
   - Verdict (короткое объяснение)
   - Red flags (список подозрительных паттернов)
   - Key claims (извлечённые утверждения)
   - Summary (ключевые пункты)
   - Detected language
5. Кнопки действий:
   - **"Full Analysis"** → открыть Side Panel для AI анализа
   - **"Highlight claims"** → отправить `HIGHLIGHT_CLAIMS` в content
   - **"Clear highlights"** → отправить `CLEAR_HIGHLIGHTS`
   - **"Copy report"** → скопировать JSON в clipboard
6. Ошибки: graceful degradation, показать статус.

## Протокол сообщений

**Popup → Background:**
```javascript
// Получить кэшированный результат
chrome.runtime.sendMessage({
  type: 'GET_CACHED_ANALYSIS',
  data: { tabId }
}) → { ok, cached, data }

// Открыть Side Panel
chrome.runtime.sendMessage({
  type: 'OPEN_SIDE_PANEL'
}) → { ok }

// Highlight claims
chrome.runtime.sendMessage({
  type: 'HIGHLIGHT_CLAIMS',
  data: { tabId, claims, riskMap }
}) → { ok, count }

// Clear highlights
chrome.runtime.sendMessage({
  type: 'CLEAR_HIGHLIGHTS',
  data: { tabId }
}) → { ok }
```

## Acceptance
- Popup показывает кэшированный результат (если есть).
- Кнопка "Full Analysis" открывает Side Panel.
- Кнопки Highlight/Clear/Copy работают.
- Popup загружается быстро (<100ms).
