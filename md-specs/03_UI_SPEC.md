# 03_UI_SPEC — Спецификация UI попапа

**Цель:** спроектировать попап с понятным UX: запуск анализа, статусы, отчёт, кэш, копирование.

## Задачи
- Разметка и стили попапа.
- Кнопки: Analyze, Highlight Claims, Clear highlights, Copy report (JSON).
- Тумблер: Allow online verification (optional).
- Блоки: Score/Verdict/Flags/Claims/Summary/Language.

## Требования к разметке
- HTML: `src/popup/popup.html`
- CSS: `src/popup/popup.css`
- Обязательные ID:
  - `#btn-analyze`, `#btn-highlight`, `#btn-copy`, `#btn-clear`, `#toggle-online`
  - `#status`, `#result`, `#score`, `#verdict`, `#flags`, `#claims`, `#summary`, `#lang`

## Acceptance
- Попап отображается корректно.
- Кнопки кликабельны, элементы обнаруживаются по ID.
