import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { ExtensionManager, ExtensionPopupPage, BackendApi } from './pages';

// Shared context and extension ID across all tests
let sharedContext: BrowserContext | null = null;
let sharedExtensionId: string | null = null;

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  extensionManager: ExtensionManager;
  popupPage: ExtensionPopupPage;
  backendApi: BackendApi;
}>({
  context: async ({}, use) => {
    if (!sharedContext) {
      const pathToExtension = path.join(__dirname, '..', 'extension', '.output', 'chrome-mv3');
      sharedContext = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        // Headless by default (Chromium's "new" headless mode supports --load-extension) so
        // this doesn't pop a visible, focus-stealing browser window on whoever's machine is
        // running it. Set PLAYWRIGHT_HEADED=true (bun run test:e2e:headed does this) to watch it.
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

  extensionManager: async ({ context }, use) => {
    const manager = new ExtensionManager(context);
    await use(manager);
  },

  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    const popupPage = new ExtensionPopupPage(page);
    await popupPage.goto(extensionId);
    
    await use(popupPage);
    
    await page.close();
  },

  backendApi: async ({}, use) => {
    const api = new BackendApi();
    await use(api);
  },
});

export const expect = test.expect;
