import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

// Shared context and extension ID across all tests
let sharedContext: BrowserContext | null = null;
let sharedExtensionId: string | null = null;

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    if (!sharedContext) {
      const pathToExtension = path.join(__dirname, '..', 'extension', '.output', 'chrome-mv3');
      sharedContext = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        headless: false, // Show browser window
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
      
      // Wait a bit for the extension to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await use(sharedContext);
    // Don't close the context here - let it persist across tests
  },
  extensionId: async ({ context }, use) => {
    if (!sharedExtensionId) {
      // Wait for service worker to be available
      let attempts = 0;
      let background;
      
      while (attempts < 10) {
        [background] = context.serviceWorkers();
        if (background) break;
        
        try {
          background = await Promise.race([
            context.waitForEvent('serviceworker', { timeout: 2000 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          break;
        } catch (error) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!background) {
        throw new Error('Extension service worker not found after multiple attempts');
      }
      
      sharedExtensionId = background.url().split('/')[2];
    }
    
    await use(sharedExtensionId!);
  },
});

export const expect = test.expect;
