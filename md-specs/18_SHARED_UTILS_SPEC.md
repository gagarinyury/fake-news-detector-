# 18_SHARED_UTILS_SPEC — Shared утилиты

**Цель:** переиспользуемые функции для всех модулей.

## src/shared/json.js

Парсинг JSON с обработкой markdown code blocks (06_PROMPT_SCHEMA_SPEC):

```javascript
/**
 * Безопасный парсинг JSON от LanguageModel
 * Убирает markdown code blocks, висячие запятые
 */
export function parseJSON(str) {
  if (!str || typeof str !== 'string') return null;

  try {
    // Убрать markdown code blocks: ```json ... ```
    str = str.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1');

    // Убрать висячие запятые перед ] или }
    str = str.replace(/,(\s*[}\]])/g, '$1');

    // Trim
    str = str.trim();

    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse failed:', error, 'Input:', str.slice(0, 200));
    return null;
  }
}
```

## src/shared/hashing.js

Хэширование URL для кэша (15_BADGE_AUTO_SPEC):

```javascript
/**
 * Простой хэш URL для ключей кэша
 * Возвращает короткий хэш (8 символов)
 */
export function hashURL(url) {
  try {
    const parsed = new URL(url);
    // Используем origin + pathname (без query params)
    const normalized = `${parsed.origin}${parsed.pathname}`;

    // Простой hash
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36).slice(0, 8);
  } catch {
    // Fallback для невалидных URL
    return Math.random().toString(36).slice(2, 10);
  }
}
```

## src/shared/knownSites.js

См. 16_KNOWN_SITES_SPEC (уже есть).

## Acceptance
- parseJSON корректно обрабатывает markdown blocks.
- parseJSON убирает висячие запятые.
- hashURL возвращает одинаковый хэш для одного URL.
- hashURL игнорирует query params.
