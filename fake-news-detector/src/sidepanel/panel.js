/**
 * Side Panel - Full AI Analysis
 * Uses Chrome Built-in AI APIs directly
 */

import { classifyError, logError, createProgressMonitor } from '../shared/errorHandler.js';
import { createLogger, getLogs, clearLogs, downloadLogs } from '../shared/logger.js';
import { getSettings, updateSettings, AUTO_ANALYSIS_MODES } from '../shared/settings.js';
import { getPrompts, savePrompts, resetPrompts, buildAnalysisPrompt, RESPONSE_SCHEMA, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT_TEMPLATE } from '../shared/prompts.js';

const logger = createLogger('SidePanel');

logger.info('Side Panel loaded');

// ============================================================================
// STATE
// ============================================================================

let currentAnalysis = null;
let aiSession = null;
let summarizer = null;
let languageDetector = null;

// ============================================================================
// UI HELPERS
// ============================================================================

function setStatus(text, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#db4437' : '#5f6368';
}

function showProgress(show = true) {
  document.getElementById('progress-section').style.display = show ? 'block' : 'none';
}

function updateProgress(percentage, text) {
  const fill = document.getElementById('progress-fill');
  const textEl = document.getElementById('progress-text');

  fill.style.width = `${percentage}%`;
  textEl.textContent = text;
}

function showError(error) {
  const classified = classifyError(error);

  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const errorHint = document.getElementById('error-hint');

  errorSection.style.display = 'block';
  errorMessage.textContent = classified.userMessage;

  // Add specific hints
  if (classified.type === 'AI_UNAVAILABLE') {
    errorHint.textContent = 'Check chrome://on-device-internals/ to verify AI model status';
  } else if (classified.type === 'QUOTA_EXCEEDED') {
    errorHint.textContent = 'Gemini Nano requires approximately 22 GB of free disk space';
  } else if (classified.type === 'TIMEOUT') {
    errorHint.textContent = 'The analysis took too long. Try with a shorter article.';
  } else {
    errorHint.textContent = '';
  }

  logError(error, { context: 'Side Panel Analysis' });
}

function hideError() {
  document.getElementById('error-section').style.display = 'none';
}

