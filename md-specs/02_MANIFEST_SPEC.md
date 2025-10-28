# 02_MANIFEST_SPEC — Спецификация манифеста (Manifest V3)

**Цель:** создать корректный `manifest.json` для MVP с минимальными пермишенами.

## Инструкции
1. Создать файл `manifest.json` в корне проекта.
2. Вставить содержимое из раздела ниже **как есть**.
3. Проверить загрузку в `chrome://extensions` (Developer mode → Load unpacked).

## Образец содержимого `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Fake News Detector (Legacy AI)",
  "version": "1.0.0",
  "description": "On-device анализ новостных страниц: score, red flags, подсветка утверждений. Legacy Chrome Built-in AI API.",
  "minimum_chrome_version": "138",
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_title": "Fake News Detector"
  },
  "side_panel": {
    "default_path": "src/sidepanel/panel.html"
  },
  "background": {
    "service_worker": "src/background/background.js",
    "type": "module"
  },
  "permissions": ["activeTab", "storage", "sidePanel", "scripting"],
  "icons": {
    "16": "src/assets/icons/16.png",
    "32": "src/assets/icons/32.png",
    "128": "src/assets/icons/128.png"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content/content.js"],
    "css": ["src/content/overlay.css"],
    "run_at": "document_idle"
  }]
}
```

## Критерии приёмки
- Расширение загружается без ошибок.
- Попап доступен (Quick View).
- Side Panel открывается из popup или через chrome.sidePanel API.
- Контент-скрипт подключается на страницах.
