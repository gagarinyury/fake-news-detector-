# 15_BADGE_AUTO_SPEC — Автоматический badge при загрузке страницы

**Цель:** иконка extension показывает credibility score автоматически (БЕЗ клика).

## Логика
1. `chrome.tabs.onUpdated` слушает загрузку страницы (`status === 'complete'`)
2. Проверяет домен в офлайн базе (`knownSites.js`) → мгновенный badge
3. Параллельно триггерит offscreen → AI анализ → обновляет badge
4. Кэш: ключ `v1:${url}:${textLength}`, TTL 24ч

## background.js
```javascript
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    const domain = new URL(tab.url).hostname;

    // Быстрый офлайн score
    const offlineScore = knownSites[domain];
    if (offlineScore) {
      updateBadge(tabId, offlineScore);
    }

    // Проверка кэша (с TTL)
    const cached = await getCachedResult(tab.url);
    if (cached) {
      updateBadge(tabId, cached.score);
      return; // Используем кэш
    }

    // AI анализ в фоне
    try {
      const text = await getPageText(tabId);
      const result = await analyzeInOffscreen(text, tab.url, tab.title);
      updateBadge(tabId, result.score);
      await cacheResult(tab.url, text.length, result);
    } catch (e) {
      console.error('Auto-analysis failed:', e);
    }
  }
});

// Кэш с TTL
async function getCachedResult(url) {
  const key = `cache:${hashURL(url)}`;
  const cached = await chrome.storage.local.get(key);

  if (cached[key]) {
    const age = Date.now() - cached[key].timestamp;
    const TTL = 24 * 60 * 60 * 1000; // 24 часа

    if (age < TTL) {
      return cached[key].data;
    }
    // Удалить устаревший
    await chrome.storage.local.remove(key);
  }
  return null;
}

async function cacheResult(url, textLength, data) {
  const key = `cache:${hashURL(url)}`;
  await chrome.storage.local.set({
    [key]: {
      data,
      timestamp: Date.now(),
      textLength
    }
  });
}

function updateBadge(tabId, score) {
  const color = score >= 75 ? '#0f9d58' : score >= 40 ? '#f4b400' : '#db4437';
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text: String(score) });
}
```

## Acceptance
- Badge обновляется автоматически при загрузке страницы.
- Офлайн DB даёт мгновенный результат для известных сайтов.
- AI анализ обновляет badge через 5-10 сек.
