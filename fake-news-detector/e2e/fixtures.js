/**
 * Playwright fixtures for Chrome Extension testing
 */
import { test as base, chromium } from '@playwright/test';
import { getExtensionPath, loadExtension } from './helpers.js';

/**
 * Extended test with Chrome extension context
 */
export const test = base.extend({
  context: async ({ }, use) => {
    const extensionPath = getExtensionPath();

    // Use a temporary directory for user data
    const userDataDir = `/tmp/playwright-chrome-${Date.now()}`;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    // Wait a bit for extension to load
    await context.pages()[0].waitForTimeout(1000);

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    const extensionId = await loadExtension(context);
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
