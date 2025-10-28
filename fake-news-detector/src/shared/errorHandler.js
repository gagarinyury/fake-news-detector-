/**
 * Centralized Error Handling Module
 * Implements 17_ERROR_HANDLING_SPEC
 */

// ============================================================================
// ERROR TYPES & USER MESSAGES
// ============================================================================

export const ERROR_TYPES = {
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_DOWNLOADING: 'AI_DOWNLOADING',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PLATFORM_UNSUPPORTED: 'PLATFORM_UNSUPPORTED',
  JSON_PARSE_FAILED: 'JSON_PARSE_FAILED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
};

const USER_MESSAGES = {
  [ERROR_TYPES.AI_UNAVAILABLE]: 'AI features are not available on this device. Check chrome://on-device-internals/',
  [ERROR_TYPES.AI_DOWNLOADING]: 'Downloading AI model... (first time only, ~1.5 GB)',
  [ERROR_TYPES.QUOTA_EXCEEDED]: 'Not enough disk space. Free up at least 22 GB.',
  [ERROR_TYPES.PLATFORM_UNSUPPORTED]: 'Your device/OS does not meet system requirements.',
  [ERROR_TYPES.JSON_PARSE_FAILED]: 'AI response format error. Try again.',
  [ERROR_TYPES.TIMEOUT]: 'Analysis timed out. Please try again.',
  [ERROR_TYPES.NETWORK_ERROR]: 'Network error. Check your connection.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Classify error and return structured error info
 */
export function classifyError(error) {
  const message = error.message || String(error);

  // AI unavailable
  if (message.includes('AI_UNAVAILABLE') ||
      message.includes('not available') ||
      message.includes('not supported')) {
    return {
      type: ERROR_TYPES.AI_UNAVAILABLE,
      userMessage: USER_MESSAGES[ERROR_TYPES.AI_UNAVAILABLE],
      technical: message,
      recoverable: false
    };
  }

  // Quota exceeded
  if (error.name === 'QuotaExceededError' || message.includes('QuotaExceededError')) {
    return {
      type: ERROR_TYPES.QUOTA_EXCEEDED,
      userMessage: USER_MESSAGES[ERROR_TYPES.QUOTA_EXCEEDED],
      technical: message,
      recoverable: false
    };
  }

  // Platform not supported
  if (error.name === 'NotSupportedError' || message.includes('NotSupportedError')) {
    return {
      type: ERROR_TYPES.PLATFORM_UNSUPPORTED,
      userMessage: USER_MESSAGES[ERROR_TYPES.PLATFORM_UNSUPPORTED],
      technical: message,
      recoverable: false
    };
  }

  // JSON parsing failed
  if (message.includes('JSON_PARSE_FAILED') || message.includes('JSON')) {
    return {
      type: ERROR_TYPES.JSON_PARSE_FAILED,
      userMessage: USER_MESSAGES[ERROR_TYPES.JSON_PARSE_FAILED],
      technical: message,
      recoverable: true
    };
  }

  // Timeout
  if (message.includes('TIMEOUT') || message.includes('timeout') || message.includes('timed out')) {
    return {
      type: ERROR_TYPES.TIMEOUT,
      userMessage: USER_MESSAGES[ERROR_TYPES.TIMEOUT],
      technical: message,
      recoverable: true
    };
  }

  // Network error
  if (message.includes('network') || message.includes('fetch') || message.includes('NetworkError')) {
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      userMessage: USER_MESSAGES[ERROR_TYPES.NETWORK_ERROR],
      technical: message,
      recoverable: true
    };
  }

  // Unknown error
  return {
    type: ERROR_TYPES.UNKNOWN,
    userMessage: USER_MESSAGES[ERROR_TYPES.UNKNOWN],
    technical: message,
    recoverable: true
  };
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error with context
 */
export function logError(error, context = {}) {
  const classified = classifyError(error);

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('[ERROR DETAILS]');
  console.error('Type:', classified.type);
  console.error('User Message:', classified.userMessage);
  console.error('Technical:', classified.technical);
  console.error('Recoverable:', classified.recoverable);
  console.error('Context:', JSON.stringify(context, null, 2));
  console.error('Timestamp:', new Date().toISOString());

  if (error.stack) {
    console.error('Stack Trace:');
    console.error(error.stack);
  }

  if (error.cause) {
    console.error('Caused by:', error.cause);
  }

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Save to persistent storage
  saveErrorToStorage(classified, error, context).catch(err => {
    console.error('Failed to save error to storage:', err);
  });

  return classified;
}

/**
 * Save error to chrome.storage.local
 */
async function saveErrorToStorage(classified, error, context) {
  const LOG_KEY = 'debug_logs';
  const MAX_LOGS = 500;

  try {
    const entry = {
      timestamp: new Date().toISOString(),
      component: context.component || 'Unknown',
      level: 'ERROR',
      message: classified.userMessage,
      data: {
        type: classified.type,
        technical: classified.technical,
        recoverable: classified.recoverable,
        context,
        stack: error.stack || null
      }
    };

    // Get existing logs
    const result = await chrome.storage.local.get(LOG_KEY);
    const logs = result[LOG_KEY] || [];

    // Add new entry
    logs.push(entry);

    // Keep only last MAX_LOGS entries
    const trimmedLogs = logs.slice(-MAX_LOGS);

    // Save back
    await chrome.storage.local.set({ [LOG_KEY]: trimmedLogs });
  } catch (storageError) {
    console.error('Storage save failed:', storageError);
  }
}

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================

/**
 * Wrap promise with timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds (default 30000)
 * @returns {Promise}
 */
export function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT: Request took too long')), ms)
    )
  ]);
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max retry attempts (default 2)
 * @param {number} delayMs - Initial delay in ms (default 1000)
 * @returns {Promise}
 */