function showResult(data) {
  currentAnalysis = data;

  // Show result container
  document.getElementById('result').style.display = 'block';

  // Score
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = data.score;

  // Color based on score
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
      data.claims.map((claim, index) => {
        // Handle multiple formats
        let claimText, accuracy, evidence, snippet;

        if (typeof claim === 'string') {
          claimText = claim;
          accuracy = '';
          evidence = '';
          snippet = '';
        } else if (claim.claim) {
          // New rich format
          claimText = claim.claim;
          accuracy = claim.accuracy || '';
          evidence = claim.evidence || '';
          snippet = claim.snippet || '';
        } else if (claim.text) {
          // Legacy format
          claimText = claim.text;
          accuracy = '';
          evidence = '';
          snippet = '';
        } else {
          claimText = String(claim);
          accuracy = '';
          evidence = '';
          snippet = '';
        }

        // Build HTML with accuracy badge and snippet info
        let html = `<li><strong>Claim ${index + 1}:</strong> ${escapeHtml(claimText)}`;

        if (accuracy) {
          const badgeColor = accuracy === 'Accurate' ? '#0f9d58' :
                            accuracy === 'Questionable' ? '#f4b400' : '#5f6368';
          html += ` <span style="color: ${badgeColor}; font-size: 11px; font-weight: 600;">[${accuracy}]</span>`;
        }

        if (evidence) {
          html += `<br><small style="color: #5f6368;"><strong>Source:</strong> ${escapeHtml(evidence)}</small>`;
        }

        if (snippet && snippet !== claimText) {
          html += `<br><small style="color: #80868b;"><strong>Searchable:</strong> "${escapeHtml(snippet)}"</small>`;
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

  // Metadata / Metrics
  if (data.metadata) {
    document.getElementById('metric-time').textContent =
      data.metadata.analysisTime ? `${(data.metadata.analysisTime / 1000).toFixed(2)}s` : 'N/A';

    document.getElementById('metric-model').textContent =
      data.metadata.modelUsed || 'Gemini Nano';

    const suspicionEl = document.getElementById('metric-suspicion');
    const suspicion = data.metadata.suspicionScore || 0;
    suspicionEl.textContent = suspicion > 0 ? `${suspicion}/100` : 'N/A';

    // Color code suspicion
    if (suspicion >= 50) {
      suspicionEl.style.color = '#db4437';
      suspicionEl.style.fontWeight = '700';
    } else {
      suspicionEl.style.color = '#202124';
      suspicionEl.style.fontWeight = '600';
    }
  }
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
// AI INITIALIZATION
// ============================================================================

async function checkAIAvailability() {
  console.log('Checking AI availability...');

  // Check if new API exists
  if (!('ai' in self) || !self.ai?.languageModel) {
    // Try legacy API
    if (!('LanguageModel' in self)) {
      throw new Error('AI_UNAVAILABLE: Chrome Built-in AI APIs not found');
    }
    console.log('Using legacy API (LanguageModel)');
    return 'legacy';
  }

  console.log('Using new API (ai.languageModel)');

  // Check capabilities
  const capabilities = await self.ai.languageModel.capabilities();
  console.log('AI capabilities:', capabilities);

  if (capabilities.available === 'no') {
    throw new Error('AI_UNAVAILABLE: AI is not available on this device');
  }

  if (capabilities.available === 'after-download') {
    console.log('AI model needs to be downloaded');
  }

  return 'new';
}

async function initializeAI(onProgress) {
  console.log('Initializing AI session...');

  const apiType = await checkAIAvailability();
  const monitor = createProgressMonitor(onProgress);

  // Load custom prompts (or defaults)
  const prompts = await getPrompts();
  logger.info('Loaded prompts', { hasCustom: prompts !== null });

  if (apiType === 'new') {
    // New API with systemPrompt
    aiSession = await self.ai.languageModel.create({
      systemPrompt: prompts.systemPrompt,
      outputLanguage: 'en',
      monitor
    });

    logger.info('AI session created with new API (systemPrompt)');

    // Initialize summarizer
    const sumCaps = await self.ai.summarizer.capabilities();
    if (sumCaps.available !== 'no') {
      summarizer = await self.ai.summarizer.create({
        type: 'key-points',
        format: 'markdown',
        length: 'short',
        monitor
      });
    }

    // Initialize language detector
    if (self.translation?.languageDetector) {
      const detCaps = await self.translation.languageDetector.capabilities();
      if (detCaps.available !== 'no') {
        languageDetector = await self.translation.languageDetector.create();
      }
    }

  } else {
    // Legacy API with initialPrompts (spec-compliant)
    aiSession = await self.LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: prompts.systemPrompt
      }],
      monitor
    });

    logger.info('AI session created with legacy API (initialPrompts)');

    if ('Summarizer' in self) {
      const avail = await self.Summarizer.availability();
      if (avail !== 'unavailable') {
        summarizer = await self.Summarizer.create({
          type: 'key-points',
          format: 'markdown',
          length: 'short'
        });
      }
    }

    if ('LanguageDetector' in self) {
      const avail = await self.LanguageDetector.availability();
      if (avail !== 'unavailable') {
        languageDetector = await self.LanguageDetector.create();
      }
    }
  }

  console.log('AI session initialized successfully');
}

// ============================================================================
// ANALYSIS
// ============================================================================

async function getPageText() {
  console.log('Requesting page text from background...');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url?.startsWith('http')) {
    throw new Error('Cannot analyze this page type');
  }

  // Request text via background
  const response = await chrome.runtime.sendMessage({
    type: 'REQUEST_PAGE_TEXT',
    data: { tabId: tab.id }
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to get page text');
  }

  console.log('Page text received:', response.text.length, 'chars');
  return response;
}

