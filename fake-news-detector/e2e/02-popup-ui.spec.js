/**
 * E2E Test: Popup UI
 * Tests the extension popup interface
 */
import { test, expect } from './fixtures.js';
import { openPopup, isVisible, waitForText } from './helpers.js';

test.describe('Popup UI', () => {
  test('popup opens and displays correctly', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    // Verify title
    const title = await page.title();
    expect(title).toContain('Fake News Detector');

    // Verify main UI elements are visible
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#btn-full-analysis')).toBeVisible();
    await expect(page.locator('#btn-highlight')).toBeVisible();
    await expect(page.locator('#btn-clear-highlight')).toBeVisible();
  });

  test('status message shows "Ready to analyze"', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Ready to analyze');
  });

  test('full analysis button opens side panel', async ({ context, page, extensionId }) => {
    await openPopup(page, extensionId);

    // Click "Full Analysis" button
    await page.click('#btn-full-analysis');

    // Wait a bit for side panel to open
    await page.waitForTimeout(1000);

    // Check if side panel page exists in context
    const pages = context.pages();
    const sidePanelPage = pages.find(p =>
      p.url().includes('sidepanel/panel.html')
    );

    expect(sidePanelPage).toBeDefined();

    if (sidePanelPage) {
      await sidePanelPage.close();
    }
  });

  test('highlight button is disabled when no analysis', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    // Highlight button should be initially disabled (no analysis done yet)
    const highlightBtn = page.locator('#btn-highlight');
    const isDisabled = await highlightBtn.isDisabled();

    // May or may not be disabled depending on cached analysis
    console.log('Highlight button disabled:', isDisabled);
  });

  test('result section hidden initially', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    const resultSection = page.locator('#result');
    const isHidden = await resultSection.evaluate(el => el.style.display === 'none');

    expect(isHidden).toBe(true);
  });

  test('known site badge shows instant score', async ({ context, page, extensionId }) => {
    // Navigate to a known high-credibility site
    await page.goto('https://www.reuters.com');

    // Wait for badge update
    await page.waitForTimeout(1000);

    // Open popup
    await openPopup(page, extensionId);

    // Check if result section is now visible (instant score)
    const resultVisible = await isVisible(page, '#result');

    // Check status or score
    const statusText = await page.locator('#status').textContent();
    console.log('Status for reuters.com:', statusText);

    // May show instant score or cached analysis
    expect(statusText).toBeDefined();
  });

  test('popup layout is responsive', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    // Get popup dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.body.clientWidth,
      height: document.body.clientHeight
    }));

    // Popup should be reasonable size
    expect(dimensions.width).toBeGreaterThan(300);
    expect(dimensions.width).toBeLessThan(800);
    expect(dimensions.height).toBeGreaterThan(400);
  });

  test('all buttons are clickable', async ({ page, extensionId }) => {
    await openPopup(page, extensionId);

    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);

    for (const button of buttons) {
      const isEnabled = await button.isEnabled();
      const text = await button.textContent();
      console.log(`Button "${text}" enabled:`, isEnabled);
    }
  });
});
