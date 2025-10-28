/**
 * Centralized Logging System
 * Logs to both console and chrome.storage.local
 * Works alongside errorHandler.js for comprehensive logging
 */

const MAX_LOGS = 500; // Keep last 500 log entries
const LOG_KEY = 'debug_logs'; // Same key as errorHandler.js

// Log levels
const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Create a logger for a specific component
 * @param {string} component - Component name (e.g., 'SidePanel', 'ContentScript', 'Background')
 */
export function createLogger(component) {
  const log = async (level, message, data = null) => {
    const timestamp = new Date().toISOString();

    // Log entry
    const entry = {
      timestamp,
      component,
      level,
      message,
      data: data ? safeClone(data) : null
    };

    // Console output with emoji
    const emoji = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌'
    }[level] || '📝';

    const consoleMethod = {
      DEBUG: 'log',
      INFO: 'log',
      WARN: 'warn',
      ERROR: 'error'
    }[level] || 'log';

    const prefix = `${emoji} [${component}] ${message}`;

    if (data) {
      console[consoleMethod](prefix, data);
    } else {
      console[consoleMethod](prefix);
    }

    // Save to storage (async, non-blocking)
    // Don't await to avoid blocking
    saveLogEntry(entry).catch(error => {
      console.error('Failed to save log entry:', error);
    });
  };

  return {
    debug: (message, data) => log(LEVELS.DEBUG, message, data),
    info: (message, data) => log(LEVELS.INFO, message, data),
    warn: (message, data) => log(LEVELS.WARN, message, data),
    error: (message, data) => log(LEVELS.ERROR, message, data)
  };
}

/**
 * Safe clone - handles circular references
 */
function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    // Circular reference or non-serializable
    return String(obj);
  }
}

/**
 * Save log entry to chrome.storage.local
 */
async function saveLogEntry(entry) {
  try {
    // Get existing logs
    const result = await chrome.storage.local.get(LOG_KEY);
    const logs = result[LOG_KEY] || [];

    // Add new entry
    logs.push(entry);

    // Keep only last MAX_LOGS entries
    const trimmedLogs = logs.slice(-MAX_LOGS);

    // Save back
    await chrome.storage.local.set({ [LOG_KEY]: trimmedLogs });
  } catch (error) {
    console.error('Failed to save log to storage:', error);
  }
}

/**
 * Get all logs from storage
 */
export async function getLogs() {
  try {
    const result = await chrome.storage.local.get(LOG_KEY);
    return result[LOG_KEY] || [];
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
}

/**
 * Clear all logs
 */
export async function clearLogs() {
  try {
    await chrome.storage.local.remove(LOG_KEY);
    console.log('✓ Logs cleared');
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}

/**
 * Export logs as JSON string
 */
export async function exportLogs() {
  const logs = await getLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Export logs as formatted text
 */
export async function exportLogsAsText() {
  const logs = await getLogs();

  return logs.map(entry => {
    const time = new Date(entry.timestamp).toLocaleString();
    const dataStr = entry.data ? `\n  Data: ${JSON.stringify(entry.data, null, 2)}` : '';
    return `[${time}] [${entry.level}] [${entry.component}] ${entry.message}${dataStr}`;
  }).join('\n\n');
}

/**
 * Download logs as a file
 */
export async function downloadLogs(format = 'json') {
  const logs = format === 'json' ? await exportLogs() : await exportLogsAsText();
  const blob = new Blob([logs], { type: format === 'json' ? 'application/json' : 'text/plain' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `fake-news-detector-logs-${timestamp}.${format === 'json' ? 'json' : 'txt'}`;

  // Create download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
