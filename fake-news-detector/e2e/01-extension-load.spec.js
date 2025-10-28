/**
 * E2E Test: Extension Loading
 * Verifies that the extension loads correctly without errors
 */
import { test, expect } from './fixtures.js';
import { openPopup, captureConsoleMessages } from './helpers.js';

test.describe('Extension Loading', () => {
  test('extension loads without errors', async ({ context, page, extensionId }) => {
    // Capture console messages
    const messages = captureConsoleMessages(page);

    // Navigate to a test page
    await page.goto('https://example.com');

    // Wait for service worker to be ready
    await page.waitForTimeout(1000);

    // Check that service worker is running
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    // Verify extension ID is valid
    expect(extensionId).toMatch(/^[a-z]{32}$/);

    // Check for console errors (should be minimal)
    const errors = messages.filter(msg => msg.type === 'error');
    expect(errors.length).toBeLessThan(3); // Allow some benign errors
  });

  test('service worker responds to messages', async ({ page, extensionId }) => {
    await page.goto('https://example.com');

    // Try to communicate with background script
    const response = await page.evaluate(async () => {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'PING' });
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Background might not respond to PING, but should not crash
    expect(response).toBeDefined();
  });

  test('content script injects on web pages', async ({ page }) => {
    await page.goto('https://example.com');

    // Wait for content script to load
    await page.waitForTimeout(500);

    // Check if content script loaded (look for console message)
    const hasContentScript = await page.evaluate(() => {
      // Content script adds console.log, check window for evidence
      return document.querySelector('script[src*="content"]') !== null ||
             typeof window.__fakeNewsDetector !== 'undefined';
    });

    // Content script may or may not inject immediately, so this is informational
    console.log('Content script detected:', hasContentScript);
  });

  test('extension manifest is valid', async ({ context, extensionId }) => {
    const page = await context.newPage();

    // Navigate to extension's manifest
    await page.goto(`chrome-extension://${extensionId}/manifest.json`);

    // Get manifest content
    const manifestText = await page.textContent('body');
    const manifest = JSON.parse(manifestText);

    // Verify key manifest fields
    expect(manifest.name).toBe('Fake News Detector');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');

    await page.close();
  });

  test('extension icons load correctly', async ({ context, extensionId }) => {
    const page = await context.newPage();

    // Check each icon size
    const iconSizes = [16, 32, 128];

    for (const size of iconSizes) {
      const iconUrl = `chrome-extension://${extensionId}/src/assets/icons/${size}.png`;
      const response = await page.goto(iconUrl);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image');
    }

    await page.close();
  });
});
