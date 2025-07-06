import { type Page, type BrowserContext } from '@playwright/test';

export class ExtensionTestUtils {
  constructor(private context: BrowserContext, private extensionId: string) {}

  static async create(context: BrowserContext): Promise<ExtensionTestUtils> {
    const extensionId = await ExtensionTestUtils.getExtensionId(context);
    return new ExtensionTestUtils(context, extensionId);
  }

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

  async openPopup(): Promise<Page> {
    console.log(`Opening extension popup: chrome-extension://${this.extensionId}/popup.html`);
    const popupPage = await this.context.newPage();
    
    try {
      await popupPage.goto(`chrome-extension://${this.extensionId}/popup.html`);
      await popupPage.waitForLoadState('domcontentloaded');
      
      // Wait for the Svelte app to initialize
      await popupPage.waitForSelector('.header', { timeout: 10000 });
      console.log('Extension popup loaded successfully');
      
      return popupPage;
    } catch (error) {
      console.error('Failed to open popup:', error);
      await popupPage.close();
      throw error;
    }
  }

  async setupSync(serverUrl: string, deviceName: string, sharedSecret: string): Promise<void> {
    const popupPage = await this.openPopup();
    
    try {
      // Wait for the page to fully load
      await popupPage.waitForLoadState('domcontentloaded');
      await popupPage.waitForTimeout(1000); // Give Svelte time to render
      
      // Open sync status panel
      console.log('Clicking sync status button...');
      await popupPage.locator('.sync-status-btn').click();
      await popupPage.waitForSelector('.sync-status-panel', { timeout: 5000 });
      
      // Wait for setup form to be visible (should show automatically if not configured)
      console.log('Waiting for setup form...');
      await popupPage.waitForSelector('.setup-form', { timeout: 5000 });
      
      // Fill out setup form using IDs (more reliable than placeholders)
      console.log('Filling form fields...');
      await popupPage.locator('#serverUrl').fill(serverUrl);
      await popupPage.locator('#deviceName').fill(deviceName);
      await popupPage.locator('#sharedSecret').fill(sharedSecret);
      
      // Submit setup - look for the primary button with "Setup Sync" text
      console.log('Clicking setup button...');
      await popupPage.locator('button.primary-btn').click();
      
      // Wait for setup to complete - check that status changes from "Not Configured"
      console.log('Waiting for setup completion...');
      // Instead of waitForFunction, let's wait for the status text to change
      // by checking the button text directly
      let attempts = 0;
      while (attempts < 40) { // 20 seconds total
        try {
          const statusText = await popupPage.locator('.sync-status-btn').textContent();
          if (statusText && !statusText.includes('Not Configured')) {
            console.log('Setup completed successfully');
            break;
          }
        } catch (error) {
          // Continue checking
        }
        await popupPage.waitForTimeout(500);
        attempts++;
      }
      
      if (attempts >= 40) {
        throw new Error('Setup did not complete within timeout');
      }
    } catch (error) {
      console.error('Setup failed:', error);
      // Take a screenshot for debugging
      await popupPage.screenshot({ path: 'debug-setup-failure.png' });
      throw error;
    } finally {
      await popupPage.close();
    }
  }

  async getSyncStatus(): Promise<{ text: string; color: string }> {
    const popupPage = await this.openPopup();
    
    try {
      const statusButton = popupPage.locator('.sync-status-btn');
      const text = await statusButton.textContent() || '';
      const style = await statusButton.getAttribute('style') || '';
      
      // Extract color from style
      const colorMatch = style.match(/background-color:\s*([^;]+)/);
      const color = colorMatch ? colorMatch[1].trim() : '';
      
      return { text, color };
    } finally {
      await popupPage.close();
    }
  }

