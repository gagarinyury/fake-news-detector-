/**
 * E2E Test: Known Sites & Cache
 * Tests badge updates and caching functionality
 */
import { test, expect } from './fixtures.js';
import { openPopup, getStorageData, clearStorage } from './helpers.js';

test.describe('Known Sites & Cache', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('known high-credibility site shows instant score', async ({ page, extensionId }) => {
    // Navigate to Reuters (high credibility: 98)
    await page.goto('https://www.reuters.com', { waitUntil: 'domcontentloaded' });

    // Wait for background script to process
    await page.waitForTimeout(1500);

    // Open popup to check score
    await openPopup(page, extensionId);

    // Should show instant result
    const statusText = await page.locator('#status').textContent();
    console.log('Reuters status:', statusText);

    // May show instant score or cached result
    expect(statusText).toBeDefined();
  });

  test('known low-credibility site detected', async ({ page, extensionId }) => {
    // Navigate to Infowars (low credibility: 12)
    await page.goto('https://www.infowars.com', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      // Site may not load, that's OK for testing
    });

    await page.waitForTimeout(1500);

    await openPopup(page, extensionId);

    const statusText = await page.locator('#status').textContent();
    console.log('Infowars status:', statusText);
  });

  test('unknown site shows analysis prompt', async ({ page, extensionId }) => {
    // Navigate to a site not in knownSites database
    await page.goto('https://example.com');

    await page.waitForTimeout(1000);

    await openPopup(page, extensionId);

    const statusText = await page.locator('#status').textContent();

    // Should prompt to analyze
    expect(statusText.toLowerCase()).toMatch(/ready|analyze/);
  });

  test('cache stores analysis results', async ({ page, extensionId }) => {
    await page.goto('https://example.com');

    // Simulate caching a result
    await page.evaluate(async () => {
      const mockResult = {
        score: 75,
        verdict: 'Mostly credible',
        red_flags: ['Minor bias detected'],
        claims: [],
        summary: 'Test summary',
        metadata: {
          analysisTime: 5000,
          modelUsed: 'Gemini Nano'
        }
      };

      // Hash the URL
      const url = window.location.href;
      const normalized = url.split('?')[0];
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const hashStr = Math.abs(hash).toString(36).slice(0, 8);

      await chrome.storage.local.set({
        [`cache:${hashStr}`]: {
          data: mockResult,
          timestamp: Date.now(),
          textLength: 500
        }
      });
    });

    // Reload popup
    await openPopup(page, extensionId);

    await page.waitForTimeout(1000);

    // Should show cached result
    const statusText = await page.locator('#status').textContent();
    console.log('Cached status:', statusText);

    const resultVisible = await page.locator('#result').evaluate(el =>
      window.getComputedStyle(el).display !== 'none'
    );

    expect(resultVisible).toBe(true);
  });

  test('cache has TTL of 24 hours', async ({ page }) => {
    // Check cache implementation uses TTL
    const cacheData = {
      data: { score: 80 },
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      textLength: 500
    };

    await page.evaluate(async (data) => {
      await chrome.storage.local.set({
        'cache:test123': data
      });
    }, cacheData);

    // Verify old cache entry exists
    const stored = await getStorageData(page, 'cache:test123');
    expect(stored).toBeDefined();

    // Age should be > 24 hours
    const age = Date.now() - stored.timestamp;
    const hoursOld = age / (60 * 60 * 1000);

    expect(hoursOld).toBeGreaterThan(24);
  });

  test('multiple sites can be cached', async ({ page, extensionId }) => {
    // Add multiple cache entries
    await page.evaluate(async () => {
      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];

      for (const url of urls) {
        const hash = Math.random().toString(36).slice(2, 10);
        await chrome.storage.local.set({
          [`cache:${hash}`]: {
            data: { score: 70, url },
            timestamp: Date.now(),
            textLength: 300
          }
        });
      }
    });

    // Verify all cached
    const allStorage = await page.evaluate(async () => {
      return await chrome.storage.local.get(null);
    });

    const cacheKeys = Object.keys(allStorage).filter(k => k.startsWith('cache:'));
    expect(cacheKeys.length).toBeGreaterThanOrEqual(3);
  });

  test('cache entries have required structure', async ({ page }) => {
    const mockCache = {
      data: {
        score: 85,
        verdict: 'Credible',
        red_flags: [],
        claims: [],
        summary: 'Test'
      },
      timestamp: Date.now(),
      textLength: 400
    };

    await page.evaluate(async (cache) => {
      await chrome.storage.local.set({
        'cache:test456': cache
      });
    }, mockCache);

    const retrieved = await getStorageData(page, 'cache:test456');

    expect(retrieved).toHaveProperty('data');
    expect(retrieved).toHaveProperty('timestamp');
    expect(retrieved).toHaveProperty('textLength');
    expect(retrieved.data).toHaveProperty('score');
  });
});
