# 00_BUILD_CHAIN — Оркестрация выполнения (Cloud Code)

**Дата:** 2025-10-28  
**Цель:** задать порядок и параллельность выполнения всех спецификаций, чтобы их можно было раздавать по разным чатам Cloud Code и быстро получать результат без конфликтов.

---

## Порядок и параллельные ветки

- Этап **A** (последовательно): **01_ARCH → 02_MANIFEST → 16_KNOWN_SITES → 14_OFFSCREEN → 15_BADGE_AUTO → 06_PROMPT_SCHEMA**
- Этап **B** (параллельно с A после 01_ARCH): **03_UI → 04_CONTENT_SCRIPT → 05_POPUP_LOGIC**
- Этап **C** (параллельно): **17_ERROR_HANDLING**
- Сшивка A+B+C ⇒ **08_TEST_BENCH → 09_VIDEO_DEMO → 10_README_SUBMIT**
- Опционально: **11_MULTIMODAL**, **12_UX_METRICS**, **13_DEPLOY**

### Граф зависимостей (упрощённо)
```
        ┌────────────┐
        │ 01_ARCH    │
        └─────┬──────┘
              │
     ┌────────┼────────────┐
     │        │            │
  02_MAN   03_UI      04_CONTENT
     │        │            │
     └────────┼────────────┘
              ↓
     06_PROMPT_SCHEMA
              ↓
        05_POPUP_LOGIC
              ↓
   ┌──────────┼─────────┐
   │          │         │
07_HYBRID  08_TEST   11_MULTIMODAL
   │          │         │
   └────┬──────┴────────┘
        ↓
   09_VIDEO_DEMO
        ↓
  10_README_SUBMIT
        ↓
    12_UX_METRICS
        ↓
     13_DEPLOY
```

---

## Как использовать в Cloud Code

1. Открой новый чат **A‑ядро** и последовательно скормите:  
   `01_ARCH_SPEC.md` → `02_MANIFEST_SPEC.md` → `06_PROMPT_SCHEMA_SPEC.md` → `05_POPUP_LOGIC_SPEC.md`.
2. Открой параллельный чат **B‑UX** и скормите:  
   `03_UI_SPEC.md` → `04_CONTENT_SCRIPT_SPEC.md`.
3. Когда A и B закончатся без ошибок, выполните:  
   `08_TEST_BENCH_SPEC.md` → `09_VIDEO_DEMO_SPEC.md` → `10_README_SUBMIT_SPEC.md`.
4. Опционально для призовых треков:  
   `07_HYBRID_BACKEND_SPEC.md` (+ по времени `11_MULTIMODAL_SPEC.md`, `12_UX_METRICS_SPEC.md`) → `13_DEPLOY_SPEC.md`.

**Критерий готовности пайплайна:** после `05 + 04 + 03` — попап анализирует новостную страницу, подсвечивает утверждения, суммаризация и детект языка работают, кэш включен.
