# 17_ERROR_HANDLING_SPEC — Обработка ошибок

**Цель:** graceful degradation для всех ошибок AI API.

## Типы ошибок

### 1. API unavailable
```javascript
if (availability === 'unavailable') {
  throw new Error('AI_UNAVAILABLE: Device does not support Chrome Built-in AI');
}
```
**UI:** "AI features are not available on this device. Check chrome://on-device-internals/"

### 2. Model downloading
```javascript
if (availability === 'downloadable') {
  // Показать прогресс
  monitor((e) => console.log(`Downloading: ${e.loaded * 100}%`));
}
```
**UI:** "Downloading AI model... (first time only, ~1.5 GB)"

### 3. Quota exceeded (недостаточно места)
```javascript
catch (error) {
  if (error.name === 'QuotaExceededError') {
    throw new Error('DISK_SPACE: Not enough disk space (~22 GB required)');
  }
}
```
**UI:** "Not enough disk space. Free up at least 22 GB."

### 4. Platform not supported
```javascript
if (error.name === 'NotSupportedError') {
  throw new Error('PLATFORM_UNSUPPORTED: Your OS/device does not support Chrome Built-in AI');
}
```
**UI:** "Your device/OS does not meet system requirements."

### 5. JSON parsing failed
```javascript
const parsed = parseJSON(response);
if (!parsed) {
  // Повторный запрос
  const retry = await session.prompt('Your previous output was not valid JSON. Return ONLY JSON.');
  return parseJSON(retry);
}
```
**Fallback:** Если второй раз тоже не JSON → вернуть partial result с warning.

### 6. Timeout (AI зависает)
```javascript
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT: AI request took too long')), ms)
    )
  ]);
}

// Использование
try {
  const result = await withTimeout(
    session.prompt(text),
    30000 // 30 секунд
  );
} catch (error) {
  if (error.message.includes('TIMEOUT')) {
    throw new Error('AI_TIMEOUT: Request timed out. Try again.');
  }
}
```
**UI:** "Analysis timed out. Please try again."

## Acceptance
- Все ошибки логируются в console.
- Пользователь видит понятное сообщение (не техническую ошибку).
- Extension не крашится, работает в degraded mode.
