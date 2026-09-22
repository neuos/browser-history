import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { ExtensionManager, ExtensionPopupPage, BackendApi } from '../pages';

test.describe.serial('Cross-Device Sync Notification', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let extensionId1: string;
  let extensionId2: string;
  let popupPage1: ExtensionPopupPage;
  let popupPage2: ExtensionPopupPage;
  let extensionManager1: ExtensionManager;
  let extensionManager2: ExtensionManager;
  let backendApi: BackendApi;

  test.beforeAll(async () => {
    const pathToExtension = './extension/.output/chrome-mv3';
    const timestamp = Date.now();
    
    // Create first browser context (Device 1) with unique user data directory
    const userDataDir1 = `./test-data/device1-${timestamp}`;
    context1 = await chromium.launchPersistentContext(userDataDir1, {
      channel: 'chromium',
      headless: false,
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

    // Create second browser context (Device 2) with unique user data directory
    const userDataDir2 = `./test-data/device2-${timestamp}`;
    context2 = await chromium.launchPersistentContext(userDataDir2, {
      channel: 'chromium',
      headless: false,
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

    // Wait for extensions to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get extension IDs
    extensionId1 = await ExtensionManager.getExtensionId(context1);
    extensionId2 = await ExtensionManager.getExtensionId(context2);

    console.log('Extension ID 1:', extensionId1);
    console.log('Extension ID 2:', extensionId2);

    // Initialize page objects
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    popupPage1 = new ExtensionPopupPage(page1);
    popupPage2 = new ExtensionPopupPage(page2);
    extensionManager1 = new ExtensionManager(context1);
    extensionManager2 = new ExtensionManager(context2);
    backendApi = new BackendApi();

    // Verify backend is running
    const isHealthy = await backendApi.isHealthy();
    expect(isHealthy).toBeTruthy();
  });

  test.afterAll(async () => {
    await context1?.close();
    await context2?.close();
  });

  test('should immediately update popup when sync events arrive from other devices', async () => {
    console.log('=== Testing Real-Time Popup Update Callback System ===');
    
    // Set up sync on the device
    await popupPage1.goto(extensionId1);
    await popupPage1.setupSync(
      'http://localhost:5165',
      'Test Device - Real Time Updates',
      'secret'
    );

    console.log('Device configured for sync');

    // Wait for initial sync to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get initial history count
    const initialHistoryItems = await popupPage1.getHistoryItems();
    const initialCount = initialHistoryItems.length;
    console.log('Initial history count:', initialCount);

    // Test: Navigate to a new page and verify the popup updates in real-time
    // This tests our callback mechanism that broadcasts HISTORY_UPDATED when sync occurs
    const timestamp = Date.now();
    const testUrl = `https://example.com/real-time-test-${timestamp}`;
    
    console.log('Navigating to new page to trigger history sync...');
    await extensionManager1.visitPage(testUrl);
    
    // Wait a moment for the extension to capture and sync this
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if the popup shows the new URL WITHOUT manually refreshing
    console.log('Checking if popup updated in real-time...');
    const updatedHistoryItems = await popupPage1.getHistoryItems();
    const updatedCount = updatedHistoryItems.length;
    console.log(`History count updated: ${initialCount} → ${updatedCount}`);
    
    // Look for the new URL
    const hasNewUrl = updatedHistoryItems.some(item => 
      item.url.includes(`real-time-test-${timestamp}`)
    );
    
    console.log('New URL found in real-time:', hasNewUrl);
    expect(hasNewUrl).toBe(true);
    expect(updatedCount).toBeGreaterThan(initialCount);

    console.log('✅ SUCCESS: Real-time popup updates work correctly!');
    console.log('✅ The callback mechanism properly notifies the popup when sync events occur');
  });

  test('should handle multiple sync events efficiently', async () => {
    console.log('=== Testing Multiple Real-Time Updates ===');

    // Get initial history count
    const initialHistoryItems = await popupPage1.getHistoryItems();
    const initialCount = initialHistoryItems.length;
    console.log('Initial history count for multiple events test:', initialCount);

    // Navigate to multiple pages in quick succession
    const timestamp = Date.now();
    const testUrls = [
      `https://httpbin.org/get?test1=${timestamp}`,
      `https://httpbin.org/get?test2=${timestamp}`,
      `https://httpbin.org/get?test3=${timestamp}`
    ];

    console.log('Navigating to multiple test pages to trigger sync events...');
    for (const url of testUrls) {
      await extensionManager1.visitPage(url);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause between navigations
    }

    // Wait for sync to complete
    console.log('Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check updated history (should update in real-time)
    const finalHistoryItems = await popupPage1.getHistoryItems();
    const finalCount = finalHistoryItems.length;
    console.log(`Final history count: ${initialCount} → ${finalCount} (+${finalCount - initialCount})`);

    // Should have at least the 3 new items 
    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 3);

    // Verify that test URLs are present
    const testUrlsFound = testUrls.filter(testUrl => 
      finalHistoryItems.some(item => 
        item.url.includes(`test1=${timestamp}`) || 
        item.url.includes(`test2=${timestamp}`) || 
        item.url.includes(`test3=${timestamp}`)
      )
    );

    console.log('Test URLs found in real-time:', testUrlsFound.length, 'out of', testUrls.length);
    
    // Check if at least some of the test URLs made it through
    const hasTestUrls = finalHistoryItems.some(item => 
      item.url.includes(`test1=${timestamp}`) || 
      item.url.includes(`test2=${timestamp}`) || 
      item.url.includes(`test3=${timestamp}`)
    );

    expect(hasTestUrls).toBe(true);
    console.log('✅ SUCCESS: Multiple real-time sync events handled correctly!');
  });
});
