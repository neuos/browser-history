import { test, expect } from './fixtures';
import { ExtensionTestUtils, BackendTestUtils } from './utils';

test.describe.configure({ mode: 'serial' });

test.describe('Browser History Extension - Simplified E2E', () => {
  let backendUtils: BackendTestUtils;

  test.beforeAll(async () => {
    backendUtils = new BackendTestUtils();
    
    // Verify backend is running
    const isHealthy = await backendUtils.checkHealth();
    expect(isHealthy).toBeTruthy();
  });

  test('should load extension popup and show initial state', async ({ context, extensionId }) => {
    const extensionUtils = new ExtensionTestUtils(context, extensionId);
    const status = await extensionUtils.getSyncStatus();
    
    expect(status.text).toContain('Not Configured');
    // Accept both hex and rgb color formats
    expect(status.color).toMatch(/(#6c757d|rgb\(108, 117, 125\))/);
  });

  test('should configure sync successfully', async ({ context, extensionId }) => {
    const extensionUtils = new ExtensionTestUtils(context, extensionId);
    
    await extensionUtils.setupSync(
      'http://localhost:8000',
      'Test Device - Playwright E2E',
      'secret'  // Use the actual shared secret from backend/.env
    );
    
    const status = await extensionUtils.getSyncStatus();
    
    // Should not be "Not Configured" anymore
    expect(status.text).not.toContain('Not Configured');
    // Should show either Connected or Disconnected
    expect(status.text).toMatch(/(Connected|Disconnected)/);
  });

  test('should capture and display browsing history', async ({ context, extensionId }) => {
    const extensionUtils = new ExtensionTestUtils(context, extensionId);
    
    console.log('Starting history capture test...');
    
    // First, set up sync if not already configured
    try {
      const status = await extensionUtils.getSyncStatus();
      if (status.text.includes('Not Configured')) {
        console.log('Setting up sync first...');
        await extensionUtils.setupSync(
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
    await extensionUtils.visitPage('https://example.com');
    
    // Wait longer for the extension to capture and sync the history
    console.log('Waiting for history to be captured and synced...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check that history was captured
    console.log('Checking for captured history...');
    const historyItems = await extensionUtils.getHistoryItems();
    
    console.log('History items found:', historyItems);
    
    // Should have at least one item
    expect(historyItems.length).toBeGreaterThan(0);
    
    // Should contain the example.com entry
    const exampleItem = historyItems.find(item => item.url.includes('example.com'));
    expect(exampleItem).toBeDefined();
  });

  test('should handle sync disconnect', async ({ context, extensionId }) => {
    const extensionUtils = new ExtensionTestUtils(context, extensionId);
    
    // First ensure sync is configured
    console.log('Ensuring sync is configured before disconnect test...');
    const initialStatus = await extensionUtils.getSyncStatus();
    
    if (initialStatus.text.includes('Not Configured')) {
      console.log('Setting up sync first...');
      await extensionUtils.setupSync(
        'http://localhost:8000',
        'Test Device - Disconnect Test',
        'secret'
      );
      
      // Verify it's now configured
      const setupStatus = await extensionUtils.getSyncStatus();
      expect(setupStatus.text).not.toContain('Not Configured');
    }
    
    // Now try to disconnect
    console.log('Attempting to disconnect...');
    await extensionUtils.disconnect();
    
    // Verify it's disconnected
    const status = await extensionUtils.getSyncStatus();
    expect(status.text).toContain('Not Configured');
    // Accept both hex and rgb color formats
    expect(status.color).toMatch(/(#6c757d|rgb\(108, 117, 125\))/);
  });
});
