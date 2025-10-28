// Background Service Worker - orchestration
import { knownSites } from '../shared/knownSites.js';
import { hashURL } from '../shared/hashing.js';
import { logError, handleGracefully } from '../shared/errorHandler.js';
import { getSettings, AUTO_ANALYSIS_MODES, isNewsLikeDomain, getSuspicionScore } from '../shared/settings.js';
import { safeCacheSet, safeCacheGet, safeCacheRemove, schedulePeriodicCleanup } from '../shared/storage.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('Background');

logger.info('Background service worker loaded');

// Start periodic cache cleanup
schedulePeriodicCleanup();

// ============================================================================
// SIDE PANEL MANAGEMENT
// ============================================================================

async function openSidePanel(tabId) {
  try {
    await chrome.sidePanel.open({ tabId });
    logger.debug('Side panel opened for tab:', tabId);
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
  const cachedData = await safeCacheGet(key);

  if (cachedData) {
    const age = Date.now() - cachedData.timestamp;

    if (age < TTL) {
      logger.debug('Cache hit', { url, age: Math.round(age / 1000) + 's' });
      return cachedData.data;
    }

    // Remove stale cache
    await safeCacheRemove(key);
    logger.debug('Cache expired', { url, age: Math.round(age / 1000) + 's' });
  }

  return null;
}

async function cacheResult(url, textLength, data) {
  const key = `cache:${hashURL(url)}`;
  const result = await safeCacheSet(key, {
    data,
    timestamp: Date.now(),
    textLength
  });

  if (result.success) {
    logger.debug('Cached result', { url, hadCleanup: result.hadToCleanup });
    if (result.hadToCleanup) {
      logger.warn('Storage was full, cleanup performed');
    }
  } else {
    console.error('Failed to cache result:', result.error);
  }
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
    logger.debug('Content script not loaded, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['src/content/overlay.css']
      });
      logger.debug('Content script injected successfully');
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

// Rate limiting & deduplication
const activeAnalysisByTab = new Map(); // tabId -> url (ongoing analyses)
const analysisQueue = new Map();       // url -> [tabId] (waiting for results)

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    logger.debug('Page loaded', { tabId, url: tab.url });

    try {
      const domain = new URL(tab.url).hostname;
      const settings = await getSettings();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🟢 LEVEL 1: INSTANT (Known Sites - Offline)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const offlineScore = knownSites[domain];
      if (offlineScore) {
        updateBadge(tabId, offlineScore, BADGE_MODES.INSTANT, { domain });
        logger.debug('Level 1 (Instant)', { domain, score: offlineScore });
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
        logger.debug('Level 2 (Cached)', { domain, score: cached.score });
        return; // Stop here if we have cache
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔵 LEVEL 3: AI ANALYSIS (Context-Aware Smart Trigger)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Check if auto-analysis is enabled
      if (settings.autoAnalysis === AUTO_ANALYSIS_MODES.OFF) {
        updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
        logger.debug('Auto-analysis disabled by user');
        return;
      }

      // Calculate suspicion score for context-aware analysis
      const suspicionScore = getSuspicionScore(tab.url, domain, tab.title);
      logger.debug('Suspicion score calculated', { domain, suspicionScore });

      // 🚨 HIGH PRIORITY: Auto-analyze suspicious pages immediately
      if (suspicionScore >= 50) {
        logger.warn('SUSPICIOUS PAGE DETECTED', { suspicionScore, url: tab.url });
        updateBadge(tabId, '⚠️', BADGE_MODES.INSTANT, { domain });
        chrome.action.setTitle({
          tabId,
          title: `⚠️ Suspicious content detected (${suspicionScore}/100) - analyzing...`
        });

        // Trigger immediate analysis (reduced delay for suspicious pages)
        const suspiciousDelay = Math.min(1000, settings.analysisDelay);
        const timer = setTimeout(async () => {
          const currentTab = await chrome.tabs.get(tabId).catch(() => null);
          if (currentTab && currentTab.url === tab.url) {
            logger.info('[PRIORITY] Analyzing suspicious page', { url: tab.url, suspicionScore });
            await triggerBackgroundAnalysis(tabId, tab.url, tab.title, domain, suspicionScore);
          }
        }, suspiciousDelay);

        pendingAnalysis.set(tabId, timer);
        return;
      }

      // Smart mode: only analyze news-like domains (low suspicion)
      if (settings.autoAnalysis === AUTO_ANALYSIS_MODES.SMART) {
        if (!isNewsLikeDomain(domain)) {
          updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
          logger.debug('Skipping non-news domain', { domain });
          return;
        }
      }

      // Clear any existing pending analysis for this tab
      if (pendingAnalysis.has(tabId)) {
        clearTimeout(pendingAnalysis.get(tabId));
      }

      // Schedule analysis with delay (throttling)
      logger.debug('Scheduling analysis', { delay: settings.analysisDelay });
      const timer = setTimeout(async () => {
        // Verify user is still on the same page
        const currentTab = await chrome.tabs.get(tabId).catch(() => null);
        if (!currentTab || currentTab.url !== tab.url) {
          logger.debug('Tab changed, skipping analysis');
          return;
        }

        logger.info('Triggering Level 3 (AI) analysis', { url: tab.url });
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
 * WITH rate limiting and deduplication
 * @param {number} suspicionScore - Optional suspicion score (0-100)
 */
async function triggerBackgroundAnalysis(tabId, url, title, domain, suspicionScore = 0) {
  // ═══════════════════════════════════════════════════════════════════════
  // RATE LIMITING: Check if analysis already in progress for this tab
  // ═══════════════════════════════════════════════════════════════════════
  if (activeAnalysisByTab.has(tabId)) {
    logger.debug('Analysis already in progress', { tabId });
    return { skipped: true, reason: 'already_running' };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEDUPLICATION: Check if same URL is being analyzed in another tab
  // ═══════════════════════════════════════════════════════════════════════
  for (const [otherTabId, analysisUrl] of activeAnalysisByTab.entries()) {
    if (analysisUrl === url && otherTabId !== tabId) {
      logger.debug('Queueing duplicate URL analysis', { waitingTab: tabId, activeTab: otherTabId, url });

      // Queue this tab to receive results when other analysis completes
      if (!analysisQueue.has(url)) {
        analysisQueue.set(url, []);
      }
      analysisQueue.get(url).push(tabId);

      // Show "analyzing" badge even though we're waiting
      updateBadge(tabId, '...', BADGE_MODES.AI_ANALYZING, { domain });

      return { queued: true, waitingFor: otherTabId };
    }
  }

  try {
    // Mark as active
    activeAnalysisByTab.set(tabId, url);

    // Show "analyzing" badge
    updateBadge(tabId, '...', BADGE_MODES.AI_ANALYZING, { domain });

    // Open Side Panel silently (user can switch to it if they want)
    await chrome.sidePanel.open({ tabId });

    // Send message to Side Panel to start analysis with context
    chrome.runtime.sendMessage({
      type: 'AUTO_ANALYZE_REQUEST',
      data: {
        tabId,
        url,
        title,
        suspicionScore,
        isSuspicious: suspicionScore >= 50
      }
    }).catch(error => {
      // Side Panel might not be ready yet, that's OK
      logger.warn('Side Panel not ready for auto-analysis', { error: error.message });
    });

    if (suspicionScore >= 50) {
      logger.info('[PRIORITY] Suspicious page analysis triggered', { suspicionScore });
    } else {
      logger.debug('Auto-analysis triggered', { tabId });
    }

    return { started: true };

  } catch (error) {
    console.error('Background analysis trigger failed:', error);
    // Revert badge to unknown state
    updateBadge(tabId, '?', BADGE_MODES.INSTANT, { domain });
    // Remove from active map on error
    activeAnalysisByTab.delete(tabId);
    return { error: error.message };
  }
}

// Clean up timers and active analyses when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (pendingAnalysis.has(tabId)) {
    clearTimeout(pendingAnalysis.get(tabId));
    pendingAnalysis.delete(tabId);
  }

  // Remove from active analyses
  if (activeAnalysisByTab.has(tabId)) {
    const url = activeAnalysisByTab.get(tabId);
    activeAnalysisByTab.delete(tabId);
    logger.debug('Tab closed, analysis aborted', { tabId, url });
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

  // ═══════════════════════════════════════════════════════════════════════
  // ANALYSIS COMPLETION: Update all tabs and process queue
  // ═══════════════════════════════════════════════════════════════════════

  // Find tabs that were analyzing this URL
  const completedTabs = [];
  for (const [tabId, analysisUrl] of activeAnalysisByTab.entries()) {
    if (analysisUrl === url) {
      completedTabs.push(tabId);
    }
  }

  // Remove from active map
  completedTabs.forEach(tabId => {
    activeAnalysisByTab.delete(tabId);
    logger.debug('Analysis completed', { tabId });
  });

  // Update badge for ALL tabs with this URL (including the one that completed)
  const allTabs = await chrome.tabs.query({ url });
  for (const tab of allTabs) {
    updateBadge(tab.id, result.score, BADGE_MODES.AI_COMPLETE, {
      domain: new URL(url).hostname,
      timestamp: Date.now(),
      redFlagsCount: result.red_flags?.length || 0
    });
  }

  // Process queued tabs waiting for this result
  if (analysisQueue.has(url)) {
    const queuedTabs = analysisQueue.get(url);
    logger.debug('Updating queued tabs', { count: queuedTabs.length });

    for (const queuedTabId of queuedTabs) {
      // Update badge
      updateBadge(queuedTabId, result.score, BADGE_MODES.AI_COMPLETE, {
        domain: new URL(url).hostname,
        timestamp: Date.now(),
        redFlagsCount: result.red_flags?.length || 0
      });

      // Remove from active map (they were waiting)
      activeAnalysisByTab.delete(queuedTabId);
    }

    analysisQueue.delete(url);
  }
}

async function handleHighlightClaims(tabId, claims, riskMap) {
  logger.debug('Highlighting claims', { tabId, claimsCount: claims?.length || 0 });

  // Ensure content script is loaded
  await ensureContentScript(tabId);

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'HIGHLIGHT_CLAIMS', data: { claims, riskMap } },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('✗ Message failed:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.ok) {
          logger.debug('Highlight successful', { count: response.count });
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