async function analyzeText(text, url, title, suspicionScore = 0) {
  logger.info('Starting AI analysis', {
    textLength: text.length,
    url,
    title,
    suspicionScore
  });

  const startTime = performance.now();

  const result = {
    score: 0,
    verdict: '',
    red_flags: [],
    claims: [],
    summary: '',
    lang: 'unknown',
    metadata: {
      analysisTime: 0,
      suspicionScore,
      modelUsed: 'Gemini Nano'
    }
  };

  // Step 1: Detect language
  updateProgress(20, 'Detecting language...');
  if (languageDetector) {
    try {
      const detections = await languageDetector.detect(text.slice(0, 1000));
      result.lang = detections[0]?.detectedLanguage || 'unknown';
      console.log('✓ Detected language:', result.lang, 'confidence:', detections[0]?.confidence);
    } catch (error) {
      console.warn('✗ Language detection failed:', error);
    }
  }

  // Step 2: Summarize
  updateProgress(40, 'Generating summary...');
  if (summarizer) {
    try {
      // Limit text to first 3000 chars for summarization
      const textToSummarize = text.slice(0, 3000);
      result.summary = await summarizer.summarize(textToSummarize);
      console.log('✓ Summary generated:', result.summary.length, 'chars');
    } catch (error) {
      console.warn('✗ Summarization failed:', error);
      result.summary = 'Summary unavailable';
    }
  } else {
    result.summary = 'Summary unavailable';
  }

  // Step 3: Analyze credibility
  updateProgress(60, 'Analyzing credibility...');

  // Build prompt using template system
  const prompt = await buildAnalysisPrompt({
    title,
    url,
    text,
    suspicionScore
  });

  logger.debug('Sending prompt to AI', {
    promptPreview: prompt.slice(0, 300),
    suspicionScore
  });

  try {
    // Try structured output with responseConstraint (Chrome 128+)
    let rawResponse;
    try {
      rawResponse = await aiSession.prompt(prompt, {
        responseConstraint: RESPONSE_SCHEMA
      });
      logger.info('Used responseConstraint for structured output');
    } catch (constraintError) {
      // Fallback: Plain prompt without constraint
      logger.warn('responseConstraint not supported, using plain prompt');
      rawResponse = await aiSession.prompt(prompt);
    }

    logger.info('AI response received', {
      responseLength: rawResponse.length,
      responsePreview: rawResponse.slice(0, 500),
      responseFull: rawResponse
    });

    // Parse JSON response
    updateProgress(80, 'Processing results...');
    try {
      const parsed = parseAIResponse(rawResponse);

      logger.info('Parsed AI response', {
        score: parsed.score,
        verdict: parsed.verdict,
        redFlagsCount: parsed.red_flags?.length || 0,
        claimsCount: parsed.claims?.length || 0
      });

      // Log each claim for debugging
      if (parsed.claims && parsed.claims.length > 0) {
        logger.debug('Claims details', {
          claims: parsed.claims.map((claim, i) => ({
            index: i + 1,
            type: typeof claim,
            claim: claim.claim || claim.text || claim,
            snippet: claim.snippet,
            evidence: claim.evidence,
            accuracy: claim.accuracy
          }))
        });
      }

      result.score = parsed.score || 50;
      result.verdict = parsed.verdict || 'Analysis incomplete';
      result.red_flags = parsed.red_flags || [];
      result.claims = parsed.claims || [];

    } catch (parseError) {
      console.error('✗ JSON parse failed:', parseError);
      console.error('Raw response that failed:', rawResponse);
      // Return partial result
      result.verdict = 'Unable to parse complete analysis';
      result.score = 50;
    }
  } catch (promptError) {
    console.error('✗ AI prompt failed:', promptError);
    throw promptError;
  }

  updateProgress(100, 'Complete!');

  // Calculate analysis time
  const endTime = performance.now();
  result.metadata.analysisTime = Math.round(endTime - startTime);

  console.log('=== ANALYSIS COMPLETE ===');
  console.log('Analysis time:', result.metadata.analysisTime, 'ms');
  console.log('Final result:', JSON.stringify(result, null, 2));

  return result;
}

function parseAIResponse(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();

  // Remove trailing commas
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Try to find JSON in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned);
}

async function cacheResult(url, result) {
  console.log('Caching result...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CACHE_RESULT',
      data: { url, result }
    });

    if (response?.ok) {
      console.log('Result cached successfully');
    } else {
      console.warn('Failed to cache result:', response?.error);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }
}

