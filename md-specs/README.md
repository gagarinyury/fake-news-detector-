# MD Specs Bundle — Fake News Detector (Legacy Chrome Built‑in AI)

Это пакет **атомарных Markdown‑спецификаций** для ускорённой разработки расширения Chrome на базе Legacy Chrome Built‑in AI API (`ai.languageModel`, `ai.summarizer`, `ai.languageDetector`).  
Использование рассчитано на запуск задач в нескольких чатах Cloud Code **параллельно**.

## Состав
- `00_BUILD_CHAIN.md` — оркестрация: порядок, параллельность, критерий готовности.
- `01_ARCH_SPEC.md` — архитектура и структура каталогов.
- `02_MANIFEST_SPEC.md` — спецификация манифеста (Manifest V3).
- `03_UI_SPEC.md` — попап (HTML/CSS).
- `04_CONTENT_SCRIPT_SPEC.md` — извлечение текста и оверлей.
- `05_POPUP_LOGIC_SPEC.md` — логика попапа и вызовы Legacy AI.
- `06_PROMPT_SCHEMA_SPEC.md` — контракт промптов и JSON‑ответов.
- `07_HYBRID_BACKEND_SPEC.md` — (опц.) Verify Claims backend (Express).
- `08_TEST_BENCH_SPEC.md` — мини‑бенч и метрики.
- `09_VIDEO_DEMO_SPEC.md` — сценарий 3‑минутного демо.
- `10_README_SUBMIT_SPEC.md` — упаковка GitHub/Devpost.
- `11_MULTIMODAL_SPEC.md` — (опц.) мультимодальность изображений.
- `12_UX_METRICS_SPEC.md` — (опц.) метрики UX/производительности.
- `13_DEPLOY_SPEC.md` — (опц.) публикация в Chrome Web Store.

## Как использовать
1. Открой чат Cloud Code «A‑ядро» и выполняй по порядку: 01 → 02 → 06 → 05.
2. Открой параллельный чат «B‑UX»: 03 → 04.
3. Сшивка: 08 → 09 → 10. Опционально — 07/11/12 → 13.
4. См. подробности в `00_BUILD_CHAIN.md`.

Удачной разработки!
