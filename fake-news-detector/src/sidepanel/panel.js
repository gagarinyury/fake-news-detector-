/**
 * Side Panel - Full AI Analysis
 * Uses Chrome Built-in AI APIs directly
 */

import { classifyError, logError, createProgressMonitor } from '../shared/errorHandler.js';
import { createLogger, getLogs, clearLogs, downloadLogs } from '../shared/logger.js';

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

  if (apiType === 'new') {
    // New API
    aiSession = await self.ai.languageModel.create({
      systemPrompt: `You are an expert fact-checker and journalist analyzing news articles for credibility.

Your role is to:
1. Assign a credibility score (0-100)
2. Provide a brief verdict
3. Identify red flags
4. Extract key factual claims with snippets for highlighting

CRITICAL: For highlighting to work, each claim MUST have a "snippet" field containing a SHORT 2-4 word phrase that appears EXACTLY in the article text.

Output format: Valid JSON only (no markdown, no explanations).`,
      outputLanguage: 'en',
      monitor
    });

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
    // Legacy API
    aiSession = await self.LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: `You are an expert fact-checker. Respond with valid JSON only.`
      }],
      monitor
    });

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

async function analyzeText(text, url, title) {
  logger.info('Starting AI analysis', {
    textLength: text.length,
    url,
    title
  });

  const result = {
    score: 0,
    verdict: '',
    red_flags: [],
    claims: [],
    summary: '',
    lang: 'unknown'
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

  // Define JSON Schema for structured output
  const responseSchema = {
    type: "object",
    properties: {
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Credibility score 0-100"
      },
      verdict: {
        type: "string",
        description: "Brief assessment in 1-2 sentences"
      },
      red_flags: {
        type: "array",
        items: { type: "string" },
        description: "Array of suspicious patterns"
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim: { type: "string", description: "Full factual statement (max 20 words)" },
            snippet: { type: "string", description: "2-4 word phrase from article for highlighting" },
            evidence: { type: "string", description: "Source name or empty string" },
            accuracy: {
              type: "string",
              enum: ["Accurate", "Questionable", "Unverified"],
              description: "Assessment of claim accuracy"
            }
          },
          required: ["claim", "snippet", "evidence", "accuracy"]
        },
        minItems: 5,
        maxItems: 10
      }
    },
    required: ["score", "verdict", "red_flags", "claims"]
  };

  const prompt = `Analyze this article for credibility and extract key claims.

Title: ${title}
URL: ${url}

Text (first 2000 chars):
${text.slice(0, 2000)}

IMPORTANT: For each claim, "snippet" must be a SHORT 2-4 word phrase that appears EXACTLY in the article text above. This will be used to highlight the claim on the page.

Example good snippets: "Category 5", "175 mph winds", "seven deaths"
Example bad snippets: long sentences, paraphrases, text not in article

Provide a credibility score (0-100), verdict, red flags, and 5-10 key claims.`;

  logger.debug('Sending prompt to AI', {
    promptPreview: prompt.slice(0, 300)
  });

  try {
    // Use structured output with JSON Schema
    const rawResponse = await aiSession.prompt(prompt, {
      responseConstraint: responseSchema
    });

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
  console.log('=== ANALYSIS COMPLETE ===');
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
