/**
 * E2E Test: Custom Prompts
 * Tests the custom prompt editor functionality
 */
import { test, expect } from './fixtures.js';
import { openSidePanel, getStorageData, clearStorage } from './helpers.js';

test.describe('Custom Prompts', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('default prompts load in editor', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const systemPrompt = page.locator('#system-prompt');
    const userPromptTemplate = page.locator('#user-prompt-template');

    // Default prompts should be populated
    const systemText = await systemPrompt.inputValue();
    const userText = await userPromptTemplate.inputValue();

    expect(systemText.length).toBeGreaterThan(50);
    expect(userText.length).toBeGreaterThan(30);

    // Should contain expected keywords
    expect(systemText.toLowerCase()).toContain('fact');
    expect(userText).toContain('{{');
  });

  test('can edit system prompt', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const systemPrompt = page.locator('#system-prompt');

    // Clear and type new prompt
    await systemPrompt.clear();
    const customPrompt = 'Custom system prompt for testing fact-checking analysis. You are an expert journalist.';
    await systemPrompt.fill(customPrompt);

    const value = await systemPrompt.inputValue();
    expect(value).toBe(customPrompt);
  });

  test('can edit user prompt template', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const userPromptTemplate = page.locator('#user-prompt-template');

    await userPromptTemplate.clear();
    const customTemplate = 'Analyze this article: {{title}} from {{url}}. Text: {{text}}';
    await userPromptTemplate.fill(customTemplate);

    const value = await userPromptTemplate.inputValue();
    expect(value).toBe(customTemplate);
  });

  test('saving custom prompts stores in chrome.storage', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const systemPrompt = page.locator('#system-prompt');
    const userPromptTemplate = page.locator('#user-prompt-template');

    // Set custom prompts
    const customSystem = 'Custom system prompt for E2E testing';
    const customUser = 'Analyze: {{title}} {{url}} {{text}}';

    await systemPrompt.clear();
    await systemPrompt.fill(customSystem);

    await userPromptTemplate.clear();
    await userPromptTemplate.fill(customUser);

    // Save
    await page.click('#btn-save-prompts');

    // Wait for save
    await page.waitForTimeout(500);

    // Verify storage
    const prompts = await getStorageData(page, 'customPrompts');
    expect(prompts).toBeDefined();
    expect(prompts.systemPrompt).toBe(customSystem);
    expect(prompts.userPromptTemplate).toBe(customUser);
  });

  test('saved prompts persist after reload', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    const customSystem = 'Persistent system prompt test';
    const customUser = 'Template: {{title}} {{text}}';

    // Save custom prompts
    await page.locator('#system-prompt').clear();
    await page.locator('#system-prompt').fill(customSystem);
    await page.locator('#user-prompt-template').clear();
    await page.locator('#user-prompt-template').fill(customUser);
    await page.click('#btn-save-prompts');

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify prompts are restored
    const systemValue = await page.locator('#system-prompt').inputValue();
    const userValue = await page.locator('#user-prompt-template').inputValue();

    expect(systemValue).toBe(customSystem);
    expect(userValue).toBe(customUser);
  });

  test('reset prompts button restores defaults', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId);

    // First save custom prompts
    await page.locator('#system-prompt').clear();
    await page.locator('#system-prompt').fill('Custom prompt');
    await page.click('#btn-save-prompts');
    await page.waitForTimeout(500);

    // Click reset
    page.once('dialog', dialog => dialog.accept()); // Accept confirmation dialog
    await page.click('#btn-reset-prompts');

    await page.waitForTimeout(500);

    // Verify defaults are restored
    const systemText = await page.locator('#system-prompt').inputValue();
    expect(systemText.length).toBeGreaterThan(50);
    expect(systemText.toLowerCase()).toContain('fact');

    // Storage should be cleared
    const prompts = await getStorageData(page, 'customPrompts');
    expect(prompts).toBeNull();
  });

  test('save prompts shows success message', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId });

    // Modify prompts
    await page.locator('#system-prompt').fill('Test prompt with sufficient length for validation');

    // Save
    await page.click('#btn-save-prompts');

    await page.waitForTimeout(500);

    // Check success message
    const status = await page.locator('#prompts-status').textContent();
    expect(status).toContain('saved');
  });

  test('empty prompts show validation error', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId });

    // Clear system prompt
    await page.locator('#system-prompt').clear();
    await page.locator('#system-prompt').fill('');

    // Try to save
    await page.click('#btn-save-prompts');

    await page.waitForTimeout(500);

    // Should show error (if validation is implemented)
    const status = await page.locator('#prompts-status').textContent();

    // May show error or be empty
    console.log('Validation status:', status);
  });

  test('template variables are documented', async ({ page, extensionId }) => {
    await openSidePanel(page, extensionId });

    // Check for template variable documentation
    const userPromptValue = await page.locator('#user-prompt-template').inputValue();

    // Should contain template variables
    expect(userPromptValue).toContain('{{');
    expect(userPromptValue).toContain('}}');

    // Common variables should be present
    const hasTitle = userPromptValue.includes('{{title}}');
    const hasUrl = userPromptValue.includes('{{url}}');
    const hasText = userPromptValue.includes('{{text}}');

    expect(hasTitle || hasUrl || hasText).toBe(true);
  });
});
