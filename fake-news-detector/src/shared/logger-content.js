/**
 * Centralized Logging System for Content Scripts
 * IIFE version without ES6 modules for use in content_scripts
 * Exports to window.FND (Fake News Detector namespace)
 */

(function() {
  'use strict';

  const MAX_LOGS = 500;
  const LOG_KEY = 'debug_logs';

  const LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  };

  /**
   * Safe clone - handles circular references
   */
  function safeClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      return String(obj);
    }
  }

  /**
   * Save log entry to chrome.storage.local
   */
  async function saveLogEntry(entry) {
    try {
      const result = await chrome.storage.local.get(LOG_KEY);
      const logs = result[LOG_KEY] || [];
      logs.push(entry);
      const trimmedLogs = logs.slice(-MAX_LOGS);
      await chrome.storage.local.set({ [LOG_KEY]: trimmedLogs });
    } catch (error) {
      console.error('Failed to save log to storage:', error);
    }
  }

  /**
   * Create a logger for a specific component
   * @param {string} component - Component name
   */
  function createLogger(component) {
    const log = async (level, message, data = null) => {
      const timestamp = new Date().toISOString();

      const entry = {
        timestamp,
        component,
        level,
        message,
        data: data ? safeClone(data) : null
      };

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

  // Export to window namespace
  window.FND = window.FND || {};
  window.FND.createLogger = createLogger;

})();
