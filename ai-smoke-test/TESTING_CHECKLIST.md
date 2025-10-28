# ✅ Chrome Built-in AI Testing Checklist

## 📋 Pre-Flight Check (сделай ПЕРЕД загрузкой extension)

### ✓ Этап 0: Проверка окружения

**1. Chrome Version**
```
Открой: chrome://version
Проверь: Version должна быть ≥ 138

✅ У тебя: Chrome 141 — OK!
```

**2. Disk Space**
```
Проверка: ~22 GB свободно на диске профиля

✅ У тебя: 22 GB available — OK! (минимум достигнут)
```

**3. On-Device Model Status**
```
Открой: chrome://on-device-internals/

Найди блок: "Optimization Guide On-Device Model"

Проверь статус:
  ✅ "Ready" — модель загружена, всё готово
  ⏳ "Downloadable" — модель скачается при первом использовании
  ❌ "Unavailable" — устройство не поддерживает

⚠️  ВАЖНО: Сделай скриншот этой страницы для отчёта!
```

**4. Check API in DevTools (опционально)**
```
1. Открой любую вкладку
2. F12 → Console
3. Введи:

typeof ai
// Должно быть: "object" или "undefined"

typeof ai?.languageModel
// Должно быть: "object" или "undefined"

typeof translation
// Должно быть: "object" или "undefined"

⚠️  Если "undefined" — не критично, проверим в extension
```

---

## 🚀 Этап 1: Загрузка Extension

### Шаги:

1. **Открой chrome://extensions/**

2. **Включи Developer Mode**
   - Toggle в правом верхнем углу
   - Должны появиться кнопки "Load unpacked", "Pack extension", etc.

3. **Load unpacked**
   - Нажми "Load unpacked"
   - Выбери папку: `/Users/yurygagarin/code/google/ai-smoke-test/`
   - Нажми "Select"

4. **Проверь загрузку**
   ```
   ✅ Extension "AI Smoke Test" появился в списке
   ✅ Нет ошибок в карточке extension
   ✅ Иконка extension появилась в toolbar (puzzle icon)
   ```

5. **Если есть ошибки:**
   - Нажми "Errors" в карточке extension
   - Скопируй текст ошибки
   - Отправь мне для анализа

---

## 🧪 Этап 2: Запуск Тестов

### Test 0: Environment Check

**Действия:**
1. Кликни на иконку extension в toolbar
2. Popup должен открыться
3. Нажми "Check Environment"

**Ожидаемый результат:**
```
✓ Chrome version: 141
✓ Chrome version OK (≥138)

Checking API availability:
  ✓ ai.languageModel: found (или ✗ NOT FOUND)
  ✓ ai.summarizer: found (или ✗ NOT FOUND)
  ✓ translation.languageDetector: found (или ✗ NOT FOUND)

Result: X/6 APIs detected
```

**Критерии успеха:**
- ✅ Минимум: хотя бы 1 API найден (новый или legacy)
- ✅ Идеально: все 3 новых API найдены

**Если все "NOT FOUND":**
- ⚠️  Возможно, нужен Chrome Dev/Canary
- Скачай: https://www.google.com/chrome/dev/
- Повтори тест в Chrome Dev

---

### Test 1: LanguageModel (Prompt API) 🤖

**Действия:**
1. Нажми "Test LanguageModel"
2. **Внимание:** Первый запуск может занять 5-15 минут (загрузка модели)
3. Следи за прогрессом: "Download progress: X%"

**Ожидаемый результат (модель уже загружена):**
```
✓ Found ai.languageModel (new API)
Capabilities: { "available": "readily" }

Creating session...
✓ Session created successfully

Sending test prompt...

📝 Response:
Hello from Gemini Nano!

✓ Session destroyed

✅ LanguageModel test PASSED!
```

**Ожидаемый результат (первая загрузка):**
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

**Критерии успеха:**
- ✅ Получен ответ от модели (любой текст)
- ✅ Нет ошибок "NotSupportedError" или "QuotaExceededError"

**Возможные проблемы:**

❌ **"Available: no"**
```
Причина: Устройство не поддерживает Gemini Nano
Решение: Проверь chrome://on-device-internals/
         Возможно, нужна другая ОС или больше RAM
```

❌ **"QuotaExceededError"**
```
Причина: Недостаточно места на диске
Решение: Освободи минимум 22 GB
         Проверь: df -h
```

❌ **"NotSupportedError"**
```
Причина: Системные требования не выполнены
Решение: Проверь RAM (нужно 16 GB)
         Проверь GPU (4+ GB VRAM)
```

---

### Test 2: Summarizer API 📝

**Действия:**
1. Нажми "Test Summarizer"
2. Может потребоваться загрузка модели (как в Test 1)

**Ожидаемый результат:**
```
✓ Found ai.summarizer (new API)
Capabilities: { "available": "readily" }

Creating summarizer...
✓ Summarizer created

Summarizing test text...

📝 Summary:
- AI revolutionizes industries
- Machine learning learns from data
- Deep learning uses neural networks
...

✓ Summarizer destroyed

✅ Summarizer test PASSED!
```

