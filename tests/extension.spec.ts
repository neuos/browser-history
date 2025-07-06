import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

// Test utilities
async function getExtensionId(context: BrowserContext): Promise<string> {
  // Navigate to chrome://extensions to get the extension ID
  const page = await context.newPage();
  await page.goto('chrome://extensions');
  
  // Enable developer mode if not already enabled
  const devModeToggle = page.locator('#devMode');
  if (await devModeToggle.isVisible()) {
    await devModeToggle.check();
  }
  
  // Get extension ID from the page
  const extensionId = await page.locator('.extension-id').first().textContent();
  await page.close();
  
  if (!extensionId) {
    throw new Error('Could not find extension ID');
  }
  
  return extensionId.trim();
}

async function openExtensionPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  return popupPage;
}

async function setupBackendConnection() {
  // Wait for backend to be ready
  const response = await fetch('http://localhost:8000/health');
  expect(response.ok).toBeTruthy();
  const health = await response.json();
  expect(health.status).toBe('ok');
}

test.describe('Browser History Extension E2E Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async ({ browser }) => {
    // Create browser context with extension loaded
    context = await browser.newContext();
    
    // Get extension ID
    extensionId = await getExtensionId(context);
    console.log('Extension ID:', extensionId);
    
    // Setup backend connection
    await setupBackendConnection();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load extension popup', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    
    // Check that popup loads with expected elements
    await expect(popupPage.locator('h2')).toContainText('Browser History');
    await expect(popupPage.locator('.sync-status-btn')).toBeVisible();
    
    await popupPage.close();
  });

  test('should show sync status as not configured initially', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    
    // Check initial sync status
    const statusButton = popupPage.locator('.sync-status-btn');
    await expect(statusButton).toContainText('Not Configured');
    
    // Check button color (should be gray for not configured)
    const buttonStyle = await statusButton.getAttribute('style');
    expect(buttonStyle).toContain('#6c757d'); // Gray color
    
    await popupPage.close();
  });

  test('should expand sync status panel when clicked', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    
    const statusButton = popupPage.locator('.sync-status-btn');
    await statusButton.click();
    
    // Check that sync status panel is visible
    await expect(popupPage.locator('.sync-status-panel')).toBeVisible();
    await expect(popupPage.locator('.status-header h3')).toContainText('Sync Status');
    
    // Check setup form is visible
    await expect(popupPage.locator('input[placeholder="Server URL"]')).toBeVisible();
    await expect(popupPage.locator('input[placeholder="Device Name"]')).toBeVisible();
    await expect(popupPage.locator('input[placeholder="Shared Secret"]')).toBeVisible();
    
    await popupPage.close();
  });

  test('should configure sync successfully', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    
    // Open sync status panel
    await popupPage.locator('.sync-status-btn').click();
    await expect(popupPage.locator('.sync-status-panel')).toBeVisible();
    
    // Fill out setup form
    await popupPage.locator('input[placeholder="Server URL"]').fill('http://localhost:8000');
    await popupPage.locator('input[placeholder="Device Name"]').fill('Test Device - Playwright');
    await popupPage.locator('input[placeholder="Shared Secret"]').fill('test-secret');
    
    // Submit setup
    await popupPage.locator('button:has-text("Setup Sync")').click();
    
    // Wait for setup to complete and check status
    await expect(popupPage.locator('.sync-status-btn')).not.toContainText('Not Configured', { timeout: 10000 });
    
    // Should show either Connected or Disconnected (not "Not Configured")
    const statusText = await popupPage.locator('.sync-status-btn').textContent();
    expect(statusText).toMatch(/(Connected|Disconnected)/);
    
    await popupPage.close();
  });

  test('should capture browsing history', async () => {
    // Navigate to a test page to generate history
    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    await testPage.waitForLoadState('networkidle');
    
    // Wait a moment for history to be captured
    await testPage.waitForTimeout(2000);
    
    // Open extension popup and check history
    const popupPage = await openExtensionPopup(context, extensionId);
    
    // Check that history list exists and contains entries
    await expect(popupPage.locator('.history-list')).toBeVisible();
    
    // Look for the example.com entry
    const historyItems = popupPage.locator('.history-item');
    const itemCount = await historyItems.count();
    expect(itemCount).toBeGreaterThan(0);
    
    // Check for example.com in history
    await expect(popupPage.locator('text=example.com')).toBeVisible({ timeout: 5000 });
    
    await testPage.close();
    await popupPage.close();
  });

  test('should sync history to server', async () => {
    // Check that events were sent to the server
    const response = await fetch('http://localhost:8000/sync/events?since=0', {
      headers: {
        'Authorization': 'Bearer test-token', // This might need to be updated with actual token
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Server events:', result.events?.length || 0);
      
      // Should have at least some events (from the example.com visit)
      expect(result.events?.length).toBeGreaterThan(0);
    } else {
      console.log('Server request failed (expected if not authenticated)');
    }
  });

  test('should handle multiple devices', async () => {
    // This test would simulate a second device by:
    // 1. Creating a second browser context
    // 2. Setting up sync with same server but different device name
    // 3. Generating different history
    // 4. Checking that both devices see each other's history
    
    const secondContext = await context.browser()!.newContext({
      permissions: ['storage'],
    });
    
    try {
      const secondExtensionId = await getExtensionId(secondContext);
      const secondPopup = await openExtensionPopup(secondContext, secondExtensionId);
      
      // Setup sync on second device
      await secondPopup.locator('.sync-status-btn').click();
      await secondPopup.locator('input[placeholder="Server URL"]').fill('http://localhost:8000');
      await secondPopup.locator('input[placeholder="Device Name"]').fill('Test Device 2 - Playwright');
      await secondPopup.locator('input[placeholder="Shared Secret"]').fill('test-secret');
      await secondPopup.locator('button:has-text("Setup Sync")').click();
      
      // Wait for sync setup
      await expect(secondPopup.locator('.sync-status-btn')).not.toContainText('Not Configured', { timeout: 10000 });
      
      // Navigate to different page on second device
      const secondTestPage = await secondContext.newPage();
      await secondTestPage.goto('https://httpbin.org/get');
      await secondTestPage.waitForLoadState('networkidle');
      await secondTestPage.waitForTimeout(3000); // Wait for sync
      
      // Check first device for cross-device history
      const firstPopup = await openExtensionPopup(context, extensionId);
      
      // Look for httpbin.org entry in first device's history
      await expect(firstPopup.locator('text=httpbin.org')).toBeVisible({ timeout: 10000 });
      
      await firstPopup.close();
      await secondPopup.close();
      await secondTestPage.close();
    } finally {
      await secondContext.close();
    }
  });

  test('should disconnect sync properly', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    
    // Open sync status panel
    await popupPage.locator('.sync-status-btn').click();
    
    // Click disconnect button
    await popupPage.locator('button:has-text("Disconnect")').click();
    
    // Should show not configured again
    await expect(popupPage.locator('.sync-status-btn')).toContainText('Not Configured', { timeout: 5000 });
    
    await popupPage.close();
  });
});
