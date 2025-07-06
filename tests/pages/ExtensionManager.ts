import { type BrowserContext, type Page } from '@playwright/test';

export class ExtensionManager {
  constructor(private context: BrowserContext) {}

  static async getExtensionId(context: BrowserContext): Promise<string> {
    // Method 1: Get extension ID from service worker (Manifest v3 approach)
    let serviceWorkers = context.serviceWorkers();
    
    if (serviceWorkers.length === 0) {
      // Wait for service worker to be created
      const serviceWorker = await context.waitForEvent('serviceworker');
      serviceWorkers = [serviceWorker];
    }
    
    for (const serviceWorker of serviceWorkers) {
      const url = serviceWorker.url();
      if (url.startsWith('chrome-extension://')) {
        const extensionId = url.split('/')[2];
        return extensionId;
      }
    }
    
    // Method 2: Check background pages (Manifest v2 fallback)
    let backgroundPages = context.backgroundPages();
    
    if (backgroundPages.length === 0) {
      // Wait for background page to be created
      const backgroundPage = await context.waitForEvent('backgroundpage');
      backgroundPages = [backgroundPage];
    }
    
    for (const backgroundPage of backgroundPages) {
      const url = backgroundPage.url();
      if (url.startsWith('chrome-extension://')) {
        const extensionId = url.split('/')[2];
        return extensionId;
      }
    }
    
    throw new Error('Extension ID not found');
  }

  async createPopupPage(extensionId: string): Promise<Page> {
    const popupPage = await this.context.newPage();
    
    try {
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      await popupPage.waitForLoadState('domcontentloaded');
      return popupPage;
    } catch (error) {
      await popupPage.close();
      throw error;
    }
  }

  async visitPage(url: string): Promise<void> {
    const testPage = await this.context.newPage();
    
    try {
      await testPage.goto(url);
      await testPage.waitForLoadState('networkidle');
      // Wait for extension to capture the navigation
      await testPage.waitForTimeout(2000);
    } finally {
      await testPage.close();
    }
  }
}
