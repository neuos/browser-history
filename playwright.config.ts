import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-extension',
      use: { 
        // Force only Chromium browser
        browserName: 'chromium',
        channel: 'chromium',
        // Headless by default so this doesn't pop a visible, focus-stealing window; set
        // PLAYWRIGHT_HEADED=true (bun run test:e2e:headed does this) to watch it run.
        headless: process.env.PLAYWRIGHT_HEADED !== 'true',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'cd dotnet-backend && dotnet run --project BrowserHistory.Api --launch-profile http',
      port: 5165,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
