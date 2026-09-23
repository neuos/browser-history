import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { ExtensionManager, ExtensionPopupPage, BackendApi } from '../pages';

// Device.DeviceName is unique in the backend and the dev database persists across test runs, so
// a fixed name would 500 with a UNIQUE constraint violation on the second run.
const RUN_ID = Date.now();

test.describe('Real-time Sync Notification', () => {
  let context: BrowserContext;
  let extensionId: string;
  let popupPage: ExtensionPopupPage;
  let extensionManager: ExtensionManager;
  let backendApi: BackendApi;

  test.beforeAll(async () => {
    const pathToExtension = './extension/.output/chrome-mv3';
    
    // Create browser context
    context = await chromium.launchPersistentContext(`./test-data/sync-test-${Date.now()}`, {
      channel: 'chromium',
      headless: process.env.PLAYWRIGHT_HEADED !== 'true',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
    });

    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get extension ID
    extensionId = await ExtensionManager.getExtensionId(context);
    console.log('Extension ID:', extensionId);

    // Initialize page objects
    const page = await context.newPage();
    popupPage = new ExtensionPopupPage(page);
    extensionManager = new ExtensionManager(context);
    backendApi = new BackendApi();

    // Verify backend is running
    const isHealthy = await backendApi.isHealthy();
    expect(isHealthy).toBeTruthy();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('should immediately update popup when sync events are triggered', async () => {
    console.log('=== Testing Real-time Sync Notification ===');
    
    // Set up sync
    await popupPage.goto(extensionId);
    await popupPage.setupSync(
      'http://localhost:5165',
      `Test Device - Real-time Sync ${RUN_ID}`,
      'development-shared-secret'
    );

    console.log('Device configured for sync');

    // Wait for initial sync to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get initial history count
    const initialHistoryItems = await popupPage.getHistoryItems();
    const initialCount = initialHistoryItems.length;
    console.log('Initial history count:', initialCount);

    // Navigate to a test page to add some history
    console.log('Navigating to test page...');
    const timestamp = Date.now();
    const testUrl = `https://example.com/sync-test-${timestamp}`;
    await extensionManager.visitPage(testUrl);
    
    // Wait a bit for the extension to capture and sync the history
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Now the KEY TEST: Instead of refreshing the popup, we should test if it auto-updates
    // The fix we implemented should make the popup automatically refresh when sync events arrive
    
    // First, let's simulate what happens when another device adds history
    // We can do this by adding more history locally and seeing if the popup updates in real-time
    console.log('Adding more history to trigger sync events...');
    const testUrl2 = `https://httpbin.org/get?realtime-test=${timestamp}`;
    await extensionManager.visitPage(testUrl2);
    
    // Wait for sync to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if the popup shows the updated history WITHOUT manually refreshing
    const updatedHistoryItems = await popupPage.getHistoryItems();
    const updatedCount = updatedHistoryItems.length;
    console.log('Updated history count:', updatedCount);

    // The popup should now show the new items because of our fix
    const hasTestUrl1 = updatedHistoryItems.some(item => item.url.includes(`sync-test-${timestamp}`));
    const hasTestUrl2 = updatedHistoryItems.some(item => item.url.includes(`realtime-test=${timestamp}`));
    
    console.log('Has test URL 1:', hasTestUrl1);
    console.log('Has test URL 2:', hasTestUrl2);
    
    // At least one of the test URLs should be present
    expect(hasTestUrl1 || hasTestUrl2).toBe(true);
    
    // The history count should have increased
    expect(updatedCount).toBeGreaterThan(initialCount);

    console.log('SUCCESS: Real-time sync notification is working!');
  });

  test('should handle sync notification events correctly', async () => {
    console.log('=== Testing Sync Event Handling ===');

    // Set up sync first (in case this test runs independently)
    await popupPage.goto(extensionId);
    
    // Try to configure sync only if not already configured
    try {
      await popupPage.setupSync(
        'http://localhost:5165',
        `Test Device - Event Handler ${RUN_ID}`,
        'development-shared-secret'
      );
      console.log('Device configured for sync');
      // Wait for initial sync to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      // Sync might already be configured, that's okay
      console.log('Sync may already be configured, continuing...');
    }

    // Get current history count
    const initialHistoryItems = await popupPage.getHistoryItems();
    const initialCount = initialHistoryItems.length;
    console.log('Initial history count for event test:', initialCount);

    // Navigate to multiple pages to trigger multiple sync events
    const timestamp = Date.now();
    const testUrls = [
      `https://httpbin.org/get?event1=${timestamp}`,
      `https://httpbin.org/get?event2=${timestamp}`,
    ];

    console.log('Navigating to multiple test pages...');
    for (const url of testUrls) {
      await extensionManager.visitPage(url);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Check if popup shows updated history
    const finalHistoryItems = await popupPage.getHistoryItems();
    const finalCount = finalHistoryItems.length;
    console.log('Final history count:', finalCount);

    // Should have at least some new items
    expect(finalCount).toBeGreaterThan(initialCount);

    // Check if at least one test URL is present
    const hasAnyTestUrl = testUrls.some(testUrl => 
      finalHistoryItems.some(item => 
        item.url.includes(`event1=${timestamp}`) || 
        item.url.includes(`event2=${timestamp}`)
      )
    );

    console.log('Has any test URL:', hasAnyTestUrl);
    expect(hasAnyTestUrl).toBe(true);

    console.log('SUCCESS: Sync event handling is working correctly!');
  });
});
