// Popup UI logic
import { classifyError } from '../shared/errorHandler.js';

console.log('Fake News Detector: Popup loaded');

// ============================================================================
// STATE
// ============================================================================

let currentAnalysis = null;
let currentTabId = null;

// ============================================================================
// UI HELPERS
// ============================================================================

function setStatus(text, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#db4437' : '#000';
}

function setErrorStatus(error) {
  const classified = classifyError(error);
  setStatus(classified.userMessage, true);
  console.error('Error details:', classified);
}

function showResult(data) {
  currentAnalysis = data;

  // Show result container
  document.getElementById('result').style.display = 'block';

  // Score
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = data.score;
  if (data.score >= 75) {
    scoreEl.style.color = '#0f9d58';
  } else if (data.score >= 40) {
    scoreEl.style.color = '#f4b400';
  } else {
    scoreEl.style.color = '#db4437';
  }

  // Verdict
  document.getElementById('verdict').textContent = data.verdict || 'No verdict';

  // Red flags
  const flagsEl = document.getElementById('flags');
  if (data.red_flags && data.red_flags.length > 0) {
    flagsEl.innerHTML = '<ul>' +
      data.red_flags.map(flag => `<li>${escapeHtml(flag)}</li>`).join('') +
      '</ul>';
  } else {
    flagsEl.textContent = 'No red flags detected';
  }

  // Key claims
  const claimsEl = document.getElementById('claims');
  if (data.claims && data.claims.length > 0) {
    claimsEl.innerHTML = '<ul>' +
      data.claims.map(claim => {
        // Handle multiple formats
        let claimText, accuracy, evidence;

        if (typeof claim === 'string') {
          claimText = claim;
          accuracy = '';
          evidence = '';
        } else if (claim.claim) {
          // New rich format
          claimText = claim.claim;
          accuracy = claim.accuracy || '';
          evidence = claim.evidence || '';
        } else if (claim.text) {
          // Legacy format
          claimText = claim.text;
          accuracy = '';
          evidence = '';
        } else {
          claimText = String(claim);
          accuracy = '';
          evidence = '';
        }

        // Build HTML with accuracy badge
        let html = `<li>${escapeHtml(claimText)}`;

        if (accuracy) {
          const badgeColor = accuracy === 'Accurate' ? '#0f9d58' :
                            accuracy === 'Questionable' ? '#f4b400' : '#5f6368';
          html += ` <span class="accuracy-badge" style="color: ${badgeColor}; font-size: 11px; font-weight: 500;">[${accuracy}]</span>`;
        }

        if (evidence) {
          html += `<br><small style="color: #5f6368;">Source: ${escapeHtml(evidence)}</small>`;
        }

        html += '</li>';
        return html;
      }).join('') +
      '</ul>';
  } else {
    claimsEl.textContent = 'No claims detected';
  }

  // Summary
  const summaryEl = document.getElementById('summary');
  if (data.summary) {
    summaryEl.textContent = data.summary;
  } else {
    summaryEl.textContent = 'No summary available';
  }

  // Language
  document.getElementById('lang').textContent = data.lang || 'unknown';
}

function hideResult() {
  document.getElementById('result').style.display = 'none';
  currentAnalysis = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// QUICK VIEW - CACHED RESULTS ONLY
// ============================================================================

async function loadCachedAnalysis() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    if (!tab.url.startsWith('http')) {
      setStatus('Cannot analyze this page type', true);
      return;
    }

    // Request cached analysis only
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CACHED_ANALYSIS',
      data: { url: tab.url }
    });

    if (response?.ok && response.data) {
      showResult(response.data);
      setStatus('Cached analysis (click Full Analysis to refresh)');
    } else {
      setStatus('No cached data. Click "Full Analysis" to analyze.');
    }

  } catch (error) {
    console.error('Failed to load cache:', error);
    setStatus('Click "Full Analysis" to analyze');
  }
}

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

