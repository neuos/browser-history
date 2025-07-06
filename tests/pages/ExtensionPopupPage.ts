import { type Page, type Locator, expect } from '@playwright/test';

export class ExtensionPopupPage {
  readonly page: Page;
  readonly header: Locator;
  readonly syncStatusButton: Locator;
  readonly syncStatusPanel: Locator;
  readonly setupForm: Locator;
  readonly serverUrlInput: Locator;
  readonly deviceNameInput: Locator;
  readonly sharedSecretInput: Locator;
  readonly setupButton: Locator;
  readonly disconnectButton: Locator;
  readonly historyList: Locator;
  readonly historyItems: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Header and main elements
    this.header = this.page.locator('.header');
    
    // Sync status elements
    this.syncStatusButton = this.page.locator('.sync-status-btn');
    this.syncStatusPanel = this.page.locator('.sync-status-panel');
    
    // Setup form elements
    this.setupForm = this.page.locator('.setup-form');
    this.serverUrlInput = this.page.locator('#serverUrl');
    this.deviceNameInput = this.page.locator('#deviceName');
    this.sharedSecretInput = this.page.locator('#sharedSecret');
    this.setupButton = this.page.locator('button.primary-btn');
    
    // Disconnect elements
    this.disconnectButton = this.page.locator('button.danger-btn');
    
    // History elements
    this.historyList = this.page.locator('.history-list');
    this.historyItems = this.page.locator('.history-item');
    this.emptyState = this.page.locator('.empty-state');
  }

  async goto(extensionId: string): Promise<void> {
    console.log(`Opening extension popup: chrome-extension://${extensionId}/popup.html`);
    await this.page.goto(`chrome-extension://${extensionId}/popup.html`);
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for the Svelte app to initialize
    await this.header.waitFor({ timeout: 10000 });
    console.log('Extension popup loaded successfully');
  }

  async openSyncStatusPanel(): Promise<void> {
    console.log('Clicking sync status button...');
    await this.syncStatusButton.click();
    await this.syncStatusPanel.waitFor({ timeout: 5000 });
  }

  async fillSetupForm(serverUrl: string, deviceName: string, sharedSecret: string): Promise<void> {
    console.log('Waiting for setup form...');
    await this.setupForm.waitFor({ timeout: 5000 });
    
    console.log('Filling form fields...');
    await this.serverUrlInput.fill(serverUrl);
    await this.deviceNameInput.fill(deviceName);
    await this.sharedSecretInput.fill(sharedSecret);
  }

  async submitSetup(): Promise<void> {
    console.log('Clicking setup button...');
    await this.setupButton.click();
  }

  async waitForSetupCompletion(): Promise<void> {
    console.log('Waiting for setup completion...');
    
    let attempts = 0;
    while (attempts < 40) { // 20 seconds total
      try {
        const statusText = await this.syncStatusButton.textContent();
        if (statusText && !statusText.includes('Not Configured')) {
          console.log('Setup completed successfully');
          return;
        }
      } catch (error) {
        // Continue checking
      }
      await this.page.waitForTimeout(500);
      attempts++;
    }
    
    throw new Error('Setup did not complete within timeout');
  }

  async getSyncStatus(): Promise<{ text: string; color: string }> {
    const text = await this.syncStatusButton.textContent() || '';
    const style = await this.syncStatusButton.getAttribute('style') || '';
    
    // Extract color from style
    const colorMatch = style.match(/background-color:\s*([^;]+)/);
    const color = colorMatch ? colorMatch[1].trim() : '';
    
    return { text, color };
  }

  async performDisconnect(): Promise<void> {
    console.log('Opening sync status panel for disconnect...');
    await this.openSyncStatusPanel();
    
    // Take a screenshot to see what's available
    await this.page.screenshot({ path: 'debug-disconnect-panel.png' });
    console.log('Screenshot saved as debug-disconnect-panel.png');
    
    // Log all visible buttons for debugging
    const allButtons = await this.page.locator('button').all();
    console.log('All buttons found:');
    for (let i = 0; i < allButtons.length; i++) {
      const buttonText = await allButtons[i].textContent();
      const buttonClass = await allButtons[i].getAttribute('class');
      console.log(`  ${i}: "${buttonText}" (class: ${buttonClass})`);
    }
    
    console.log('Looking for disconnect button...');
    
    // Try different possible selectors for the disconnect button
    const disconnectSelectors = [
      'button.danger-btn',
      'button:has-text("Disconnect")',
      'button:has-text("Clear")', 
      'button:has-text("Remove")',
      '.secondary-btn:has-text("Clear")',
      'button.secondary-btn'
    ];
    
    let foundSelector = '';
    for (const selector of disconnectSelectors) {
      try {
        const testButton = this.page.locator(selector);
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
    this.page.on('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.message());
      await dialog.accept();
    });
    
    await this.page.locator(foundSelector).click();
  }

  async waitForDisconnectCompletion(): Promise<void> {
    console.log('Waiting for disconnect to complete...');
    
    let attempts = 0;
    while (attempts < 20) { // 10 seconds total
      try {
        const statusText = await this.syncStatusButton.textContent();
        if (statusText && statusText.includes('Not Configured')) {
          console.log('Disconnect completed successfully');
          return;
        }
      } catch (error) {
        // Continue checking
      }
      await this.page.waitForTimeout(500);
      attempts++;
    }
    
    throw new Error('Disconnect did not complete within timeout');
  }

  async getHistoryItems(): Promise<Array<{ url: string; title: string; timestamp: string }>> {
    console.log('Waiting for history list to load...');
    
    // Wait for either history list or empty state
    await Promise.race([
      this.historyList.waitFor({ timeout: 10000 }),
      this.emptyState.waitFor({ timeout: 10000 })
    ]);
    
    // Check if we have history items
    const count = await this.historyItems.count();
    console.log(`Found ${count} history items`);
    
    if (count === 0) {
      console.log('No history items found');
      return [];
    }
    
    const items: Array<{ url: string; title: string; timestamp: string }> = [];
    
    for (let i = 0; i < count; i++) {
      const item = this.historyItems.nth(i);
      const url = await item.locator('.history-item-url').textContent() || '';
      const title = await item.locator('.history-item-title').textContent() || '';
      const timestamp = await item.locator('.history-item-time').textContent() || '';
      
      items.push({ url, title, timestamp });
    }
    
    console.log('Retrieved history items:', items);
    return items;
  }

  async isConfigured(): Promise<boolean> {
    const status = await this.getSyncStatus();
    return !status.text.includes('Not Configured');
  }

  async setupSync(serverUrl: string, deviceName: string, sharedSecret: string): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Give Svelte time to render
    
    await this.openSyncStatusPanel();
    await this.fillSetupForm(serverUrl, deviceName, sharedSecret);
    await this.submitSetup();
    await this.waitForSetupCompletion();
  }

  async disconnect(): Promise<void> {
    await this.performDisconnect();
    await this.waitForDisconnectCompletion();
  }

  async takeDebugScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ path: filename });
    console.log(`Screenshot saved as ${filename}`);
  }
}