**Критерии успеха:**
- ✅ Summary создан (в markdown или plain text)
- ✅ Summary содержит ключевые пункты (bullet points)

---

### Test 3: LanguageDetector API 🌐

**Действия:**
1. Нажми "Test LanguageDetector"

**Ожидаемый результат:**
```
✓ Found translation.languageDetector (new API)
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

**Критерии успеха:**
- ✅ Языки определены правильно (en, fr, es, ru)
- ✅ Confidence > 0.8 для большинства

---

### Test 4: Full Integration Test 🎯

**Действия:**
1. Нажми "Run All Tests"
2. Это комплексный тест всех API вместе

**Ожидаемый результат:**
```
📍 Step 1: Detecting language...
  Language: en

📍 Step 2: Summarizing text...
  Summary:
- Climate change is pressing issue
- Rising temperatures cause extreme weather
...

📍 Step 3: Analyzing content...
  Analysis:
{
  "topic": "Climate Change",
  "sentiment": "neutral",
  "credibility_indicators": [...]
}

✅ Full integration test PASSED!

🎉 All APIs working correctly!
```

**Критерии успеха:**
- ✅ Все 3 шага выполнены
- ✅ Получены результаты от всех API
- ✅ Нет ошибок

---

## 📊 Финальная оценка

### Tier 1: Минимальный успех ✅
- [ ] Environment Check прошёл
- [ ] LanguageModel test прошёл (получен ответ)
- [ ] Хотя бы 1 API работает

**Если достигнут Tier 1:**
→ Можно начинать разработку Fake News Detector с осторожностью

---

### Tier 2: Полный успех ✅✅
- [ ] Все 3 API доступны
- [ ] LanguageModel, Summarizer, LanguageDetector работают
- [ ] Integration test прошёл

**Если достигнут Tier 2:**
→ Можно уверенно разрабатывать Fake News Detector

---

### Tier 3: Идеальный успех ✅✅✅
- [ ] Tier 2 выполнен
- [ ] Все новые API (`ai.*`, `translation.*`) найдены
- [ ] Модель уже загружена (`available: "readily"`)
- [ ] Все тесты < 5 секунд

**Если достигнут Tier 3:**
→ Окружение идеально готово! 🚀

---

## 📝 Reporting Checklist

После прохождения всех тестов, собери отчёт:

### Что мне отправить:

1. **Environment Check результат**
   ```
   Копируй текст из окна "env-log"
   Важно: какие API найдены
   ```

2. **LanguageModel test результат**
   ```
   Копируй текст из окна "lm-log"
   Важно: прошёл ли тест, какой ответ получен
   ```

3. **Статус остальных тестов**
   ```
   Summarizer: PASSED / FAILED
   LanguageDetector: PASSED / FAILED
   Integration: PASSED / FAILED
   ```

4. **Скриншот chrome://on-device-internals/**
   ```
   Блок: "Optimization Guide On-Device Model"
   Покажи статус модели
   ```

5. **Время выполнения**
   ```
   Первый запуск LanguageModel: ___ минут
   Повторный запуск: ___ секунд
   ```

6. **Возникшие ошибки** (если были)
   ```
   Копируй полный текст ошибки
   ```

---

## 🎯 Next Steps

### Если все тесты прошли успешно:

✅ **Chrome Environment готов!**

**Следующие шаги:**
1. Я исправлю код Fake News Detector с правильными API
2. Мы создадим полноценный MVP
3. Протестируем на реальных новостных сайтах

### Если есть проблемы:

❌ **Нужна диагностика**

**Отправь мне:**
1. Результаты всех тестов (копируй текст из окон)
2. Скриншот chrome://on-device-internals/
3. Версию Chrome и ОС
4. Тексты ошибок (если были)

**Я помогу:**
- Определить причину
- Предложить решение
- Подобрать альтернативный подход

---

## ⏱️ Expected Timing

**Первый запуск (с загрузкой модели):**
- Environment Check: < 1 секунда
- LanguageModel: 5-15 минут (загрузка ~1.5 GB)
- Summarizer: 2-5 минут (может использовать ту же модель)
- LanguageDetector: < 1 минута (маленькая модель)
- Integration: 1-2 минуты

**Total: 10-25 минут** (в зависимости от скорости интернета)

**Повторный запуск (модель загружена):**
- Environment Check: < 1 секунда
- LanguageModel: 2-5 секунд
- Summarizer: 2-4 секунды
- LanguageDetector: 1-2 секунды
- Integration: 5-10 секунд

**Total: < 30 секунд**

---

## 🔥 Ready to Test!

**Твои действия:**

1. ✅ Открой chrome://extensions/
2. ✅ Load unpacked → выбери `/Users/yurygagarin/code/google/ai-smoke-test/`
3. ✅ Кликни на иконку extension
4. ✅ Нажми "Check Environment"
5. ✅ Нажми "Test LanguageModel"
6. ⏳ Дождись результата (может быть долго в первый раз)
7. ✅ Отправь мне результаты!

**Поехали! 🚀**