  async getHistoryItems(): Promise<Array<{ url: string; title: string; timestamp: string }>> {
    const popupPage = await this.openPopup();
    
    try {
      console.log('Waiting for history list to load...');
      
      // Wait for either history list or empty state
      await Promise.race([
        popupPage.waitForSelector('.history-list', { timeout: 10000 }),
        popupPage.waitForSelector('.empty-state', { timeout: 10000 })
      ]);
      
      // Check if we have history items
      const historyItems = popupPage.locator('.history-item');
      const count = await historyItems.count();
      console.log(`Found ${count} history items`);
      
      if (count === 0) {
        console.log('No history items found');
        return [];
      }
      
      const items: Array<{ url: string; title: string; timestamp: string }> = [];
      
      for (let i = 0; i < count; i++) {
        const item = historyItems.nth(i);
        const url = await item.locator('.history-item-url').textContent() || '';
        const title = await item.locator('.history-item-title').textContent() || '';
        const timestamp = await item.locator('.history-item-time').textContent() || '';
        
        items.push({ url, title, timestamp });
      }
      
      console.log('Retrieved history items:', items);
      return items;
    } catch (error) {
      console.error('Error getting history items:', error);
      return [];
    } finally {
      await popupPage.close();
    }
  }

  async disconnect(): Promise<void> {
    const popupPage = await this.openPopup();
    
    try {
      console.log('Opening sync status panel for disconnect...');
      
      // Open sync status panel
      await popupPage.locator('.sync-status-btn').click();
      await popupPage.waitForSelector('.sync-status-panel', { timeout: 5000 });
      
      // Take a screenshot to see what's available
      await popupPage.screenshot({ path: 'debug-disconnect-panel.png' });
      console.log('Screenshot saved as debug-disconnect-panel.png');
      
      // Log all visible buttons for debugging
      const allButtons = await popupPage.locator('button').all();
      console.log('All buttons found:');
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].textContent();
        const buttonClass = await allButtons[i].getAttribute('class');
        console.log(`  ${i}: "${buttonText}" (class: ${buttonClass})`);
      }
      
      // Look for disconnect/clear button - it might have different text
      console.log('Looking for disconnect button...');
      
      // Try different possible selectors for the disconnect button
      const disconnectSelectors = [
        'button.danger-btn',  // The actual class based on the Svelte component
        'button:has-text("Disconnect")',
        'button:has-text("Clear")', 
        'button:has-text("Remove")',
        '.secondary-btn:has-text("Clear")',
        'button.secondary-btn'
      ];
      
      let foundSelector = '';
      for (const selector of disconnectSelectors) {
        try {
          const testButton = popupPage.locator(selector);
          if (await testButton.count() > 0) {
            console.log(`Found disconnect button with selector: ${selector}`);
            foundSelector = selector;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!foundSelector) {
        throw new Error('Disconnect button not found');
      }
      
      console.log('Clicking disconnect button...');
      
      // Set up dialog handler before clicking the button
      popupPage.on('dialog', async dialog => {
        console.log('Dialog appeared:', dialog.message());
        await dialog.accept();
      });
      
      await popupPage.locator(foundSelector).click();
      
      // Wait for disconnect to complete by polling the status
      console.log('Waiting for disconnect to complete...');
      let attempts = 0;
      while (attempts < 20) { // 10 seconds total
        try {
          const statusText = await popupPage.locator('.sync-status-btn').textContent();
          if (statusText && statusText.includes('Not Configured')) {
            console.log('Disconnect completed successfully');
            break;
          }
        } catch (error) {
          // Continue checking
        }
        await popupPage.waitForTimeout(500);
        attempts++;
      }
      
      if (attempts >= 20) {
        throw new Error('Disconnect did not complete within timeout');
      }
    } finally {
      await popupPage.close();
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

export class BackendTestUtils {
  constructor(private baseUrl: string = 'http://localhost:8000') {}

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return false;
      
      const health = await response.json();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  async getEvents(token?: string): Promise<any[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}/sync/events?since=0`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      
      const result = await response.json();
      return result.events || [];
    } catch (error) {
      console.warn('Failed to fetch events from backend:', error);
      return [];
    }
  }

  async clearEvents(token?: string): Promise<void> {
    // This would require implementing a clear/reset endpoint on the backend
    // For now, we'll just log that this functionality is needed
    console.log('Backend event clearing not implemented');
  }
}
