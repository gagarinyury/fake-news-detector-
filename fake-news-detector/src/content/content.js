// Content Script - DOM interaction
// Using global FND namespace from logger-content.js
const logger = window.FND.createLogger("Content");

logger.debug('Content script loaded');

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

function extractPageText() {
  // Strategy: <article> → <main> → body
  let textContent = '';

  // Try <article> first
  const articles = document.querySelectorAll('article');
  if (articles.length > 0) {
    textContent = Array.from(articles)
      .map(article => article.innerText)
      .join('\n\n');
  }

  // Fallback to <main>
  if (!textContent || textContent.length < 200) {
    const main = document.querySelector('main');
    if (main) {
      textContent = main.innerText;
    }
  }

  // Fallback to body
  if (!textContent || textContent.length < 200) {
    textContent = document.body.innerText;
  }

  // Clean up
  textContent = textContent
    .replace(/\s+/g, ' ')
    .trim();

  return textContent;
}

// ============================================================================
// CLAIMS HIGHLIGHTING
// ============================================================================

const HIGHLIGHT_CLASS = 'fnd-claim';
const HIGHLIGHT_CONTAINER_ID = 'fnd-highlights-container';

function clearHighlights() {
  // Remove all highlights
  const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlights.forEach(mark => {
    const parent = mark.parentNode;
    const text = document.createTextNode(mark.textContent);
    parent.replaceChild(text, mark);
    parent.normalize(); // Merge adjacent text nodes
  });

  // Remove tooltip container
  const container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
  if (container) {
    container.remove();
  }

  logger.debug('Highlights cleared');
}

function highlightClaims({ claims, riskMap }) {
  logger.debug('Highlighting claims');
  // Claims logged via logger;
  // Count logged in context;
  // Risk map logged;

  clearHighlights(); // Clear previous highlights

  if (!claims || claims.length === 0) {
    logger.debug('No claims to highlight');
    return 0;
  }

  let highlightedCount = 0;

  // Create container for tooltips
  const container = document.createElement('div');
  container.id = HIGHLIGHT_CONTAINER_ID;
  document.body.appendChild(container);

  claims.forEach((claim, index) => {

    // Handle multiple formats: string, {text: ""}, or {claim: "", snippet: ""}
    let claimText;
    let fullClaim;
    let claimEvidence = '';
    let claimAccuracy = 'medium';

    if (typeof claim === 'string') {
      claimText = claim.trim();
      fullClaim = claim.trim();
    } else if (claim.snippet) {
      // New format: {claim: "", snippet: "", evidence: "", accuracy: ""}
      claimText = claim.snippet.trim();
      fullClaim = claim.claim || claim.snippet;
      claimEvidence = claim.evidence || '';
      claimAccuracy = claim.accuracy || 'Unverified';
    } else if (claim.text) {
      // Legacy format: {text: ""}
      claimText = claim.text.trim();
      fullClaim = claim.text.trim();
    } else {
      return; // Invalid format
    }

    if (!claimText || claimText.length < 3) {
      return;
    }


    // Search for claim text in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip already highlighted nodes and script/style tags
          if (node.parentElement.classList?.contains(HIGHLIGHT_CLASS)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    let found = false;
    let nodesChecked = 0;

    while (node = walker.nextNode()) {
      nodesChecked++;
      const text = node.textContent;

      // Simple substring match (case-insensitive)
      const lowerText = text.toLowerCase();
      const lowerClaim = claimText.toLowerCase();
      const startIndex = lowerText.indexOf(lowerClaim);

      if (startIndex !== -1) {
        // Found the claim text, highlight it

        const range = document.createRange();
        range.setStart(node, startIndex);
        range.setEnd(node, startIndex + claimText.length);

        const mark = document.createElement('mark');
        mark.className = HIGHLIGHT_CLASS;

        // Determine risk level (from riskMap or accuracy)
        const risk = riskMap?.[claimText] || 'medium';
        mark.classList.add(`fnd-risk-${risk}`);
        mark.dataset.claimIndex = index;
        mark.dataset.risk = risk;
        mark.dataset.fullClaim = fullClaim;
        mark.dataset.evidence = claimEvidence;
        mark.dataset.accuracy = claimAccuracy;


        // Add hover tooltip
        mark.addEventListener('mouseenter', showTooltip);
        mark.addEventListener('mouseleave', hideTooltip);

        range.surroundContents(mark);

        highlightedCount++;
        found = true;
        break; // Only highlight first occurrence
      }
    }

    if (!found) {
    }
  });

  return highlightedCount;
}

// ============================================================================
// TOOLTIP
// ============================================================================

let currentTooltip = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showTooltip(event) {
  const mark = event.target;
  const fullClaim = mark.dataset.fullClaim || 'No details available';
  const evidence = mark.dataset.evidence || '';
  const accuracy = mark.dataset.accuracy || 'medium';
  const claimIndex = mark.dataset.claimIndex;

  // Remove existing tooltip
  hideTooltip();

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'fnd-tooltip';

  // Build tooltip content (with XSS protection)
  let content = `<strong>Claim #${parseInt(claimIndex) + 1}</strong><br>`;
  content += `${escapeHtml(fullClaim)}<br>`;

  if (evidence) {
    content += `<small><strong>Source:</strong> ${escapeHtml(evidence)}</small><br>`;
  }

  // Accuracy badge with color
  const accuracyColor = accuracy === 'Accurate' ? '#0f9d58' :
                        accuracy === 'Questionable' ? '#f4b400' : '#5f6368';
  content += `<small><strong>Assessment:</strong> <span style="color: ${accuracyColor}">${escapeHtml(accuracy)}</span></small>`;

  tooltip.innerHTML = content;

  // Position tooltip
  const rect = mark.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = `${rect.top - 100}px`;
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.maxWidth = '300px';

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// ============================================================================
// TRANSLATION OVERLAY
// ============================================================================

const OVERLAY_ID = 'fnd-translation-overlay';

function showTranslationOverlay(text) {
  // Remove existing overlay
  const existingOverlay = document.getElementById(OVERLAY_ID);
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'fnd-translation-overlay';

  // Create content
  const content = document.createElement('div');
  content.className = 'fnd-translation-content';
  content.textContent = text;

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.className = 'fnd-translation-close';
  closeButton.textContent = '×';
  closeButton.onclick = () => overlay.remove();

  // Assemble
  overlay.appendChild(content);
  overlay.appendChild(closeButton);
  document.body.appendChild(overlay);
}


// ============================================================================
// QUICK REPLY ASSISTANT
// ============================================================================

function injectQuickReplyButton(targetNode) {
  const replyButton = document.createElement('button');
  replyButton.textContent = 'Quick Reply';
  replyButton.className = 'fnd-quick-reply-button';

  replyButton.onclick = async () => {
    const emailBody = getEmailBody();

    chrome.runtime.sendMessage({
      type: 'QUICK_REPLY_REQUEST',
      data: {
        text: emailBody
      }
    }, (response) => {
      if (response.ok) {
        displayQuickReplies(response.replies, targetNode);
      }
    });
  };

  targetNode.appendChild(replyButton);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) { // ELEMENT_NODE
        // Gmail compose window
        if (window.location.hostname === 'mail.google.com') {
            const composeWindow = node.querySelector('.gA.gt');
            if (composeWindow && !composeWindow.querySelector('.fnd-quick-reply-button')) {
              injectQuickReplyButton(composeWindow);
            }
        }
        // Outlook compose window
        if (window.location.hostname === 'outlook.live.com') {
            const composeWindow = node.querySelector('[aria-label="Message body"]');
            if (composeWindow && !composeWindow.querySelector('.fnd-quick-reply-button')) {
                injectQuickReplyButton(composeWindow.parentElement);
            }
        }
      }
    }
  }
});

