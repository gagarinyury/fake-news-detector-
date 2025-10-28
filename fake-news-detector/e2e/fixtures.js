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

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    const extensionId = await loadExtension(context);
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
