import { createLogger } from "../shared/logger.js";
import { classifyError } from '../shared/errorHandler.js';

const logger = createLogger("Popup");
logger.debug('Popup loaded');

// ============================================================================
// STATE
// ============================================================================

let currentAnalysis = null;
let currentTabId = null;

// ============================================================================
// TAB SWITCHING
// ============================================================================

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const targetPanel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      logger.debug('Tab switched', { tab: tab.dataset.tab });
    });
  });
}

// ============================================================================
// UI HELPERS
// ============================================================================

function setStatus(text, isError = false) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#db4437' : '#6e6e73';
  }
}

function setErrorStatus(error) {
  const classified = classifyError(error);
  setStatus(classified.userMessage, true);
  logger.error('Error:', classified);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// SMART STATE MANAGEMENT
// ============================================================================

function showQuickInfo(data) {
  const quickInfo = document.getElementById('quick-info');
  const quickActions = document.getElementById('quick-actions');
  const scoreValue = document.getElementById('score-value');
  const verdict = document.getElementById('quick-verdict');
  const meta = document.getElementById('quick-meta');
  const progressCircle = document.getElementById('progress-circle');

  if (!quickInfo || !scoreValue) return;

  // Show elements
  quickInfo.style.display = 'block';
  if (quickActions) quickActions.style.display = 'grid';

  // Set score
  scoreValue.textContent = data.score || '--';

  // Animate progress ring
  const circumference = 2 * Math.PI * 34; // r=34
  const progress = (data.score / 100) * circumference;
  const offset = circumference - progress;

  if (progressCircle) {
    progressCircle.style.strokeDashoffset = offset;

    // Change color based on score
    if (data.score >= 75) {
      progressCircle.style.stroke = '#30d158'; // Green
    } else if (data.score >= 40) {
      progressCircle.style.stroke = '#ff9f0a'; // Orange
    } else {
      progressCircle.style.stroke = '#ff3b30'; // Red
    }
  }

  // Set verdict
  if (verdict) {
    verdict.textContent = data.verdict || 'No verdict';
  }

  // Set meta
  if (meta) {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const timeStr = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    meta.textContent = `Analyzed at ${timeStr}`;
  }

  // Update status
  setStatus('✓ Analysis loaded from cache');
}

function hideQuickInfo() {
  const quickInfo = document.getElementById('quick-info');
  const quickActions = document.getElementById('quick-actions');

  if (quickInfo) quickInfo.style.display = 'none';
  if (quickActions) quickActions.style.display = 'none';
}

async function loadCachedAnalysis() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    if (!tab.url?.startsWith('http')) {
      setStatus('Cannot analyze this page type', true);
      hideQuickInfo();
      return;
    }

    // Request cached analysis
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CACHED_ANALYSIS',
      data: { url: tab.url }
    });

    if (response?.ok && response.data) {
      currentAnalysis = response.data;
      showQuickInfo(response.data);
      logger.debug('Loaded cached analysis', { score: response.data.score });
    } else {
      hideQuickInfo();
      setStatus('No cached analysis. Click "Open Full Analysis"');
      logger.debug('No cache found for URL');
    }

  } catch (error) {
    logger.error('Failed to load cache', { error: error.message });
    hideQuickInfo();
    setStatus('Click "Open Full Analysis" to start');
  }
}

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

document.getElementById('btn-open-panel').addEventListener('click', async () => {
  logger.debug('Open panel button clicked');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url?.startsWith('http')) {
      setStatus('Cannot open panel for this page', true);
      return;
    }

    setStatus('Opening AI Assistant...');

    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      data: { tabId: tab.id }
    });

    if (response?.ok) {
      setStatus('✓ Panel opened');
      setTimeout(() => window.close(), 500);
    } else {
      throw new Error(response?.error || 'Failed to open panel');
    }

  } catch (error) {
    logger.error('Failed to open panel', { error: error.message });
    setErrorStatus(error);
  }
});

document.getElementById('btn-highlight')?.addEventListener('click', async () => {
  logger.debug('Highlight button clicked');

  if (!currentAnalysis || !currentTabId) {
    setStatus('No analysis available', true);
    return;
  }

  if (!currentAnalysis.claims || currentAnalysis.claims.length === 0) {
    setStatus('No claims to highlight', true);
    return;
  }

  try {
    setStatus('Highlighting claims...');

    // Create risk map based on accuracy
    const riskMap = {};
    currentAnalysis.claims.forEach((claim) => {
      const snippetText = claim.snippet || (typeof claim === 'string' ? claim : claim.text);

      if (snippetText) {
        const accuracy = claim.accuracy || 'Unverified';
        const risk = accuracy === 'Accurate' ? 'low' :
                     accuracy === 'Questionable' ? 'high' : 'medium';
        riskMap[snippetText] = risk;
      }
    });

    const response = await chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_CLAIMS',
      data: {
        tabId: currentTabId,
        claims: currentAnalysis.claims,
        riskMap: riskMap
      }
    });

    if (response?.ok) {
      setStatus(`✓ Highlighted ${response.count} claims`);
      logger.debug('Claims highlighted', { count: response.count });
    } else {
      throw new Error(response?.error || 'Highlighting failed');
    }

  } catch (error) {
    logger.error('Failed to highlight claims', { error: error.message });
    setErrorStatus(error);
  }
});

document.getElementById('btn-clear')?.addEventListener('click', async () => {
  logger.debug('Clear button clicked');

  if (!currentTabId) {
    setStatus('No active tab', true);
    return;
  }

  try {
    setStatus('Clearing highlights...');

    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_HIGHLIGHTS',
      data: { tabId: currentTabId }
    });

    if (response?.ok) {
      setStatus('✓ Highlights cleared');
    } else {
      throw new Error(response?.error || 'Clear failed');
    }

  } catch (error) {
    logger.error('Failed to clear highlights', { error: error.message });
    setErrorStatus(error);
  }
});

document.getElementById('btn-copy')?.addEventListener('click', async () => {
  logger.debug('Copy button clicked');

  if (!currentAnalysis) {
    setStatus('No analysis to copy', true);
    return;
  }

  try {
    const report = JSON.stringify(currentAnalysis, null, 2);
    await navigator.clipboard.writeText(report);

    setStatus('✓ Report copied to clipboard');
    setTimeout(() => {
      setStatus('✓ Analysis loaded from cache');
    }, 2000);

  } catch (error) {
    logger.error('Failed to copy report', { error: error.message });
    setErrorStatus(error);
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async () => {
  try {
    logger.debug('Initializing popup');

    // Initialize tabs
    initTabs();

    // Load cached analysis
    await loadCachedAnalysis();

    logger.debug('Popup initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize popup', { error: error.message });
    setStatus('Initialization error', true);
  }
})();
