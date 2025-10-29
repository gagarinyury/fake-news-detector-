/**
 * AI Assistant Panel - Context-Aware UI
 * Shows different tools based on current page
 */

// ============================================================================
// CONTEXT DETECTION
// ============================================================================

function detectContext() {
  const url = window.location.href;
  const hostname = window.location.hostname;

  if (hostname.includes('mail.google.com')) {
    return { type: 'gmail', icon: '📧', text: 'Gmail' };
  }
  if (hostname.includes('outlook.live.com') || hostname.includes('outlook.office.com')) {
    return { type: 'outlook', icon: '📧', text: 'Outlook' };
  }
  if (isNewsLikeDomain(hostname)) {
    return { type: 'news', icon: '📰', text: 'News Site' };
  }
  return { type: 'web', icon: '🌐', text: 'Web Page' };
}

function isNewsLikeDomain(hostname) {
  const newsKeywords = ['news', 'bbc', 'cnn', 'nytimes', 'theguardian', 'reuters', 'article', 'post', 'times'];
  return newsKeywords.some(keyword => hostname.includes(keyword));
}

// ============================================================================
// UI STATE
// ============================================================================

let currentContext = null;
let aiInitialized = false;

function updateContextUI() {
  currentContext = detectContext();

  const badge = document.getElementById('context-badge');
  badge.querySelector('.context-icon').textContent = currentContext.icon;
  badge.querySelector('.context-text').textContent = currentContext.text;

  // Show/hide tools based on context
  document.getElementById('tool-news-analysis').style.display =
    currentContext.type === 'news' ? 'block' : 'none';

  document.getElementById('tool-email').style.display =
    ['gmail', 'outlook'].includes(currentContext.type) ? 'block' : 'none';
}

// ============================================================================
// LOADING STATE
// ============================================================================

function showLoading(message = 'Processing...') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-text').textContent = message;
  overlay.style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ============================================================================
// RESULT DISPLAY
// ============================================================================

function showResult(elementId, text, type = 'success') {
  const resultBox = document.getElementById(elementId);
  resultBox.textContent = text;
  resultBox.className = `result-box ${type}`;
  resultBox.style.display = 'block';
}

function hideResult(elementId) {
  document.getElementById(elementId).style.display = 'none';
}

// ============================================================================
// GET SELECTED TEXT
// ============================================================================

function getSelectedText() {
  // Get selection from parent page
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SELECTION' }, (response) => {
      resolve(response?.text || '');
    });
  });
}

// ============================================================================
// NEWS ANALYSIS
// ============================================================================

document.getElementById('btn-analyze-news')?.addEventListener('click', async () => {
  showLoading('Analyzing article...');
  hideResult('news-result');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_NEWS_REQUEST'
    });

    if (response?.ok) {
      const { score, verdict } = response.data;
      showResult('news-result',
        `Credibility Score: ${score}/100\n\n${verdict}`,
        score >= 75 ? 'success' : 'error'
      );

      // Show social post tool if high score
      if (score >= 75) {
        document.getElementById('tool-social').style.display = 'block';
      }
    } else {
      throw new Error(response?.error || 'Analysis failed');
    }
  } catch (error) {
    showResult('news-result', `Error: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
});

// ============================================================================
// SUMMARIZE
// ============================================================================

document.getElementById('btn-summarize').addEventListener('click', async () => {
  showLoading('Generating summary...');
  hideResult('summarize-result');

  try {
    const selectedText = await getSelectedText();

    if (!selectedText) {
      throw new Error('Please select text on the page first');
    }

    const response = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_REQUEST',
      data: { text: selectedText }
    });

    if (response?.ok) {
      showResult('summarize-result', response.summary, 'success');
    } else {
      throw new Error(response?.error || 'Summarization failed');
    }
  } catch (error) {
    showResult('summarize-result', error.message, 'error');
  } finally {
    hideLoading();
  }
});

// ============================================================================
// TRANSLATE
// ============================================================================

async function translateText(targetLang) {
  showLoading(`Translating to ${targetLang === 'ru' ? 'Russian' : 'English'}...`);
  hideResult('translate-result');

  try {
    const selectedText = await getSelectedText();

    if (!selectedText) {
      throw new Error('Please select text on the page first');
    }

    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE_REQUEST',
      data: { text: selectedText, targetLang }
    });

    if (response?.ok) {
      showResult('translate-result', response.translation, 'success');
    } else {
      throw new Error(response?.error || 'Translation failed');
    }
  } catch (error) {
    showResult('translate-result', error.message, 'error');
  } finally {
    hideLoading();
  }
}

document.getElementById('btn-translate-ru').addEventListener('click', () => translateText('ru'));
document.getElementById('btn-translate-en').addEventListener('click', () => translateText('en'));

// ============================================================================
// EMAIL QUICK REPLY
// ============================================================================

document.getElementById('btn-quick-reply')?.addEventListener('click', async () => {
  showLoading('Generating replies...');
  hideResult('email-result');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'QUICK_REPLY_GENERATE'
    });

    if (response?.ok && response.replies) {
      const repliesText = response.replies
        .map((reply, i) => `Option ${i + 1}:\n${reply.reply}`)
        .join('\n\n---\n\n');
      showResult('email-result', repliesText, 'success');
    } else {
      throw new Error(response?.error || 'Failed to generate replies');
    }
  } catch (error) {
    showResult('email-result', error.message, 'error');
  } finally {
    hideLoading();
  }
});

// ============================================================================
// PROOFREADER
// ============================================================================

document.getElementById('btn-proofread').addEventListener('click', async () => {
  const input = document.getElementById('proofread-input');
  const text = input.value.trim();

  if (!text) {
    showResult('proofread-result', 'Please enter text to check', 'error');
    return;
  }

  showLoading('Checking text...');
  hideResult('proofread-result');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PROOFREAD_REQUEST',
      data: { text, action: 'proofread' }
    });

    if (response?.ok) {
      showResult('proofread-result', response.newText, 'success');
      input.value = response.newText;
    } else {
      throw new Error(response?.error || 'Proofreading failed');
    }
  } catch (error) {
    showResult('proofread-result', error.message, 'error');
  } finally {
    hideLoading();
  }
});

// ============================================================================
// SOCIAL POST GENERATOR
// ============================================================================

async function generateSocialPost(platform) {
  showLoading(`Generating ${platform} post...`);
  hideResult('social-result');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SOCIAL_POST_GENERATE',
      data: { platform }
    });

    if (response?.ok) {
      showResult('social-result', response.post, 'success');
    } else {
      throw new Error(response?.error || 'Generation failed');
    }
  } catch (error) {
    showResult('social-result', error.message, 'error');
  } finally {
    hideLoading();
  }
}

document.getElementById('btn-gen-twitter')?.addEventListener('click', () => generateSocialPost('twitter'));
document.getElementById('btn-gen-instagram')?.addEventListener('click', () => generateSocialPost('instagram'));
document.getElementById('btn-gen-reddit')?.addEventListener('click', () => generateSocialPost('reddit'));

// ============================================================================
// CLOSE PANEL
// ============================================================================

document.getElementById('btn-close').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLOSE_ASSISTANT_PANEL' });
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async () => {
  console.log('AI Assistant Panel initialized');

  // Detect and update context
  updateContextUI();

  // Initialize AI in background
  chrome.runtime.sendMessage({ type: 'INIT_AI' });
})();