function getEmailBody() {
    if (window.location.hostname === 'mail.google.com') {
        const emailContainer = document.querySelector('.adn.ads');
        return emailContainer ? emailContainer.innerText : '';
    }
    if (window.location.hostname === 'outlook.live.com') {
        const emailContainer = document.querySelector('[aria-label="Message body"]');
        return emailContainer ? emailContainer.innerText : '';
    }
    return '';
}

function startQuickReplyObserver() {
  if (window.location.hostname === 'mail.google.com' || window.location.hostname === 'outlook.live.com') {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// ============================================================================
// CONTENT PROOFREADER
// ============================================================================

function injectProofreaderIcon(textarea) {
  const icon = document.createElement('button');
  icon.textContent = 'PR'; // Placeholder for an icon
  icon.className = 'fnd-proofreader-icon';

  icon.onclick = () => {
    showProofreaderUI(textarea);
  };

  textarea.parentNode.insertBefore(icon, textarea.nextSibling);
}

const proofreaderObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) { // ELEMENT_NODE
        if (node.tagName === 'TEXTAREA') {
          injectProofreaderIcon(node);
        }
        const textareas = node.querySelectorAll('textarea');
        textareas.forEach(injectProofreaderIcon);
      }
    }
  }
});

function startProofreaderObserver() {
  proofreaderObserver.observe(document.body, { childList: true, subtree: true });
  // Also check for existing textareas
  document.querySelectorAll('textarea').forEach(injectProofreaderIcon);
}

function showProofreaderUI(textarea) {
    const existingUI = document.querySelector('.fnd-proofreader-ui');
    if (existingUI) {
        existingUI.remove();
    }

    const ui = document.createElement('div');
    ui.className = 'fnd-proofreader-ui';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a prompt to generate text...';

    const proofreadButton = document.createElement('button');
    proofreadButton.textContent = 'Proofread';
    proofreadButton.onclick = () => {
        chrome.runtime.sendMessage({
            type: 'PROOFREAD_TEXT_REQUEST',
            data: { text: textarea.value, action: 'proofread' }
        }, (response) => {
            if (response.ok) {
                textarea.value = response.newText;
            }
            ui.remove();
        });
    };

    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate';
    generateButton.onclick = () => {
        chrome.runtime.sendMessage({
            type: 'PROOFREAD_TEXT_REQUEST',
            data: { text: textarea.value, action: input.value }
        }, (response) => {
            if (response.ok) {
                textarea.value = response.newText;
            }
            ui.remove();
        });
    };

    ui.appendChild(input);
    ui.appendChild(proofreadButton);
    ui.appendChild(generateButton);
    textarea.parentNode.insertBefore(ui, textarea.nextSibling);
}

