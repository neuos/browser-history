import { SyncClient } from './SyncClient'
import type { SyncEvent, DeviceInfo } from './types'
import type { HistoryNode, Page } from '@/lib/HistoryTree/HistoryNode'

export interface SyncServiceCallbacks {
  onSyncEventsApplied?: (eventCount: number) => void;
}

export class SyncService {
  private syncClient: SyncClient
  private isInitialized = false

  constructor(callbacks: SyncServiceCallbacks = {}) {
    this.syncClient = new SyncClient({
      onSyncEventsApplied: callbacks.onSyncEventsApplied
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('SyncService: Initializing...')
      await this.syncClient.loadConfig()
      
      if (await this.syncClient.isConfigured()) {
        console.log('SyncService: Sync is configured, attempting to connect...')
        try {
          await this.syncClient.connect()
          console.log('SyncService: Connected successfully')
        } catch (error) {
          console.warn('SyncService: Connection failed during initialization:', error)
        }
      } else {
        console.log('SyncService: Sync not configured')
      }

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
    console.log('SyncService: syncHistoryNodeCreated called for:', node.url)
    
    if (!(await this.syncClient.isConfigured())) {
      console.log('SyncService: Sync not configured, skipping history node sync')
      return
    }

    console.log('SyncService: Creating sync event for history node:', node.id)
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

    console.log('SyncService: Submitting history sync event:', event)
    await this.syncClient.submitSyncEvent(event)
  }

  async syncHistoryNodeUpdated(node: HistoryNode): Promise<void> {
    if (!(await this.syncClient.isConfigured())) return

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
    console.log('SyncService: syncPageCreated called for:', page.url)
    
    if (!(await this.syncClient.isConfigured())) {
      console.log('SyncService: Sync not configured, skipping page sync')
      return
    }

    console.log('SyncService: Creating sync event for page:', page.url)
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

    console.log('SyncService: Submitting page sync event:', event)
    await this.syncClient.submitSyncEvent(event)
  }

  async syncPageUpdated(page: Page): Promise<void> {
    console.log('SyncService: syncPageUpdated called for:', page.url)
    
    if (!(await this.syncClient.isConfigured())) {
      console.log('SyncService: Sync not configured, skipping page update sync')
      return
    }

    console.log('SyncService: Creating sync event for page update:', page.url)
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

    console.log('SyncService: Submitting page update sync event:', event)
    await this.syncClient.submitSyncEvent(event)
  }

  // Status and management
  async isConfigured(): Promise<boolean> {
    return await this.syncClient.isConfigured()
  }

  getStatus() {
    return this.syncClient.getStatus()
  }

  async performFullSync(): Promise<void> {
    console.log('SyncService: Full sync requested')
    await this.syncClient.performFullSync()
  }

  async getDeviceInfo(): Promise<DeviceInfo | null> {
    return await this.syncClient.getDeviceInfo()
  }

  async disconnect(): Promise<void> {
    this.syncClient.disconnect()
  }

  async clearConfiguration(): Promise<void> {
    await browser.storage.local.remove(['syncConfig', 'deviceInfo'])
    await this.syncClient.clearConfiguration()
  }

  async resetSyncTimestamp(): Promise<void> {
    console.log('SyncService: Resetting sync timestamp')
    await this.syncClient.resetLastDownloadTimestamp()
  }
}

// Factory function to create sync service with callbacks
export function createSyncService(callbacks: SyncServiceCallbacks = {}): SyncService {
  return new SyncService(callbacks)
}

// Default singleton instance (without callbacks)
export const syncService = new SyncService()