async function performAnalysis() {
  try {
    hideError();
    hideResult();
    showProgress(true);
    updateProgress(0, 'Initializing AI...');
    setStatus('Analyzing...');

    // Initialize AI if needed
    if (!aiSession) {
      await initializeAI((percentage) => {
        if (percentage < 100) {
          updateProgress(Math.floor(percentage * 0.15), `Downloading AI model... ${percentage}%`);
        }
      });
      updateProgress(15, 'AI ready');
    }

    // Get page text
    updateProgress(18, 'Getting page content...');
    const pageData = await getPageText();

    if (!pageData.text || pageData.text.length < 200) {
      throw new Error('Not enough text for analysis (minimum 200 characters)');
    }

    // Analyze
    const result = await analyzeText(pageData.text, pageData.url, pageData.title);

    // Cache result
    await cacheResult(pageData.url, result);

    // Show result
    showProgress(false);
    showResult(result);
    setStatus('Analysis complete');

  } catch (error) {
    console.error('Analysis failed:', error);
    showProgress(false);
    showError(error);
    setStatus('Analysis failed', true);
  }
}

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

document.getElementById('btn-analyze').addEventListener('click', () => {
  console.log('Analyze button clicked');
  performAnalysis();
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

    setTimeout(() => {
      if (currentAnalysis) {
        setStatus('Analysis complete');
      }
    }, 2000);

  } catch (error) {
    console.error('Copy failed:', error);
    setStatus('Failed to copy', true);
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async () => {
  try {
    console.log('Initializing Side Panel...');

    // Check if we're on a valid page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url?.startsWith('http')) {
      setStatus('Navigate to a webpage to analyze', true);
      document.getElementById('btn-analyze').disabled = true;
      return;
    }

    // Check for cached result
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CACHED_ANALYSIS',
      data: { url: tab.url }
    });

    if (response?.ok && response.data) {
      console.log('Found cached analysis');
      showResult(response.data);
      setStatus('Cached analysis (click Analyze to refresh)');
    } else {
      setStatus('Ready to analyze');
    }

  } catch (error) {
    console.error('Initialization failed:', error);
    setStatus('Ready to analyze');
  }
})();

// ============================================================================
// DEBUG LOGS
// ============================================================================

async function refreshLogs() {
  const logs = await getLogs();
  const container = document.getElementById('logs-container');
  const countEl = document.getElementById('log-count');

  countEl.textContent = `(${logs.length})`;

  if (logs.length === 0) {
    container.innerHTML = '<p class="logs-empty">No logs yet. Perform an analysis to see logs here.</p>';
    return;
  }

  // Render logs (newest first)
  container.innerHTML = logs
    .slice().reverse()
    .map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = log.data ? JSON.stringify(log.data, null, 2) : null;

      return `
        <div class="log-entry ${log.level}">
          <div class="log-header">
            <div>
              <span class="log-level ${log.level}">${log.level}</span>
              <span class="log-component">[${log.component}]</span>
            </div>
            <span class="log-time">${time}</span>
          </div>
          <div class="log-message">${escapeHtml(log.message)}</div>
          ${dataStr ? `<div class="log-data">${escapeHtml(dataStr)}</div>` : ''}
        </div>
      `;
    })
    .join('');

  // Scroll to top of logs
  container.scrollTop = 0;
}

// Debug Logs Buttons
document.getElementById('btn-refresh-logs').addEventListener('click', refreshLogs);

document.getElementById('btn-download-logs').addEventListener('click', async () => {
  await downloadLogs('txt');
  logger.info('Logs downloaded');
});

document.getElementById('btn-clear-logs').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all logs?')) {
    await clearLogs();
    await refreshLogs();
    logger.info('Logs cleared');
  }
});

// Auto-refresh logs every 3 seconds when panel is open
setInterval(refreshLogs, 3000);

// Initial load
refreshLogs();

// ============================================================================
// SETTINGS UI
// ============================================================================

async function loadSettings() {
  try {
    const settings = await getSettings();
    logger.info('Settings loaded', settings);

    // Update UI with current settings
    const modeRadios = document.querySelectorAll('input[name="auto-mode"]');
    modeRadios.forEach(radio => {
      radio.checked = (radio.value === settings.autoAnalysis);
    });

    const delaySlider = document.getElementById('delay-slider');
    delaySlider.value = settings.analysisDelay;
    updateDelayDisplay(settings.analysisDelay);

  } catch (error) {
    logger.error('Failed to load settings', { error: error.message });
  }
}

