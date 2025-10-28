/**
 * Storage Management Module
 * Handles quota limits and automatic cleanup
 */

const MAX_CACHE_ENTRIES = 500;
const CACHE_PREFIX = 'cache:';
const TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get storage usage stats
 */
export async function getStorageStats() {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default

  return {
    used: bytesInUse,
    quota,
    percentage: (bytesInUse / quota) * 100,
    available: quota - bytesInUse
  };
}

/**
 * Clean up old cache entries
 */
export async function cleanupOldCache() {
  const result = await chrome.storage.local.get(null);
  const now = Date.now();
  const cacheEntries = [];

  // Find all cache entries with timestamps
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith(CACHE_PREFIX) && value.timestamp) {
      cacheEntries.push({
        key,
        timestamp: value.timestamp,
        size: JSON.stringify(value).length
      });
    }
  }

  // Sort by timestamp (oldest first)
  cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

  const keysToRemove = [];

  // Remove expired entries
  for (const entry of cacheEntries) {
    if (now - entry.timestamp > TTL) {
      keysToRemove.push(entry.key);
    }
  }

  // If still over limit, remove oldest entries
  if (cacheEntries.length > MAX_CACHE_ENTRIES) {
    const excessCount = cacheEntries.length - MAX_CACHE_ENTRIES;
    const oldestEntries = cacheEntries
      .filter(e => !keysToRemove.includes(e.key))
      .slice(0, excessCount);
    keysToRemove.push(...oldestEntries.map(e => e.key));
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`Cleaned up ${keysToRemove.length} cache entries`);
  }

  return keysToRemove.length;
}

/**
 * Safe cache write with quota handling
 */
export async function safeCacheSet(key, value) {
  try {
    // Try normal write
    await chrome.storage.local.set({ [key]: value });
    return { success: true };

  } catch (error) {
    if (error.message?.includes('QUOTA_EXCEEDED') ||
        error.name === 'QuotaExceededError') {

      console.warn('Storage quota exceeded, cleaning up...');

      // Cleanup old entries
      const removed = await cleanupOldCache();

      if (removed === 0) {
        // No old entries to remove, check storage stats
        const stats = await getStorageStats();

        if (stats.percentage > 95) {
          // Storage critically full, remove 50% of entries
          const result = await chrome.storage.local.get(null);
          const cacheKeys = Object.keys(result)
            .filter(k => k.startsWith(CACHE_PREFIX));

          const toRemove = cacheKeys.slice(0, Math.floor(cacheKeys.length / 2));
          await chrome.storage.local.remove(toRemove);
          console.warn(`Emergency cleanup: removed ${toRemove.length} entries`);
        }
      }

      // Retry write
      try {
        await chrome.storage.local.set({ [key]: value });
        return { success: true, hadToCleanup: true };
      } catch (retryError) {
        console.error('Failed to cache even after cleanup:', retryError);
        return {
          success: false,
          error: 'Storage quota exceeded and cleanup failed'
        };
      }
    }

    // Other error
    console.error('Cache write failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get cache value safely
 */
export async function safeCacheGet(key) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  } catch (error) {
    console.error('Cache read failed:', error);
    return null;
  }
}

/**
 * Remove cache entry
 */
export async function safeCacheRemove(key) {
  try {
    await chrome.storage.local.remove(key);
    return { success: true };
  } catch (error) {
    console.error('Cache remove failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule periodic cleanup (call on extension startup)
 */
export function schedulePeriodicCleanup() {
  // Run cleanup every 6 hours
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;

  // Initial cleanup
  cleanupOldCache().catch(console.error);

  // Periodic cleanup
  setInterval(() => {
    cleanupOldCache().catch(console.error);
  }, CLEANUP_INTERVAL);

  console.log('Scheduled periodic cache cleanup (every 6 hours)');
}
