// Background Service Worker - orchestration
import { knownSites } from '../shared/knownSites.js';
import { hashURL } from '../shared/hashing.js';
import { logError, handleGracefully } from '../shared/errorHandler.js';

console.log('Fake News Detector: Background service worker loaded');

// ============================================================================
// SIDE PANEL MANAGEMENT
// ============================================================================

async function openSidePanel(tabId) {
  try {
    await chrome.sidePanel.open({ tabId });
    console.log('Side panel opened for tab:', tabId);
  } catch (error) {
    logError(error, { context: 'openSidePanel', tabId });
    throw error;
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedResult(url) {
  const key = `cache:${hashURL(url)}`;
  const result = await chrome.storage.local.get(key);

  if (result[key]) {
    const age = Date.now() - result[key].timestamp;

    if (age < TTL) {
      console.log('Cache hit for', url);
      return result[key].data;
    }

    // Remove stale cache
    await chrome.storage.local.remove(key);
    console.log('Cache expired for', url);
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
  console.log('Cached result for', url);
}

// ============================================================================
// BADGE UPDATES
// ============================================================================

function updateBadge(tabId, score) {
  const color = score >= 75 ? '#0f9d58' : score >= 40 ? '#f4b400' : '#db4437';
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text: String(score) });
}

// ============================================================================
// PAGE TEXT EXTRACTION
// ============================================================================

async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return true;
  } catch (error) {
    // Content script not loaded, inject it
    console.log('Content script not loaded, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['src/content/overlay.css']
      });
      console.log('Content script injected');
      // Wait a bit for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      throw new Error('Cannot access page content');
    }
  }
}

async function getPageText(tabId) {
  // Ensure content script is loaded
  await ensureContentScript(tabId);

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'GET_PAGE_TEXT' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.ok) {
          resolve(response);
        } else {
          reject(new Error('Failed to get page text'));
        }
      }
    );
  });
}

// ============================================================================
// AUTO-ANALYSIS ON PAGE LOAD
// ============================================================================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    console.log('Page loaded:', tab.url);

    try {
      const domain = new URL(tab.url).hostname;

      // Quick offline score
      const offlineScore = knownSites[domain];
      if (offlineScore) {
        updateBadge(tabId, offlineScore);
        console.log('Offline score for', domain, ':', offlineScore);
      }

      // Check cache for badge display
      const cached = await getCachedResult(tab.url);
      if (cached) {
        updateBadge(tabId, cached.score);
        console.log('Using cached result for badge:', tab.url);
      }

      // Auto-analysis removed - user must open Side Panel for AI analysis
      // Badge only shows cached results or offline scores

    } catch (error) {
      logError(error, { context: 'auto-analysis', url: tab.url });
      // Don't crash - extension continues in degraded mode
    }
  }
});

// ============================================================================
// MESSAGE HANDLER (for popup)
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Open Side Panel
  if (msg.type === 'OPEN_SIDE_PANEL') {
    openSidePanel(msg.data.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(error => {
        logError(error, { context: 'OPEN_SIDE_PANEL', tabId: msg.data.tabId });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // Get cached analysis only
  if (msg.type === 'GET_CACHED_ANALYSIS') {
    handleGetCachedAnalysis(msg.data.url)
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => {
        logError(error, { context: 'GET_CACHED_ANALYSIS' });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // Request page text (from Side Panel)
  if (msg.type === 'REQUEST_PAGE_TEXT') {
    handleRequestPageText(msg.data.tabId)
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(error => {
        logError(error, { context: 'REQUEST_PAGE_TEXT', tabId: msg.data.tabId });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // Cache result (from Side Panel)
  if (msg.type === 'CACHE_RESULT') {
    handleCacheResult(msg.data.url, msg.data.result)
      .then(() => sendResponse({ ok: true }))
      .catch(error => {
        logError(error, { context: 'CACHE_RESULT' });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (msg.type === 'HIGHLIGHT_CLAIMS') {
    handleHighlightClaims(msg.data.tabId, msg.data.claims, msg.data.riskMap)
      .then(count => sendResponse({ ok: true, count }))
      .catch(error => {
        logError(error, { context: 'HIGHLIGHT_CLAIMS', tabId: msg.data.tabId });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (msg.type === 'CLEAR_HIGHLIGHTS') {
    handleClearHighlights(msg.data.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(error => {
        logError(error, { context: 'CLEAR_HIGHLIGHTS', tabId: msg.data.tabId });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
});

async function handleGetCachedAnalysis(url) {
  // Only return cached data, no AI analysis
  const cached = await getCachedResult(url);
  return cached;
}

async function handleRequestPageText(tabId) {
  // Get page text for Side Panel
  const pageData = await getPageText(tabId);
  const tab = await chrome.tabs.get(tabId);

  return {
    text: pageData.text,
    url: tab.url,
    title: pageData.title
  };
}

async function handleCacheResult(url, result) {
  // Cache result from Side Panel
  await cacheResult(url, result.summary?.length || 0, result);

  // Update badge
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length > 0) {
    updateBadge(tabs[0].id, result.score);
  }
}

async function handleHighlightClaims(tabId, claims, riskMap) {
  console.log('=== BACKGROUND: HIGHLIGHT_CLAIMS ===');
  console.log('Tab ID:', tabId);
  console.log('Claims count:', claims?.length || 0);
  console.log('Claims:', claims);
  console.log('Risk map:', riskMap);

  // Ensure content script is loaded
  await ensureContentScript(tabId);

  return new Promise((resolve, reject) => {
    console.log('📤 Sending HIGHLIGHT_CLAIMS message to content script...');

    chrome.tabs.sendMessage(
      tabId,
      { type: 'HIGHLIGHT_CLAIMS', data: { claims, riskMap } },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('✗ Message failed:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.ok) {
          console.log('✓ Highlight successful, count:', response.count);
          resolve(response.count || 0);
        } else {
          console.error('✗ Highlight failed:', response);
          reject(new Error('Failed to highlight claims'));
        }
      }
    );
  });
}

async function handleClearHighlights(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'CLEAR_HIGHLIGHTS' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.ok) {
          resolve();
        } else {
          reject(new Error('Failed to clear highlights'));
        }
      }
    );
  });
}
