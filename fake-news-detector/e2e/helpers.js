/**
 * E2E Test Helpers for Chrome Extension
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get extension path
 */
export function getExtensionPath() {
  return path.join(__dirname, '..');
}

/**
 * Load extension in browser context
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<string>} Extension ID
 */
export async function loadExtension(context) {
  // Extension is already loaded via launchOptions in fixtures
  // This function gets the extension ID

  let serviceWorker;

  // Try to wait for service worker, with timeout handling
  try {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 5000 });
  } catch (e) {
    // Service worker might already be registered
    const existingWorkers = context.serviceWorkers();
    if (existingWorkers.length > 0) {
      serviceWorker = existingWorkers[0];
    } else {
      throw new Error('Extension service worker not found: ' + e.message);
    }
  }

  // Extract extension ID from service worker URL
  const swUrl = serviceWorker.url();
  const match = swUrl.match(/chrome-extension:\/\/([a-z]+)\//);

  if (!match) {
    throw new Error('Could not extract extension ID from: ' + swUrl);
  }

  return match[1];
}

/**
 * Navigate to extension popup
 * @param {import('@playwright/test').Page} page
 * @param {string} extensionId
 */
export async function openPopup(page, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/src/popup/popup.html`;
  await page.goto(popupUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to extension side panel
 * @param {import('@playwright/test').Page} page
 * @param {string} extensionId
 */
export async function openSidePanel(page, extensionId) {
  const sidePanelUrl = `chrome-extension://${extensionId}/src/sidepanel/panel.html`;
  await page.goto(sidePanelUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Get extension storage data
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 */
export async function getStorageData(page, key) {
  return await page.evaluate(async (storageKey) => {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey];
  }, key);
}

/**
 * Set extension storage data
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 * @param {any} value
 */
export async function setStorageData(page, key, value) {
  await page.evaluate(async ({ storageKey, storageValue }) => {
    await chrome.storage.local.set({ [storageKey]: storageValue });
  }, { storageKey: key, storageValue: value });
}

/**
 * Clear extension storage
 * @param {import('@playwright/test').Page} page
 */
export async function clearStorage(page) {
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
  });
}

/**
 * Wait for element with timeout
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} timeout
 */
export async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get console messages from page
 * @param {import('@playwright/test').Page} page
 * @returns {Array} Console messages
 */
export function captureConsoleMessages(page) {
  const messages = [];

  page.on('console', (msg) => {
    messages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });

  return messages;
}

/**
 * Check if element is visible
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function isVisible(page, selector) {
  try {
    const element = await page.locator(selector);
    return await element.isVisible();
  } catch {
    return false;
  }
}

/**
 * Wait for text content
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} text
 * @param {number} timeout
 */
export async function waitForText(page, selector, text, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.locator(selector).filter({ hasText: text }).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}
