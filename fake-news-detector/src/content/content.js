// Content Script - DOM interaction
console.log('Fake News Detector: Content script loaded');

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

  console.log('Highlights cleared');
}

function highlightClaims({ claims, riskMap }) {
  console.log('=== HIGHLIGHT CLAIMS CALLED ===');
  console.log('Claims received:', claims);
  console.log('Claims count:', claims?.length || 0);
  console.log('Risk map:', riskMap);

  clearHighlights(); // Clear previous highlights

  if (!claims || claims.length === 0) {
    console.log('✗ No claims to highlight');
    return 0;
  }

  let highlightedCount = 0;

  // Create container for tooltips
  const container = document.createElement('div');
  container.id = HIGHLIGHT_CONTAINER_ID;
  document.body.appendChild(container);

  claims.forEach((claim, index) => {
    console.log(`\n--- Processing Claim ${index + 1} ---`);
    console.log('Raw claim:', claim);
    console.log('Claim type:', typeof claim);

    // Handle multiple formats: string, {text: ""}, or {claim: "", snippet: ""}
    let claimText;
    let fullClaim;
    let claimEvidence = '';
    let claimAccuracy = 'medium';

    if (typeof claim === 'string') {
      claimText = claim.trim();
      fullClaim = claim.trim();
      console.log('→ Format: string');
      console.log('→ Using full string as search text:', claimText.slice(0, 50));
    } else if (claim.snippet) {
      // New format: {claim: "", snippet: "", evidence: "", accuracy: ""}
      claimText = claim.snippet.trim();
      fullClaim = claim.claim || claim.snippet;
      claimEvidence = claim.evidence || '';
      claimAccuracy = claim.accuracy || 'Unverified';
      console.log('→ Format: object with snippet');
      console.log('→ Snippet (search):', claimText);
      console.log('→ Full claim:', fullClaim);
      console.log('→ Evidence:', claimEvidence);
      console.log('→ Accuracy:', claimAccuracy);
    } else if (claim.text) {
      // Legacy format: {text: ""}
      claimText = claim.text.trim();
      fullClaim = claim.text.trim();
      console.log('→ Format: legacy object with text');
      console.log('→ Using text field:', claimText.slice(0, 50));
    } else {
      console.log('✗ Invalid format, skipping');
      return; // Invalid format
    }

    if (!claimText || claimText.length < 3) {
      console.log('✗ Claim text too short, skipping');
      return;
    }

    console.log('🔍 Searching for:', claimText);

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
        console.log(`✓ Found at node ${nodesChecked}, index ${startIndex}`);
        console.log('  Context:', text.slice(Math.max(0, startIndex - 20), startIndex + claimText.length + 20));

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

        console.log('  Risk level:', risk);

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
      console.log(`✗ Claim NOT found after checking ${nodesChecked} nodes`);
      console.log('  Search text was:', claimText);
      console.log('  First 100 chars of page:', document.body.innerText.slice(0, 100));
    }
  });

  console.log(`\n=== HIGHLIGHTING COMPLETE ===`);
  console.log(`✓ Highlighted ${highlightedCount} out of ${claims.length} claims`);
  return highlightedCount;
}

// ============================================================================
// TOOLTIP
// ============================================================================

let currentTooltip = null;

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

  // Build tooltip content
  let content = `<strong>Claim #${parseInt(claimIndex) + 1}</strong><br>`;
  content += `${fullClaim}<br>`;

  if (evidence) {
    content += `<small><strong>Source:</strong> ${evidence}</small><br>`;
  }

  // Accuracy badge with color
  const accuracyColor = accuracy === 'Accurate' ? '#0f9d58' :
                        accuracy === 'Questionable' ? '#f4b400' : '#5f6368';
  content += `<small><strong>Assessment:</strong> <span style="color: ${accuracyColor}">${accuracy}</span></small>`;

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
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Content script received message:', msg.type);

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

console.log('Content script ready');
