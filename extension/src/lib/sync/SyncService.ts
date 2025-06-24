import { SyncClient } from './SyncClient'
import type { SyncEvent } from './types'
import type { HistoryNode, Page } from '@/lib/HistoryTree/HistoryNode'

export class SyncService {
  private syncClient: SyncClient
  private isInitialized = false

  constructor() {
    this.syncClient = new SyncClient()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.syncClient.loadConfig()
      
      if (this.syncClient.isConfigured()) {
        await this.syncClient.connect()
      }

      // Listen for sync events from other devices
      browser.runtime.onMessage.addListener((message) => {
        if (message.type === 'SYNC_EVENT_RECEIVED') {
          this.handleIncomingSyncEvent(message.event)
        }
      })

      this.isInitialized = true
      console.log('Sync service initialized')
    } catch (error) {
      console.error('Failed to initialize sync service:', error)
    }
  }

  // Configuration
  async setupSync(serverUrl: string, deviceName: string, sharedSecret: string): Promise<void> {
    try {
      const deviceInfo = await this.syncClient.registerDevice(serverUrl, deviceName, sharedSecret)
      await this.syncClient.connect()
      
      console.log('Sync setup completed for device:', deviceInfo.deviceId)
    } catch (error) {
      console.error('Sync setup failed:', error)
      throw error
    }
  }

  // History sync
  async syncHistoryNodeCreated(node: HistoryNode): Promise<void> {
    if (!this.syncClient.isConfigured()) return

    const event: SyncEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'CREATE',
      entityType: 'history',
      entityId: node.id,
      data: {
        id: node.id,
        deviceId: node.deviceId,
        url: node.url,
        tabId: node.tabId,
        timestamp: node.timestamp.getTime(),
        navigationSourceId: node.navigationSourceID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    await this.syncClient.submitSyncEvent(event)
  }

  async syncHistoryNodeUpdated(node: HistoryNode): Promise<void> {
    if (!this.syncClient.isConfigured()) return

    const event: SyncEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'UPDATE',
      entityType: 'history',
      entityId: node.id,
      data: {
        id: node.id,
        deviceId: node.deviceId,
        url: node.url,
        tabId: node.tabId,
        timestamp: node.timestamp.getTime(),
        navigationSourceId: node.navigationSourceID,
        updatedAt: Date.now(),
      },
    }

    await this.syncClient.submitSyncEvent(event)
  }

  // Page sync
  async syncPageCreated(page: Page): Promise<void> {
    if (!this.syncClient.isConfigured()) return

    const event: SyncEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'CREATE',
      entityType: 'page',
      entityId: page.url,
      data: {
        url: page.url,
        title: page.title,
        favicon: page.favicon,
        metadata: page.metadata,
        lastUpdate: page.lastUpdate.getTime(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    await this.syncClient.submitSyncEvent(event)
  }

  async syncPageUpdated(page: Page): Promise<void> {
    if (!this.syncClient.isConfigured()) return

    const event: SyncEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'UPDATE',
      entityType: 'page',
      entityId: page.url,
      data: {
        url: page.url,
        title: page.title,
        favicon: page.favicon,
        metadata: page.metadata,
        lastUpdate: page.lastUpdate.getTime(),
        updatedAt: Date.now(),
      },
    }

    await this.syncClient.submitSyncEvent(event)
  }

  // Handle incoming sync events
  private async handleIncomingSyncEvent(event: SyncEvent): Promise<void> {
    try {
      console.log('Processing incoming sync event:', event)

      // Broadcast to other parts of the extension
      browser.runtime.sendMessage({
        type: 'APPLY_SYNC_EVENT',
        event,
      })
    } catch (error) {
      console.error('Failed to handle incoming sync event:', error)
    }
  }

  // Status and management
  isConfigured(): boolean {
    return this.syncClient.isConfigured()
  }

  getStatus() {
    return this.syncClient.getStatus()
  }

  getDeviceInfo() {
    return this.syncClient.getDeviceInfo()
  }

  async disconnect(): Promise<void> {
    this.syncClient.disconnect()
  }

  async clearConfiguration(): Promise<void> {
    await browser.storage.local.remove(['syncConfig', 'deviceInfo'])
    this.syncClient.disconnect()
  }
}

// Singleton instance
export const syncService = new SyncService()
