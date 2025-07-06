import { test, expect } from '@playwright/test';

test.describe('Basic Setup Test', () => {
  test('should verify Playwright is working', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
  });
});