document.getElementById('btn-full-analysis').addEventListener('click', async () => {
  console.log('Full Analysis button clicked');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url?.startsWith('http')) {
      setStatus('Cannot analyze this page type', true);
      return;
    }

    // Open Side Panel
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      data: { tabId: tab.id }
    });

    if (response?.ok) {
      setStatus('Side Panel opened');
      // Close popup after 500ms
      setTimeout(() => window.close(), 500);
    } else {
      throw new Error(response?.error || 'Failed to open Side Panel');
    }

  } catch (error) {
    console.error('Failed to open Side Panel:', error);
    setErrorStatus(error);
  }
});

document.getElementById('btn-highlight').addEventListener('click', async () => {
  console.log('=== POPUP: Highlight button clicked ===');

  if (!currentAnalysis || !currentTabId) {
    console.log('✗ No analysis or tab ID');
    setStatus('No analysis available', true);
    return;
  }

  console.log('Current analysis:', currentAnalysis);
  console.log('Tab ID:', currentTabId);

  if (!currentAnalysis.claims || currentAnalysis.claims.length === 0) {
    console.log('✗ No claims in analysis');
    setStatus('No claims to highlight', true);
    return;
  }

  console.log('Claims to highlight:', currentAnalysis.claims.length);

  try {
    // Create risk map based on accuracy
    const riskMap = {};
    currentAnalysis.claims.forEach((claim, i) => {
      console.log(`Claim ${i + 1}:`, claim);

      // Use snippet for highlighting (if available), otherwise fallback
      const snippetText = claim.snippet || (typeof claim === 'string' ? claim : claim.text);

      if (snippetText) {
        // Map accuracy to risk level
        const accuracy = claim.accuracy || 'Unverified';
        const risk = accuracy === 'Accurate' ? 'low' :
                     accuracy === 'Questionable' ? 'high' : 'medium';
        riskMap[snippetText] = risk;
        console.log(`  → Snippet: "${snippetText}" → Risk: ${risk}`);
      } else {
        console.log(`  → No snippet found for claim ${i + 1}`);
      }
    });

    console.log('Risk map:', riskMap);

    console.log('📤 Sending HIGHLIGHT_CLAIMS to background...');
    const response = await chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_CLAIMS',
      data: {
        tabId: currentTabId,
        claims: currentAnalysis.claims,
        riskMap
      }
    });

    console.log('📥 Response from background:', response);

    if (response.ok) {
      console.log(`✓ Highlighted ${response.count || 0} claims`);
      setStatus(`Highlighted ${response.count || 0} claims`);
    } else {
      throw new Error(response.error || 'Highlight failed');
    }

  } catch (error) {
    console.error('✗ Highlight failed:', error);
    setErrorStatus(error);
  }
});

document.getElementById('btn-copy').addEventListener('click', async () => {
  console.log('Copy button clicked');

  if (!currentAnalysis) {
    setStatus('No analysis to copy', true);
    return;
  }

  try {
    const report = JSON.stringify(currentAnalysis, null, 2);
    await navigator.clipboard.writeText(report);
    setStatus('Report copied to clipboard');

    // Reset status after 2 seconds
    setTimeout(() => {
      if (currentAnalysis) {
        setStatus('Analysis ready');
      }
    }, 2000);

  } catch (error) {
    console.error('Copy failed:', error);
    setStatus('Failed to copy', true);
  }
});

document.getElementById('btn-clear').addEventListener('click', async () => {
  console.log('Clear button clicked');

  if (!currentTabId) {
    setStatus('No active tab', true);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_HIGHLIGHTS',
      data: { tabId: currentTabId }
    });

    if (response.ok) {
      setStatus('Highlights cleared');
    } else {
      throw new Error(response.error || 'Clear failed');
    }

  } catch (error) {
    console.error('Clear failed:', error);
    setErrorStatus(error);
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async () => {
  try {
    setStatus('Loading...');

    // Check if we're on a valid page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.startsWith('http')) {
      setStatus('Cannot analyze this page type', true);
      return;
    }

    // Load cached analysis only
    await loadCachedAnalysis();

  } catch (error) {
    console.error('Initialization failed:', error);
    setStatus('Click "Full Analysis" to analyze');
  }
})();
