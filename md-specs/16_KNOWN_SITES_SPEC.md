# 16_KNOWN_SITES_SPEC — Офлайн база доверенных сайтов

**Цель:** мгновенная оценка репутации домена БЕЗ AI (для скорости badge).

## src/shared/knownSites.js
```javascript
export const knownSites = {
  // High credibility (80-100)
  'reuters.com': 97,
  'apnews.com': 96,
  'bbc.com': 95,
  'npr.org': 94,
  'theguardian.com': 92,
  'nytimes.com': 90,
  'washingtonpost.com': 90,
  'economist.com': 93,

  // Medium credibility (50-79)
  'cnn.com': 75,
  'foxnews.com': 65,
  'buzzfeednews.com': 70,

  // Low credibility / Satire (0-49)
  'theonion.com': 20, // сатира
  'infowars.com': 10,
  'breitbart.com': 30,
  'naturalnews.com': 15,

  // Можно добавить топ-100 сайтов
};
```

## Использование
```javascript
// background.js
import { knownSites } from './shared/knownSites.js';

const domain = new URL(url).hostname;
const offlineScore = knownSites[domain] || null;

if (offlineScore) {
  updateBadge(tabId, offlineScore); // мгновенно
}
```

## Источники данных
- NewsGuard ratings
- Media Bias Fact Check
- AllSides media bias ratings
- Ручная курация топ-100 новостных сайтов

## Acceptance
- База содержит минимум 50 сайтов.
- Значения соответствуют реальной репутации источников.
