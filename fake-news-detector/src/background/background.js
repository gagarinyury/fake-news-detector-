// Background Service Worker - orchestration
import { knownSites } from '../shared/knownSites.js';
import { hashURL } from '../shared/hashing.js';
import { logError, handleGracefully } from '../shared/errorHandler.js';
import { getSettings, AUTO_ANALYSIS_MODES, isNewsLikeDomain, getSuspicionScore } from '../shared/settings.js';

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
// BADGE UPDATES - 3 LEVELS OF INTELLIGENCE
// ============================================================================

const BADGE_MODES = {
  INSTANT: 'instant',      // Offline knownSites (0ms)
  CACHED: 'cached',        // chrome.storage (10ms)
  AI_ANALYZING: 'analyzing', // AI analysis in progress
  AI_COMPLETE: 'ai'        // Full AI analysis complete
};

/**
 * Update badge with score and mode
 * @param {number} tabId - Tab ID
 * @param {number|string} score - Score (0-100) or '?' or '...'
 * @param {string} mode - BADGE_MODES value
 * @param {object} extra - Additional tooltip data
 */
function updateBadge(tabId, score, mode = BADGE_MODES.INSTANT, extra = {}) {
  let color, text;

  if (score === '...') {
    // Analyzing state
    color = '#9AA0A6'; // Gray
    text = '...';
  } else if (score === '?') {
    // Unknown state
    color = '#E8EAED'; // Light gray
    text = '?';
  } else {
    // Numeric score
    color = score >= 75 ? '#0f9d58' : score >= 40 ? '#f4b400' : '#db4437';
    text = String(score);
  }

  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text });

  // Update tooltip
  updateBadgeTooltip(tabId, score, mode, extra);
}

/**
 * Update badge tooltip with detailed info
 */
function updateBadgeTooltip(tabId, score, mode, extra) {
  let tooltip = 'Fake News Detector';

  if (score === '...') {
    tooltip = 'Analyzing page credibility...';
  } else if (score === '?') {
    tooltip = 'Click to analyze page credibility';
  } else {
    const modeLabel = mode === BADGE_MODES.INSTANT ? ' (Known source)' :
                      mode === BADGE_MODES.CACHED ? ' (Cached)' :
                      mode === BADGE_MODES.AI_COMPLETE ? ' (AI analyzed)' : '';

    tooltip = `Credibility Score: ${score}/100${modeLabel}`;

    if (extra.domain) {
      tooltip += `\nDomain: ${extra.domain}`;
    }

    if (extra.timestamp) {
      const date = new Date(extra.timestamp);
      tooltip += `\nAnalyzed: ${date.toLocaleString()}`;
    }

    if (extra.redFlagsCount !== undefined) {
      tooltip += `\nRed flags: ${extra.redFlagsCount}`;
    }
  }

  chrome.action.setTitle({ tabId, title: tooltip });
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
// SMART AUTO-ANALYSIS ON PAGE LOAD - 3 LEVELS
// ============================================================================

// Track pending analysis timers
const pendingAnalysis = new Map();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    console.log('📄 Page loaded:', tab.url);

    try {
      const domain = new URL(tab.url).hostname;
      const settings = await getSettings();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🟢 LEVEL 1: INSTANT (Known Sites - Offline)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const offlineScore = knownSites[domain];
      if (offlineScore) {
        updateBadge(tabId, offlineScore, BADGE_MODES.INSTANT, { domain });
        console.log(`✓ Level 1 (Instant): ${domain} = ${offlineScore}`);
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🟡 LEVEL 2: CACHED (Previous Analysis)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const cached = await getCachedResult(tab.url);
      if (cached) {
        updateBadge(tabId, cached.score, BADGE_MODES.CACHED, {
          domain,
          timestamp: cached.timestamp || Date.now(),
          redFlagsCount: cached.red_flags?.length || 0
        });
        console.log(`✓ Level 2 (Cached): ${cached.score}`);
        return; // Stop here if we have cache
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔵 LEVEL 3: AI ANALYSIS (Smart Auto-Trigger)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Check if auto-analysis is enabled
      if (settings.autoAnalysis === AUTO_ANALYSIS_MODES.OFF) {
        updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
        console.log('⏸️  Auto-analysis disabled by user');
        return;
      }

      // Smart mode: only analyze news-like domains
      if (settings.autoAnalysis === AUTO_ANALYSIS_MODES.SMART) {
        if (!isNewsLikeDomain(domain)) {
          updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
          console.log(`⏸️  Skipping non-news domain: ${domain}`);
          return;
        }
      }

      // Clear any existing pending analysis for this tab
      if (pendingAnalysis.has(tabId)) {
        clearTimeout(pendingAnalysis.get(tabId));
      }

      // Schedule analysis with delay (throttling)
      console.log(`⏳ Scheduling analysis in ${settings.analysisDelay}ms...`);
      const timer = setTimeout(async () => {
        // Verify user is still on the same page
        const currentTab = await chrome.tabs.get(tabId).catch(() => null);
        if (!currentTab || currentTab.url !== tab.url) {
          console.log('⏸️  Tab changed, skipping analysis');
          return;
        }

        console.log(`🤖 Triggering Level 3 (AI) analysis for: ${tab.url}`);
        await triggerBackgroundAnalysis(tabId, tab.url, tab.title, domain);
      }, settings.analysisDelay);

      pendingAnalysis.set(tabId, timer);

    } catch (error) {
      logError(error, { context: 'smart-auto-analysis', url: tab.url });
      // Don't crash - extension continues in degraded mode
    }
  }
});

/**
 * Trigger AI analysis in background via Side Panel
 */
async function triggerBackgroundAnalysis(tabId, url, title, domain) {
  try {
    // Show "analyzing" badge
    updateBadge(tabId, '...', BADGE_MODES.AI_ANALYZING, { domain });

    // Open Side Panel silently (user can switch to it if they want)
    await chrome.sidePanel.open({ tabId });

    // Send message to Side Panel to start analysis
    chrome.runtime.sendMessage({
      type: 'AUTO_ANALYZE_REQUEST',
      data: { tabId, url, title }
    }).catch(error => {
      // Side Panel might not be ready yet, that's OK
      console.warn('Side Panel not ready for auto-analysis:', error.message);
    });

    console.log(`✓ Auto-analysis triggered for tab ${tabId}`);

  } catch (error) {
    console.error('Background analysis trigger failed:', error);
    // Revert badge to unknown state
    updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
  }
}

// Clean up timers when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (pendingAnalysis.has(tabId)) {
    clearTimeout(pendingAnalysis.get(tabId));
    pendingAnalysis.delete(tabId);
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
