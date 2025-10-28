/**
 * Settings Management Module
 * Stores user preferences for auto-analysis behavior
 */

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_SETTINGS = {
  autoAnalysis: 'smart',      // 'off' | 'smart' | 'always'
  analysisDelay: 3000,        // ms - delay before triggering analysis
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  showBadgeTooltip: true,     // Show detailed tooltip on badge hover
  highlightAutoUpdate: true   // Auto-update highlights when analysis completes
};

export const AUTO_ANALYSIS_MODES = {
  OFF: 'off',           // Manual only - no auto-analysis
  SMART: 'smart',       // Smart - only news-like domains
  ALWAYS: 'always'      // Always - all HTTP(S) pages
};

// ============================================================================
// SETTINGS API
// ============================================================================

/**
 * Get all settings with defaults
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    return {
      ...DEFAULT_SETTINGS,
      ...result.settings
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update settings
 */
export async function updateSettings(updates) {
  try {
    const current = await getSettings();
    const newSettings = {
      ...current,
      ...updates
    };

    await chrome.storage.sync.set({ settings: newSettings });
    console.log('Settings updated:', newSettings);

    // Notify listeners
    notifySettingsChanged(newSettings);

    return newSettings;
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings() {
  try {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    console.log('Settings reset to defaults');
    notifySettingsChanged(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to reset settings:', error);
    throw error;
  }
}

// ============================================================================
// SETTINGS CHANGE NOTIFICATIONS
// ============================================================================

const settingsListeners = new Set();

/**
 * Listen for settings changes
 */
export function onSettingsChanged(callback) {
  settingsListeners.add(callback);

  // Return unsubscribe function
  return () => {
    settingsListeners.delete(callback);
  };
}

/**
 * Notify all listeners of settings change
 */
function notifySettingsChanged(newSettings) {
  settingsListeners.forEach(listener => {
    try {
      listener(newSettings);
    } catch (error) {
      console.error('Settings listener error:', error);
    }
  });
}

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

/**
 * Check if domain looks like a news site
 */
export function isNewsLikeDomain(domain) {
  // Keywords commonly found in news domains
  const newsKeywords = [
    'news', 'times', 'post', 'daily', 'herald', 'gazette',
    'tribune', 'journal', 'chronicle', 'observer',
    'bbc', 'cnn', 'reuters', 'bloomberg', 'forbes',
    'guardian', 'telegraph', 'independent', 'standard',
    'huffpost', 'buzzfeed', 'vox', 'slate', 'medium'
  ];

  const lowerDomain = domain.toLowerCase();
  return newsKeywords.some(keyword => lowerDomain.includes(keyword));
}

/**
 * Get heuristic suspicion score for a page
 * Returns 0-100 (higher = more suspicious)
 */
export function getSuspicionScore(url, domain, title) {
  let score = 0;

  // Check 1: HTTPS missing
  if (url && !url.startsWith('https://')) {
    score += 20;
  }

  // Check 2: Suspicious TLD
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.xyz'];
  if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
    score += 30;
  }

  // Check 3: Clickbait patterns in title
  if (title) {
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /doctors hate/i,
      /\d+ (weird|strange) (tricks|tips)/i,
      /this one (trick|tip)/i,
      /they don't want you to know/i,
      /what happened next/i,
      /the truth about/i
    ];

    if (clickbaitPatterns.some(pattern => pattern.test(title))) {
      score += 40;
    }
  }

  // Check 4: Very short domain (possible fake)
  if (domain.length < 8) {
    score += 15;
  }

  // Check 5: Many numbers in domain (suspicious pattern)
  const numberCount = (domain.match(/\d/g) || []).length;
  if (numberCount > 3) {
    score += 20;
  }

  return Math.min(score, 100);
}
