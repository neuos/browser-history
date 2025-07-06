import { test, expect } from './fixtures';

test.describe('Extension Loading Test', () => {
  test('should keep browser open and load extension', async ({ context, extensionId }) => {
    console.log('Extension ID:', extensionId);
    
    // Create a new page
    const page = await context.newPage();
    
    // Navigate to the extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Keep the page open for a moment to verify it works
    await page.waitForTimeout(5000);
    
    // Check if the popup loaded
    const title = await page.title();
    console.log('Popup title:', title);
    
    expect(page.url()).toContain(`chrome-extension://${extensionId}/popup.html`);
  });
});
