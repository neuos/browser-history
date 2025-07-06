import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Browser History Extension - Simplified E2E', () => {
  test.beforeAll(async ({ backendApi }) => {
    // Verify backend is running
    const isHealthy = await backendApi.isHealthy();
    expect(isHealthy).toBeTruthy();
  });

  test('should load extension popup and show initial state', async ({ popupPage }) => {
    const status = await popupPage.getSyncStatus();
    
    expect(status.text).toContain('Not Configured');
    // Accept both hex and rgb color formats
    expect(status.color).toMatch(/(#6c757d|rgb\(108, 117, 125\))/);
  });

  test('should configure sync successfully', async ({ popupPage }) => {
    await popupPage.setupSync(
      'http://localhost:8000',
      'Test Device - Playwright E2E',
      'secret'  // Use the actual shared secret from backend/.env
    );
    
    const status = await popupPage.getSyncStatus();
    
    // Should not be "Not Configured" anymore
    expect(status.text).not.toContain('Not Configured');
    // Should show either Connected or Disconnected
    expect(status.text).toMatch(/(Connected|Disconnected)/);
  });

  test('should capture and display browsing history', async ({ popupPage, extensionManager }) => {
    console.log('Starting history capture test...');
    
    // First, set up sync if not already configured
    try {
      const isConfigured = await popupPage.isConfigured();
      if (!isConfigured) {
        console.log('Setting up sync first...');
        await popupPage.setupSync(
          'http://localhost:8000',
          'Test Device - History Test',
          'secret'
        );
      }
    } catch (error) {
      console.log('Sync setup error (might already be configured):', error);
    }
    
    // Visit a test page
    console.log('Visiting test page...');
    await extensionManager.visitPage('https://example.com');
    
    // Wait longer for the extension to capture and sync the history
    console.log('Waiting for history to be captured and synced...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check that history was captured
    console.log('Checking for captured history...');
    const historyItems = await popupPage.getHistoryItems();
    
    console.log('History items found:', historyItems);
    
    // Should have at least one item
    expect(historyItems.length).toBeGreaterThan(0);
    
    // Should contain the example.com entry
    const exampleItem = historyItems.find(item => item.url.includes('example.com'));
    expect(exampleItem).toBeDefined();
  });

  test('should handle sync disconnect', async ({ popupPage }) => {
    // First ensure sync is configured
    console.log('Ensuring sync is configured before disconnect test...');
    const isConfigured = await popupPage.isConfigured();
    
    if (!isConfigured) {
      console.log('Setting up sync first...');
      await popupPage.setupSync(
        'http://localhost:8000',
        'Test Device - Disconnect Test',
        'secret'
      );
      
      // Verify it's now configured
      const setupStatus = await popupPage.getSyncStatus();
      expect(setupStatus.text).not.toContain('Not Configured');
    }
    
    // Now try to disconnect
    console.log('Attempting to disconnect...');
    await popupPage.disconnect();
    
    // Verify it's disconnected
    const status = await popupPage.getSyncStatus();
    expect(status.text).toContain('Not Configured');
    // Accept both hex and rgb color formats
    expect(status.color).toMatch(/(#6c757d|rgb\(108, 117, 125\))/);
  });

  test('should establish SSE connection after sync setup', async ({ popupPage }) => {
    console.log('Testing SSE connection status...');
    
    // Set up sync
    await popupPage.setupSync(
      'http://localhost:8000',
      'Test Device - SSE Connection',
      'secret'
    );
    
    // Wait a moment for the connection to establish
    await popupPage.page.waitForTimeout(3000);
    
    // Check connection status
    const status = await popupPage.getSyncStatus();
    console.log('Current SSE connection status:', status.text);
    
    // Take a screenshot for debugging
    await popupPage.page.screenshot({ path: 'debug-sse-connection.png' });
    
    // The status should show "Connected" not "Disconnected"
    expect(status.text).toContain('Connected');
    expect(status.text).not.toContain('Disconnected');
  });
});