startProofreaderObserver();

function displayQuickReplies(replies, targetNode) {
  const container = document.createElement('div');
  container.className = 'fnd-quick-replies-container';

  replies.forEach(reply => {
    const button = document.createElement('button');
    button.textContent = reply.reply;
    button.className = 'fnd-quick-reply-suggestion';
    button.onclick = () => {
      let editableDiv;
      if (window.location.hostname === 'mail.google.com') {
        editableDiv = document.querySelector('.Am.Al.editable'); // Gmail specific
      } else if (window.location.hostname === 'outlook.live.com') {
        editableDiv = document.querySelector('[aria-label="Message body"]'); // Outlook specific
      }

      if(editableDiv) {
        editableDiv.innerText = reply.reply;
      }
      container.remove();
    };
    container.appendChild(button);
  });

  targetNode.appendChild(container);
}

startQuickReplyObserver();


// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  logger.debug('Message received', { type: msg.type });

  if (msg.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_PAGE_TEXT') {
    try {
      const text = extractPageText();
      sendResponse({
        ok: true,
        text,
        url: window.location.href,
        title: document.title
      });
    } catch (error) {
      console.error('Text extraction failed:', error);
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }

  if (msg.type === 'DISPLAY_TRANSLATION_RESULT') {
    try {
      showTranslationOverlay(msg.data.translation);
      sendResponse({ ok: true });
    } catch (error) {
      console.error('Show translation overlay failed:', error);
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }

  if (msg.type === 'HIGHLIGHT_CLAIMS') {
    try {
      const count = highlightClaims(msg.data);
      sendResponse({ ok: true, count });
    } catch (error) {
      console.error('Highlighting failed:', error);
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }

  if (msg.type === 'CLEAR_HIGHLIGHTS') {
    try {
      clearHighlights();
      sendResponse({ ok: true });
    } catch (error) {
      console.error('Clear highlights failed:', error);
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }
});

logger.debug('Content script ready');

// ============================================================================
// AI ASSISTANT FLOATING PANEL
// ============================================================================

let assistantPanelIframe = null;

function createAssistantPanel() {
  if (assistantPanelIframe) {
    return; // Already exists
  }

  logger.debug('Creating AI Assistant panel');

  // Create iframe container
  const container = document.createElement('div');
  container.id = 'fnd-assistant-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    z-index: 2147483647;
    box-shadow: -4px 0 24px rgba(0,0,0,0.15);
    border-radius: 16px 0 0 16px;
    overflow: hidden;
    background: white;
    animation: slideIn 0.3s ease-out;
  `;

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'fnd-assistant-iframe';
  iframe.src = chrome.runtime.getURL('src/assistant-panel/panel.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  container.appendChild(iframe);
  document.body.appendChild(container);
  assistantPanelIframe = iframe;

  logger.info('AI Assistant panel created');
}

function removeAssistantPanel() {
  const container = document.getElementById('fnd-assistant-container');
  if (container) {
    container.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      container.remove();
      assistantPanelIframe = null;
      logger.info('AI Assistant panel removed');
    }, 300);
  }
}

function toggleAssistantPanel() {
  if (assistantPanelIframe) {
    removeAssistantPanel();
  } else {
    createAssistantPanel();
  }
}

// ============================================================================
// SELECTION HELPER
// ============================================================================

function getSelectedText() {
  return window.getSelection().toString().trim();
}

// ============================================================================
// MESSAGE HANDLERS - ADD ASSISTANT PANEL SUPPORT
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  logger.debug('Message received', { type: msg.type });

  // Existing handlers...
  if (msg.type === 'GET_PAGE_TEXT') {
    const text = extractPageText();
    const title = document.title;
    const url = window.location.href;

    logger.debug('Extracted page text', {
      textLength: text.length,
      title,
      url
    });

    sendResponse({ ok: true, text, title, url });
    return true;
  }

  if (msg.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }

  // NEW: Assistant panel controls
  if (msg.type === 'OPEN_ASSISTANT_PANEL') {
    createAssistantPanel();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'CLOSE_ASSISTANT_PANEL') {
    removeAssistantPanel();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'TOGGLE_ASSISTANT_PANEL') {
    toggleAssistantPanel();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_SELECTION') {
    const selection = getSelectedText();
    sendResponse({ ok: true, text: selection });
    return true;
  }

  // Existing handlers continue below...
  if (msg.type === 'HIGHLIGHT_CLAIMS') {
    // ... existing code
  }

  // ... rest of existing handlers
});

logger.debug('AI Assistant panel support loaded');

// Listen for messages from iframe
window.addEventListener('message', (event) => {
  // Security check
  if (event.source !== assistantPanelIframe?.contentWindow) {
    return;
  }

  if (event.data.type === 'CLOSE_ASSISTANT_PANEL') {
    removeAssistantPanel();
  }
});
