/**
 * E2E Test: Settings Persistence
 * Tests that settings are saved and loaded correctly
 */
import { test, expect } from './fixtures.js';
import { openSidePanel, getStorageData, clearStorage } from './helpers.js';

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await clearStorage(page);
  });

  test('default settings load correctly', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Check default auto-analysis mode (should be OFF or SMART)
    const offRadio = page.locator('input[value="OFF"]');
    const smartRadio = page.locator('input[value="SMART"]');

    const offChecked = await offRadio.isChecked();
    const smartChecked = await smartRadio.isChecked();

    // One of them should be checked
    expect(offChecked || smartChecked).toBe(true);

    // Default delay should be visible
    const delayValue = await page.locator('#delay-value').textContent();
    expect(delayValue).toBeDefined();
  });

  test('changing auto-analysis mode saves to storage', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Select ALWAYS mode
    await page.click('input[value="ALWAYS"]');

    // Click save
    await page.click('#btn-save-settings');

    // Wait for save confirmation
    await page.waitForTimeout(500);

    // Check success message
    const status = await page.locator('#settings-status').textContent();
    expect(status).toContain('saved');

    // Verify storage
    const settings = await getStorageData(page, 'settings');
    expect(settings).toBeDefined();
    expect(settings.autoAnalysis).toBe('ALWAYS');
  });

  test('changing delay saves to storage', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Change delay slider
    const slider = page.locator('#delay-slider');
    await slider.fill('5000'); // 5 seconds

    // Click save
    await page.click('#btn-save-settings');

    await page.waitForTimeout(500);

    // Verify storage
    const settings = await getStorageData(page, 'settings');
    expect(settings.analysisDelay).toBe(5000);
  });

  test('settings persist after page reload', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Set specific settings
    await page.click('input[value="SMART"]');
    await page.locator('#delay-slider').fill('3000');
    await page.click('#btn-save-settings');

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for settings to load
    await page.waitForTimeout(1000);

    // Verify settings are restored
    const smartRadio = page.locator('input[value="SMART"]');
    const isChecked = await smartRadio.isChecked();
    expect(isChecked).toBe(true);

    const delayValue = await page.locator('#delay-slider').inputValue();
    expect(parseInt(delayValue)).toBe(3000);
  });

  test('all three auto-analysis modes are available', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const modes = ['OFF', 'SMART', 'ALWAYS'];

    for (const mode of modes) {
      const radio = page.locator(`input[value="${mode}"]`);
      await expect(radio).toBeVisible();

      // Can be selected
      await radio.click();
      const isChecked = await radio.isChecked();
      expect(isChecked).toBe(true);
    }
  });

  test('delay slider has correct range', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const slider = page.locator('#delay-slider');

    // Check min value
    const min = await slider.getAttribute('min');
    expect(parseInt(min)).toBe(0);

    // Check max value
    const max = await slider.getAttribute('max');
    expect(parseInt(max)).toBeGreaterThan(5000);

    // Test setting to min
    await slider.fill('0');
    const delayText = await page.locator('#delay-value').textContent();
    expect(delayText).toContain('Instant');

    // Test setting to max
    await slider.fill(max);
    const delayTextMax = await page.locator('#delay-value').textContent();
    expect(delayTextMax).toContain('s');
  });

  test('save settings shows success message', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Change a setting
    await page.click('input[value="OFF"]');

    // Click save
    await page.click('#btn-save-settings');

    // Wait for success message
    await page.waitForTimeout(500);

    const statusEl = page.locator('#settings-status');
    const statusText = await statusEl.textContent();
    const color = await statusEl.evaluate(el => el.style.color);

    expect(statusText).toContain('saved');
    expect(color).toContain('rgb(15, 157, 88)'); // Success green color
  });
});
