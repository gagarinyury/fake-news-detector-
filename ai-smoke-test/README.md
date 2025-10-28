# 🧪 Chrome Built-in AI Smoke Test Extension

Минимальное расширение для проверки работоспособности Chrome Built-in AI APIs (Gemini Nano).

## 📋 Цель

Проверить базовую связку "Chrome Extension ⇄ Built-in AI" перед началом разработки Fake News Detector:

- ✅ Манифест и скрипты грузятся без ошибок
- ✅ API доступны и отвечают корректно
- ✅ Модель скачивается и работает
- ✅ Все три основных API функционируют

---

## 🔧 Предварительные требования

### Минимальные требования:

1. **Chrome 138+** (Stable или выше)
   - Проверь: `chrome://version`

2. **~22 GB свободного места** на диске профиля
   - Для модели Gemini Nano (~1.5 GB) + запас

3. **Включенная модель** (опционально для первого запуска)
   - Проверь: `chrome://on-device-internals/`
   - Блок: "Optimization Guide On-Device Model"
   - Статус должен быть: "Ready" или "Downloadable"

### Системные требования:
- Windows 10/11, macOS 13+, или Linux
- 16 GB RAM (рекомендуется)
- GPU с 4+ GB VRAM или 4+ ядра CPU

---

## 🚀 Установка и запуск

### Шаг 1: Загрузить расширение

1. Открой `chrome://extensions/`
2. Включи **Developer mode** (правый верхний угол)
3. Нажми **Load unpacked**
4. Выбери папку `ai-smoke-test/`

### Шаг 2: Открыть popup

1. Кликни на иконку расширения в Chrome toolbar
2. Откроется popup с тестами

---

## 🧪 Тесты

### Step 0: Environment Check ✓

**Что проверяет:**
- Версию Chrome
- Доступность API объектов (LanguageModel, Summarizer, LanguageDetector)
- Новые API (`ai.languageModel`, `ai.summarizer`, `translation.languageDetector`)

**Ожидаемый результат:**
```
✓ Chrome version: 141
✓ Chrome version OK (≥138)

Checking API availability:
  ✓ ai.languageModel: found
  ✓ ai.summarizer: found
  ✓ translation.languageDetector: found

Result: 3/6 APIs detected (new APIs found)
```

**Если НЕ найдены новые API:**
- Могут быть доступны legacy API (LanguageModel, Summarizer, LanguageDetector)
- Или нужно обновить Chrome

---

### Step 1: LanguageModel (Prompt API) 🤖

**Что проверяет:**
- Доступность Gemini Nano
- Создание сессии
- Отправка промпта
- Получение ответа

**Ожидаемый результат (быстрый путь):**
```
✓ Found ai.languageModel (new API)

Checking capabilities...
Capabilities: { "available": "readily" }

Creating session...
✓ Session created successfully

Sending test prompt...

📝 Response:
Hello from Gemini Nano!

✓ Session destroyed

✅ LanguageModel test PASSED!
```

**Ожидаемый результат (первый запуск с загрузкой):**
```
Capabilities: { "available": "after-download" }

⏳ Model needs to be downloaded (first time)
Creating session will trigger download...

Creating session...
  Download progress: 15%
  Download progress: 45%
  Download progress: 78%
  Download progress: 100%

✓ Session created successfully
...
```

**Возможные ошибки:**

- **`available: "no"`** → Устройство не поддерживает Gemini Nano
  - Проверь: `chrome://on-device-internals/`

- **`NotSupportedError`** → Недостаточные системные требования

- **`QuotaExceededError`** → Недостаточно места на диске (~22 GB)

---

### Step 2: Summarizer API 📝

**Что проверяет:**
- Доступность Summarizer
- Создание summarizer с параметрами (type, format, length)
- Суммаризация тестового текста

**Ожидаемый результат:**
```
✓ Found ai.summarizer (new API)

Checking capabilities...
Capabilities: { "available": "readily" }

Creating summarizer...
✓ Summarizer created

Summarizing test text...

📝 Summary:
- AI revolutionizes industries
- Machine learning learns from data
- Deep learning uses neural networks
- NLP understands human language
- Applications: image/speech recognition, autonomous vehicles

✓ Summarizer destroyed

✅ Summarizer test PASSED!
```

---

### Step 3: LanguageDetector API 🌐

**Что проверяет:**
- Доступность Language Detector
- Определение языка для разных текстов
- Confidence scores

**Ожидаемый результат:**
```
✓ Found translation.languageDetector (new API)

Checking capabilities...
Capabilities: { "available": "readily" }

Creating detector...
✓ Detector created

Testing language detection:
  "Hello, how are you today?..." → en (confidence: 0.98)
  "Bonjour, comment allez-vous?..." → fr (confidence: 0.95)
  "Hola, ¿cómo estás?..." → es (confidence: 0.97)
  "Привет, как дела?..." → ru (confidence: 0.93)

✓ Detector destroyed

✅ LanguageDetector test PASSED!
```

---

### Step 4: Full Integration Test 🎯

**Что проверяет:**
- Комплексный workflow:
  1. Определение языка текста
  2. Суммаризация содержания
  3. AI-анализ (topic, sentiment, credibility)

