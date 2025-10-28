/**
 * Simple URL hashing for cache keys
 * Returns a short hash (8 characters)
 */
export function hashURL(url) {
  try {
    const parsed = new URL(url);
    // Use origin + pathname (without query params)
    const normalized = `${parsed.origin}${parsed.pathname}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36).slice(0, 8);
  } catch {
    // Fallback for invalid URLs
    return Math.random().toString(36).slice(2, 10);
  }
}