function updateDelayDisplay(ms) {
  const delayValue = document.getElementById('delay-value');
  if (ms === 0) {
    delayValue.textContent = 'Instant';
  } else {
    delayValue.textContent = `${ms / 1000}s`;
  }
}

// Settings event listeners
document.getElementById('delay-slider').addEventListener('input', (e) => {
  updateDelayDisplay(parseInt(e.target.value));
});

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  try {
    const modeRadio = document.querySelector('input[name="auto-mode"]:checked');
    const delaySlider = document.getElementById('delay-slider');
    const statusEl = document.getElementById('settings-status');

    const newSettings = {
      autoAnalysis: modeRadio.value,
      analysisDelay: parseInt(delaySlider.value)
    };

    await updateSettings(newSettings);

    logger.info('Settings saved', newSettings);

    // Show success message
    statusEl.textContent = '✓ Settings saved successfully!';
    statusEl.style.color = '#0f9d58';

    // Clear message after 3 seconds
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);

  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });

    const statusEl = document.getElementById('settings-status');
    statusEl.textContent = '✗ Failed to save settings';
    statusEl.style.color = '#db4437';
  }
});

// Load settings on panel open
loadSettings();

// ============================================================================
// PROMPT EDITOR UI
// ============================================================================

async function loadPromptEditor() {
  try {
    const prompts = await getPrompts();
    logger.info('Prompts loaded for editor');

    document.getElementById('system-prompt').value = prompts.systemPrompt;
    document.getElementById('user-prompt-template').value = prompts.userPromptTemplate;

  } catch (error) {
    logger.error('Failed to load prompts', { error: error.message });
  }
}

// Prompt editor event listeners
document.getElementById('btn-save-prompts').addEventListener('click', async () => {
  try {
    const systemPrompt = document.getElementById('system-prompt').value.trim();
    const userPromptTemplate = document.getElementById('user-prompt-template').value.trim();
    const statusEl = document.getElementById('prompts-status');

    if (!systemPrompt || !userPromptTemplate) {
      statusEl.textContent = '✗ Both prompts are required';
      statusEl.style.color = '#db4437';
      return;
    }

    await savePrompts(systemPrompt, userPromptTemplate);
    logger.info('Custom prompts saved');

    // Show success message
    statusEl.textContent = '✓ Custom prompts saved! Restart analysis to apply changes.';
    statusEl.style.color = '#0f9d58';

    // Clear message after 5 seconds
    setTimeout(() => {
      statusEl.textContent = '';
    }, 5000);

    // Note: AI session needs to be reinitialized to use new prompts
    // For now, we just save them - they'll be used on next analysis

  } catch (error) {
    logger.error('Failed to save prompts', { error: error.message });

    const statusEl = document.getElementById('prompts-status');
    statusEl.textContent = '✗ Failed to save prompts: ' + error.message;
    statusEl.style.color = '#db4437';
  }
});

document.getElementById('btn-reset-prompts').addEventListener('click', async () => {
  try {
    const statusEl = document.getElementById('prompts-status');

    if (!confirm('Reset prompts to defaults? This will discard your custom prompts.')) {
      return;
    }

    await resetPrompts();
    logger.info('Prompts reset to defaults');

    // Reload default prompts in UI
    document.getElementById('system-prompt').value = DEFAULT_SYSTEM_PROMPT;
    document.getElementById('user-prompt-template').value = DEFAULT_USER_PROMPT_TEMPLATE;

    // Show success message
    statusEl.textContent = '✓ Prompts reset to defaults';
    statusEl.style.color = '#0f9d58';

    // Clear message after 3 seconds
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);

  } catch (error) {
    logger.error('Failed to reset prompts', { error: error.message });

    const statusEl = document.getElementById('prompts-status');
    statusEl.textContent = '✗ Failed to reset prompts';
    statusEl.style.color = '#db4437';
  }
});

// Load prompt editor on panel open
loadPromptEditor();

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', async () => {
  console.log('Cleaning up AI sessions...');

  if (aiSession?.destroy) {
    await aiSession.destroy();
  }
  if (summarizer?.destroy) {
    await summarizer.destroy();
  }
  if (languageDetector?.destroy) {
    await languageDetector.destroy();
  }
});