**Ожидаемый результат:**
```
📍 Step 1: Detecting language...
  Language: en

📍 Step 2: Summarizing text...
  Summary:
- Climate change is pressing issue
- Rising temperatures cause extreme weather
- Scientists urge emission reduction
- Countries committed to net-zero targets

📍 Step 3: Analyzing content...
  Analysis:
{
  "topic": "Climate Change",
  "sentiment": "neutral",
  "credibility_indicators": [
    "Scientific consensus referenced",
    "Concrete data points mentioned",
    "Balanced perspective presented"
  ]
}

✅ Full integration test PASSED!

🎉 All APIs working correctly!
```

---

## ✅ Критерии успеха

### Минимальный успех (Tier 1):
- ✅ Environment Check находит хотя бы один API (новый или legacy)
- ✅ LanguageModel test проходит (с загрузкой или без)
- ✅ Получен ответ от Gemini Nano

### Полный успех (Tier 2):
- ✅ Все три API доступны и работают
- ✅ Integration test проходит без ошибок
- ✅ Все новые API (`ai.*`, `translation.*`) обнаружены

### Идеальный успех (Tier 3):
- ✅ Tier 2 выполнен
- ✅ Модель уже загружена (`available: "readily"`)
- ✅ Все тесты проходят < 5 секунд

---

## 🐛 Troubleshooting

### ❌ "LanguageModel API not found"

**Причины:**
1. Chrome версия < 138
2. API не включены в этом канале (нужен Dev/Canary)
3. Extension popup context не поддерживает API

**Решение:**
1. Обновить Chrome до 138+
2. Скачать Chrome Dev: https://www.google.com/chrome/dev/
3. Проверить `chrome://flags/#prompt-api-for-gemini-nano`

---

### ❌ "Available: no" или "unavailable"

**Причины:**
1. Устройство не соответствует системным требованиям
2. Недостаточно RAM/GPU
3. ОС не поддерживается

**Решение:**
1. Проверить: `chrome://on-device-internals/`
2. Убедиться в наличии 16 GB RAM
3. Проверить поддержку ОС (Windows 10+, macOS 13+)

---

### ⏳ "Модель загружается очень долго"

**Причины:**
1. Медленный интернет
2. Недостаточно места на диске
3. Chrome загружает модель в фоне

**Решение:**
1. Дождаться окончания загрузки (может занять 5-15 минут)
2. Проверить прогресс в `chrome://on-device-internals/`
3. Освободить место на диске (нужно 22 GB)

---

### ❌ "QuotaExceededError"

**Причина:**
Недостаточно места на диске профиля Chrome

**Решение:**
1. Освободить ~22 GB на диске
2. Проверить: `df -h` (macOS/Linux) или `Disk Cleanup` (Windows)
3. Удалить неиспользуемые файлы

---

## 📊 Expected Output Summary

| Test | Status | Time | Model Download |
|------|--------|------|----------------|
| Environment Check | ✅ | < 1s | No |
| LanguageModel | ✅ | 2-5s | Yes (first time) |
| Summarizer | ✅ | 2-4s | Maybe (first time) |
| LanguageDetector | ✅ | 1-2s | Maybe (first time) |
| Full Integration | ✅ | 5-10s | Maybe (first time) |

**Total time:**
- First run (with downloads): **5-15 minutes** (model download)
- Subsequent runs: **< 30 seconds**

---

## 🎯 Next Steps

Если все тесты прошли успешно:

1. ✅ **Chrome Environment готов** для разработки
2. ✅ **AI APIs работают** корректно
3. ✅ **Можно начинать** разработку Fake News Detector

### Переход к основному проекту:

1. Использовать **правильные API** (`ai.languageModel`, `ai.summarizer`, `translation.languageDetector`)
2. Убрать **legacy API** (LanguageModel, Summarizer без namespace)
3. Добавить **полноценный UI** и логику fake news detection
4. Протестировать на **реальных новостных сайтах**

---

## 📝 Notes

- Этот smoke test использует **оба варианта API** (новый и legacy) для совместимости
- В production коде Fake News Detector нужно использовать **только новые API**
- Monitor callback работает для отслеживания прогресса загрузки модели
- User activation требуется для `create()` — поэтому вызываем из обработчика клика

---

## 🔗 Useful Links

- Chrome AI Documentation: https://developer.chrome.com/docs/ai
- Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Summarizer API: https://developer.chrome.com/docs/ai/summarizer-api
- Language Detection: https://developer.chrome.com/docs/ai/language-detection
- On-Device Internals: chrome://on-device-internals/
- Chrome Flags: chrome://flags/

---

## ✅ Success Checklist

Перед началом разработки Fake News Detector, убедись:

- [ ] Chrome 138+ установлен
- [ ] Environment Check проходит (API обнаружены)
- [ ] LanguageModel test проходит (ответ получен)
- [ ] Summarizer test проходит (summary создан)
- [ ] LanguageDetector test проходит (язык определен)
- [ ] Full Integration test проходит
- [ ] Модель Gemini Nano загружена (status: "readily")
- [ ] Все тесты выполняются < 1 минуты (после первой загрузки)

**Если все пункты отмечены — можно начинать разработку! 🚀**
