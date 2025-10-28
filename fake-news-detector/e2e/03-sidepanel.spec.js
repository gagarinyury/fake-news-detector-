/**
 * E2E Test: Side Panel
 * Tests the side panel UI and analysis flow
 */
import { test, expect } from './fixtures.js';
import { openSidePanel, isVisible, waitForText } from './helpers.js';

test.describe('Side Panel', () => {
  test('side panel opens and displays UI', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Verify UI elements
    await expect(page.locator('#btn-analyze')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#progress-section')).toBeVisible();

    // Check tabs/sections
    await expect(page.locator('h2').filter({ hasText: 'Analysis Results' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Settings' })).toBeVisible();
  });

  test('analyze button is present', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const analyzeBtn = page.locator('#btn-analyze');
    await expect(analyzeBtn).toBeVisible();
    await expect(analyzeBtn).toBeEnabled();

    const buttonText = await analyzeBtn.textContent();
    expect(buttonText).toContain('Analyze');
  });

  test('status shows "Ready to analyze"', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const status = await page.locator('#status').textContent();
    expect(status.toLowerCase()).toContain('ready');
  });

  test('progress section is hidden initially', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const progressSection = page.locator('#progress-section');
    const isHidden = await progressSection.evaluate(el =>
      window.getComputedStyle(el).display === 'none'
    );

    expect(isHidden).toBe(true);
  });

  test('result section is hidden initially', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const resultSection = page.locator('#result');
    const isHidden = await resultSection.evaluate(el =>
      window.getComputedStyle(el).display === 'none'
    );

    expect(isHidden).toBe(true);
  });

  test('settings section exists', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Check for auto-analysis mode radios
    const smartModeRadio = page.locator('input[value="SMART"]');
    await expect(smartModeRadio).toBeVisible();

    // Check for delay slider
    const delaySlider = page.locator('#delay-slider');
    await expect(delaySlider).toBeVisible();

    // Check for save button
    const saveBtn = page.locator('#btn-save-settings');
    await expect(saveBtn).toBeVisible();
  });

  test('custom prompts editor exists', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Check for prompt textareas
    const systemPrompt = page.locator('#system-prompt');
    const userPromptTemplate = page.locator('#user-prompt-template');

    await expect(systemPrompt).toBeVisible();
    await expect(userPromptTemplate).toBeVisible();

    // Check for save/reset buttons
    await expect(page.locator('#btn-save-prompts')).toBeVisible();
    await expect(page.locator('#btn-reset-prompts')).toBeVisible();
  });

  test('debug logs section exists', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Check for logs container
    const logsContainer = page.locator('#logs-container');
    await expect(logsContainer).toBeVisible();

    // Check for log buttons
    await expect(page.locator('#btn-refresh-logs')).toBeVisible();
    await expect(page.locator('#btn-download-logs')).toBeVisible();
    await expect(page.locator('#btn-clear-logs')).toBeVisible();
  });

  test('copy button exists in results', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const copyBtn = page.locator('#btn-copy');
    await expect(copyBtn).toBeVisible();
  });

  test('all sections are properly styled', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // Check if CSS is loaded
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.fontFamily !== 'Times New Roman'; // Should have custom font
    });

    expect(hasStyles).toBe(true);
  });
});
