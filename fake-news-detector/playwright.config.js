import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Chrome Extension E2E testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Extensions can't run in parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Only 1 worker for extension tests

  // Reporter settings
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'https://www.example.com',

    // Collect trace when test fails
    trace: 'on-first-retry',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Slow down operations (helpful for debugging)
    // actionTimeout: 10000,
  },

  // Configure projects for Chrome with extension
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Extension will be loaded in test files
        headless: false, // Extensions don't work in headless mode
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