export async function withRetry(fn, maxRetries = 2, delayMs = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);

      // Don't retry if error is not recoverable
      if (!classified.recoverable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// GRACEFUL DEGRADATION
// ============================================================================

/**
 * Handle error gracefully - never crash the extension
 * @param {Error} error
 * @param {Object} fallback - Fallback data to return
 * @param {Object} context - Additional context for logging
 * @returns {Object} - { success: boolean, data?, error? }
 */
export function handleGracefully(error, fallback = null, context = {}) {
  const classified = logError(error, context);

  return {
    success: false,
    error: {
      type: classified.type,
      message: classified.userMessage,
      technical: classified.technical,
      recoverable: classified.recoverable
    },
    data: fallback
  };
}

// ============================================================================
// AI AVAILABILITY CHECK
// ============================================================================

/**
 * Check AI availability with proper error handling
 * @param {string} availability - 'readily' | 'after-download' | 'no'
 * @returns {Object} - { available: boolean, downloading: boolean, error? }
 */
export function checkAvailability(availability) {
  if (availability === 'no') {
    return {
      available: false,
      downloading: false,
      error: {
        type: ERROR_TYPES.AI_UNAVAILABLE,
        message: USER_MESSAGES[ERROR_TYPES.AI_UNAVAILABLE]
      }
    };
  }

  if (availability === 'after-download') {
    return {
      available: true,
      downloading: true,
      error: {
        type: ERROR_TYPES.AI_DOWNLOADING,
        message: USER_MESSAGES[ERROR_TYPES.AI_DOWNLOADING]
      }
    };
  }

  return {
    available: true,
    downloading: false
  };
}

// ============================================================================
// DOWNLOAD PROGRESS MONITOR
// ============================================================================

/**
 * Create download progress monitor
 * @param {Function} callback - Called with progress percentage (0-100)
 * @returns {Function} - Monitor function for AI API
 */
export function createProgressMonitor(callback) {
  return (m) => {
    m.addEventListener('downloadprogress', (e) => {
      const percentage = Math.round(e.loaded / e.total * 100);
      console.log(`AI Model download: ${percentage}%`);
      if (callback) {
        callback(percentage);
      }
    });
  };
}
