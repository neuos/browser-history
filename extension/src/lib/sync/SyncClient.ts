import type { SyncConfig, DeviceInfo, SyncEvent, SyncStatus } from './types'
import { HistoryRepositoryIndexedDB } from '@/lib/HistoryTree/HistoryRepositoryIndexedDB'
import { PageRepositoryIndexedDB } from '@/lib/HistoryTree/PageRepositoryIndexedDB'
import { HistoryNode } from '@/lib/HistoryTree/HistoryNode'
import { Page } from '@/lib/HistoryTree/HistoryNode'

export interface SyncClientCallbacks {
  onSyncEventsApplied?: (eventCount: number) => void;
}

export class SyncClient {
  private config: SyncConfig | null = null
  private deviceInfo: DeviceInfo | null = null
  private eventSource: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectionCheckTimer: ReturnType<typeof setInterval> | null = null
  private eventQueue: SyncEvent[] = []
  private isProcessing = false
  private isLoaded = false
  private loadingPromise: Promise<void> | null = null
  private successfulSyncs = 0
  private lastSyncTime = 0
  private lastDownloadTimestamp = 0
  private callbacks: SyncClientCallbacks
  
  // Repository instances for direct access
  private historyRepository = new HistoryRepositoryIndexedDB()
  private pageRepository = new PageRepositoryIndexedDB()

  constructor(callbacks: SyncClientCallbacks = {}) {
    this.callbacks = callbacks
    // Don't load config in constructor - let it be loaded explicitly
  }

  // Configuration management
  async loadConfig(): Promise<void> {
    console.log('SyncClient: loadConfig called, isLoaded:', this.isLoaded, 'loadingPromise:', !!this.loadingPromise)
    
    // If already loaded, return immediately
    if (this.isLoaded) return
    
    // If already loading, wait for the existing promise
    if (this.loadingPromise) {
      console.log('SyncClient: Already loading config, waiting for existing promise...')
      return this.loadingPromise
    }
    
    // Start loading
    this.loadingPromise = this._doLoadConfig()
    
    try {
      await this.loadingPromise
    } finally {
      this.loadingPromise = null
    }
  }
  
  private async _doLoadConfig(): Promise<void> {
    try {
      console.log('SyncClient: Loading config from browser storage...')
      const result = await browser.storage.local.get(['syncConfig', 'deviceInfo', 'lastDownloadTimestamp'])
      console.log('SyncClient: Storage result:', { 
        hasSyncConfig: !!result.syncConfig, 
        hasDeviceInfo: !!result.deviceInfo,
        lastDownloadTimestamp: result.lastDownloadTimestamp,
        syncConfig: result.syncConfig,
        deviceInfo: result.deviceInfo 
      })
      this.config = result.syncConfig || null
      this.deviceInfo = result.deviceInfo || null
      this.lastDownloadTimestamp = result.lastDownloadTimestamp || 0
      this.isLoaded = true
      
      console.log('SyncClient: Loaded config:', !!this.config, 'deviceInfo:', !!this.deviceInfo, 'lastDownload:', this.lastDownloadTimestamp)
      
      if (this.config && this.deviceInfo) {
        try {
          await this.connect()
          console.log('SyncClient: Connected successfully during config load')
        } catch (connectError) {
          console.warn('SyncClient: Connection failed during config load, will retry later:', connectError)
          // Don't throw - we can still try to sync later
        }
      }
    } catch (error) {
      console.error('Failed to load sync config:', error)
      this.isLoaded = true // Mark as loaded even on error to prevent infinite retry loops
    }
  }

  async saveConfig(config: SyncConfig): Promise<void> {
    this.config = config
    await browser.storage.local.set({ syncConfig: config })
  }

  async saveDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    this.deviceInfo = deviceInfo
    await browser.storage.local.set({ deviceInfo })
  }

  async saveLastDownloadTimestamp(timestamp: number): Promise<void> {
    this.lastDownloadTimestamp = timestamp
    await browser.storage.local.set({ lastDownloadTimestamp: timestamp })
  }

  // Device registration
  async registerDevice(serverUrl: string, deviceName: string, sharedSecret: string): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/auth/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceName,
          secret: sharedSecret,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      const data = await response.json()
      const deviceInfo: DeviceInfo = {
        deviceId: data.deviceId,
        deviceName,
        token: data.token,
        expiresIn: data.expiresIn,
        registeredAt: Date.now(),
      }

      await this.saveDeviceInfo(deviceInfo)
      await this.saveConfig({ serverUrl, deviceName, sharedSecret, token: data.token })

      console.log('Device registered successfully:', deviceInfo.deviceId)
      return deviceInfo
    } catch (error) {
      console.error('Device registration failed:', error)
      throw error
    }
  }

  // Token management
  async refreshToken(): Promise<void> {
    if (!this.config || !this.deviceInfo) {
      throw new Error('No configuration or device info available')
    }

    try {
      const response = await fetch(`${this.config.serverUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deviceInfo.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      
      this.deviceInfo.token = data.token
      this.deviceInfo.expiresIn = data.expiresIn
      
      this.config.token = data.token
      
      await this.saveDeviceInfo(this.deviceInfo)
      await this.saveConfig(this.config)

      console.log('Token refreshed successfully')
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  // Connection management
  async connect(): Promise<void> {
    if (!this.config || !this.deviceInfo) {
      throw new Error('No configuration available')
    }

    try {
      // First, try to refresh token if it's close to expiry
      const tokenAge = Date.now() - this.deviceInfo.registeredAt
      const tokenLifetime = this.deviceInfo.expiresIn * 1000
      
      if (tokenAge > tokenLifetime * 0.8) { // Refresh when 80% expired
        await this.refreshToken()
      }

      // Try to connect SSE (but don't fail if it doesn't work)
      try {
        await this.connectSSE()
        console.log('SyncClient: SSE connected successfully')
      } catch (sseError) {
        console.warn('SyncClient: SSE connection failed, but HTTP sync will still work:', sseError)
      }
      
      // Sync pending events
      await this.performBidirectionalSync()
      
      // Start periodic connection check
      this.startConnectionMonitoring()
      
    } catch (error) {
      console.error('Connection failed:', error)
      this.scheduleReconnect()
      throw error
    }
  }

  private async connectSSE(): Promise<void> {
    if (!this.config || !this.deviceInfo) return

    return new Promise((resolve, reject) => {
      const sseUrl = `${this.config!.serverUrl}/api/v1/sse/events`
      
      // Create EventSource with authentication token as query parameter
      const urlWithAuth = `${sseUrl}?token=${encodeURIComponent(this.deviceInfo!.token)}`
      
      this.eventSource = new EventSource(urlWithAuth)
      
      this.eventSource.onopen = () => {
        console.log('SSE connected')
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        resolve()
      }

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        // Handle reconnection on close
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('SSE disconnected')
          this.eventSource = null
          this.scheduleReconnect()
        }
        reject(error)
      }

      this.eventSource.onmessage = (event) => {
        this.handleSSEMessage(event.data)
      }
    })
  }

  private handleSSEMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      switch (message.type) {
        case 'sync_event':
          this.applySyncEvent(message.data).then(() => {
            console.log('SSE: Applied sync event, notifying callback')
            this.callbacks.onSyncEventsApplied?.(1)
          }).catch(error => {
            console.error('SSE: Failed to apply sync event:', error)
          })
          break
        case 'sync_batch':
          const eventCount = message.data.events.length
          Promise.all(message.data.events.map((event: SyncEvent) => this.applySyncEvent(event)))
            .then(() => {
              console.log('SSE: Applied sync batch, notifying callback:', eventCount)
              this.callbacks.onSyncEventsApplied?.(eventCount)
            }).catch(error => {
              console.error('SSE: Failed to apply sync batch:', error)
            })
          break
        case 'ping':
          // SSE doesn't need pong response - just log that we're alive
          console.log('SSE ping received')
          break
        case 'connected':
          console.log('SSE connection confirmed for device:', message.data.deviceId)
          break
      }
    } catch (error) {
      console.error('Failed to handle SSE message:', error)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
        console.log('SyncClient: Reconnection successful')
      } catch (error) {
        console.error('SyncClient: Reconnection failed, will retry:', error)
        this.scheduleReconnect()
      }
    }, 5000) // Retry every 5 seconds
  }

  private startConnectionMonitoring(): void {
    // Clear any existing timer
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer)
    }
    
    // Check connection every 30 seconds
    this.connectionCheckTimer = setInterval(async () => {
      if (!this.config || !this.deviceInfo) return
      
      // Check if SSE connection is broken
      const isSSEConnected = this.eventSource?.readyState === EventSource.OPEN
      
      if (!isSSEConnected && !this.reconnectTimer) {
        console.log('SyncClient: Connection monitor detected SSE disconnection, attempting reconnect...')
        try {
          await this.connectSSE()
        } catch (error) {
          console.warn('SyncClient: Background SSE reconnection failed:', error)
          this.scheduleReconnect()
        }
      }
    }, 30000) // Check every 30 seconds
  }

  // Event synchronization
  async submitSyncEvent(event: SyncEvent): Promise<void> {
    console.log('SyncClient: Submitting sync event:', event.eventType, event.entityType, event.entityId)
    
    // Add to queue
    this.eventQueue.push(event)
    console.log('SyncClient: Event queue length:', this.eventQueue.length)
    
    // Try to sync immediately (both upload and download)
    await this.performBidirectionalSync()
  }

  // Manually trigger a full bidirectional sync (useful when opening the extension)
  async performFullSync(): Promise<void> {
    console.log('SyncClient: Manual full sync requested')
    if (!this.isLoaded) {
      console.log('SyncClient: Config not loaded, loading first...')
      await this.loadConfig()
    }
    
    if (!this.config || !this.deviceInfo) {
      console.log('SyncClient: No config available for full sync')
      return
    }
    
    await this.performBidirectionalSync()
  }

  // Perform bidirectional sync: upload pending events and download new events from other devices
  private async performBidirectionalSync(): Promise<void> {
    if (!this.config || !this.deviceInfo || this.isProcessing) {
      console.log('SyncClient: Skipping bidirectional sync - config:', !!this.config, 'deviceInfo:', !!this.deviceInfo, 'processing:', this.isProcessing)
      return
    }

    this.isProcessing = true
    console.log('SyncClient: Starting bidirectional sync...')

    try {
      // Step 1: Upload pending events (if any)
      if (this.eventQueue.length > 0) {
        console.log('SyncClient: Uploading', this.eventQueue.length, 'pending events')
        await this.uploadPendingEvents()
      }

      // Step 2: Download new events from other devices
      console.log('SyncClient: Downloading events from other devices since:', this.lastDownloadTimestamp)
      await this.downloadEventsFromOtherDevices()
      
      console.log('SyncClient: Bidirectional sync completed successfully')
    } catch (error) {
      console.error('SyncClient: Bidirectional sync failed:', error)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  private async uploadPendingEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      console.log('SyncClient: No pending events to upload')
      return
    }

    const events = [...this.eventQueue]
    this.eventQueue = []

    console.log('SyncClient: Sending events to', `${this.config!.serverUrl}/api/v1/sync/events`)
    console.log('SyncClient: Events being sent:', events.map(e => ({ id: e.id, type: e.eventType, entity: e.entityType })))
    
    // Note: deviceId is NOT sent in the request body - it's provided via JWT in Authorization header
    // This ensures security and prevents device ID spoofing
    const response = await fetch(`${this.config!.serverUrl}/api/v1/sync/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.deviceInfo!.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    })

    if (!response.ok) {
      console.error('SyncClient: Upload failed with status:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('SyncClient: Error response:', errorText)
      
      // Only put events back in queue if it's a network/auth error, not a duplicate ID error
      if (response.status !== 400 && response.status !== 409 && response.status !== 500) {
        this.eventQueue.unshift(...events)
        console.log('SyncClient: Events put back in queue for retry')
      } else {
        console.warn(`SyncClient: Events not retried due to server error (${response.status}), may be duplicate IDs`)
      }
      
      throw new Error(`Failed to upload events: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('SyncClient: Upload successful:', result)
    console.log(`SyncClient: Uploaded ${events.length} events successfully`)
    
    // Update success counters
    this.successfulSyncs += events.length
    this.lastSyncTime = Date.now()
    console.log('SyncClient: Updated counters - successfulSyncs:', this.successfulSyncs, 'lastSyncTime:', new Date(this.lastSyncTime).toLocaleString())
  }

  private async downloadEventsFromOtherDevices(): Promise<void> {
    if (!this.config || !this.deviceInfo) {
      throw new Error('No configuration available for download')
    }

    const since = this.lastDownloadTimestamp
    const url = `${this.config.serverUrl}/api/v1/sync/events?since=${since}&exclude_device=true`
    
    console.log('SyncClient: Fetching events from', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.deviceInfo.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SyncClient: Download failed:', response.status, errorText)
      throw new Error(`Failed to download events: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const events: SyncEvent[] = result.events || []
    
    console.log(`SyncClient: Downloaded ${events.length} events from other devices`)
    
    if (events.length > 0) {
      // Process each downloaded event
      for (const event of events) {
        console.log('SyncClient: Processing downloaded event:', event.eventType, event.entityType, event.entityId)
        await this.applySyncEvent(event)
      }
      
      // Notify about applied sync events
      if (this.callbacks.onSyncEventsApplied) {
        console.log('SyncClient: Notifying about applied sync events:', events.length)
        this.callbacks.onSyncEventsApplied(events.length)
      }
      
      // Update the last download timestamp to the newest event's timestamp
      const newestTimestamp = Math.max(...events.map(e => e.timestamp))
      await this.saveLastDownloadTimestamp(newestTimestamp)
      console.log('SyncClient: Updated last download timestamp to:', new Date(newestTimestamp).toLocaleString())
    } else {
      // Even if no events, update timestamp to current time to avoid re-fetching the same range
      const now = Date.now()
      await this.saveLastDownloadTimestamp(now)
      console.log('SyncClient: No new events, updated download timestamp to current time')
    }
  }

  // Apply incoming sync events directly to repositories
  private async applySyncEvent(event: SyncEvent): Promise<void> {
    try {
      console.log('SyncClient: Applying sync event directly:', event.eventType, event.entityType, event.entityId)
      
      if (event.entityType === 'history') {
        await this.applyHistorySyncEvent(event)
      } else if (event.entityType === 'page') {
        await this.applyPageSyncEvent(event)
      } else {
        throw new Error(`Unknown entity type: ${event.entityType}`)
      }
    } catch (error) {
      console.error('SyncClient: Failed to apply sync event:', error)
      throw error
    }
  }
  
  private async applyHistorySyncEvent(event: SyncEvent): Promise<void> {
    const historyData = event.data
    console.log('SyncClient: Applying history sync event:', event.eventType, 'for', historyData.url)
    
    if (event.eventType === 'CREATE' || event.eventType === 'UPDATE') {
      // Check if this history node already exists
      try {
        const existingNode = await this.historyRepository.get(historyData.id)
        console.log('SyncClient: Existing history node:', existingNode ? 'found' : 'not found')
      } catch (error) {
        console.log('SyncClient: No existing history node found (expected for new entries)')
      }
      
      // Create HistoryNode from sync data
      const historyNode = new HistoryNode(
        historyData.tabId,
        historyData.url,
        historyData.navigationSourceId || null
      )
      
      // Set the synced properties with validation
      historyNode.id = historyData.id
      historyNode.deviceId = historyData.deviceId
      
      // Validate and set timestamp
      if (!historyData.timestamp) {
        console.error('SyncClient: Missing timestamp in sync data:', historyData)
        throw new Error(`Sync event for ${historyData.url} has no timestamp`)
      }
      
      const timestamp = new Date(historyData.timestamp)
      if (isNaN(timestamp.getTime())) {
        console.error('SyncClient: Invalid timestamp in sync data:', historyData.timestamp, historyData)
        throw new Error(`Sync event for ${historyData.url} has invalid timestamp: ${historyData.timestamp}`)
      }
      
      historyNode.timestamp = timestamp
      console.log('SyncClient: Set timestamp to:', timestamp.toISOString(), 'from:', historyData.timestamp)
      
      try {
        await this.historyRepository.add(historyNode)
        console.log('SyncClient: Successfully added history node for:', historyData.url, 'from device:', historyData.deviceId)
        
        // Verify it was actually saved
        const savedNode = await this.historyRepository.get(historyData.id)
        if (savedNode) {
          console.log('SyncClient: SUCCESS - History node confirmed in database')
        } else {
          console.error('SyncClient: WARNING - History node was not saved to database!')
        }
      } catch (addError) {
        console.error('SyncClient: Error adding history node:', addError)
        throw addError
      }
    }
  }
  
  private async applyPageSyncEvent(event: SyncEvent): Promise<void> {
    const pageData = event.data
    console.log('SyncClient: Applying page sync event:', event.eventType, 'for', pageData.url)
    
    if (event.eventType === 'CREATE' || event.eventType === 'UPDATE') {
      const page = new Page(
        pageData.url,
        pageData.favicon,
        pageData.title,
        pageData.metadata || {}
      )
      
      if (pageData.lastUpdate) {
        page.lastUpdate = new Date(pageData.lastUpdate)
      }
      
      try {
        await this.pageRepository.addOrUpdate(page)
        console.log('SyncClient: Successfully added/updated page for:', pageData.url)
        
        // Verify it was actually saved
        const savedPage = await this.pageRepository.get(pageData.url)
        if (savedPage) {
          console.log('SyncClient: SUCCESS - Page confirmed in database')
        } else {
          console.error('SyncClient: WARNING - Page was not saved to database!')
        }
      } catch (addError) {
        console.error('SyncClient: Error adding/updating page:', addError)
        throw addError
      }
    }
  }

  // Status
  getStatus(): SyncStatus {
    const isSSEConnected = this.eventSource?.readyState === EventSource.OPEN;
    const hasConfig = !!(this.config && this.deviceInfo);
    
    // Consider connected if we have config (HTTP sync works) even if SSE is not connected
    const isConnected = hasConfig && (isSSEConnected || this.lastSyncTime > 0);
    
    return {
      isConnected,
      lastSync: this.lastSyncTime,
      pendingEvents: this.eventQueue.length,
      successfulSyncs: this.successfulSyncs,
      error: undefined, // TODO: Track connection errors
    }
  }

  async clearConfiguration(): Promise<void> {
    console.log('SyncClient: clearConfiguration called - clearing config and device info')
    this.config = null
    this.deviceInfo = null
    this.isLoaded = false
    this.loadingPromise = null
    this.disconnect()
  }

  // Cleanup
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer)
      this.connectionCheckTimer = null
    }
  }

  // Check if sync is configured
  async isConfigured(): Promise<boolean> {
    console.log('SyncClient: isConfigured called, isLoaded:', this.isLoaded, 'config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
    if (!this.isLoaded) {
      console.log('SyncClient: Config not loaded yet, loading now...')
      await this.loadConfig()
    }
    const configured = !!(this.config && this.deviceInfo)
    console.log('SyncClient: isConfigured?', configured, 'config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
    return configured
  }

  async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (!this.isLoaded) {
      await this.loadConfig()
    }
    return this.deviceInfo
  }

  getConfig(): SyncConfig | null {
    return this.config
  }

  async resetLastDownloadTimestamp(): Promise<void> {
    console.log('SyncClient: Resetting lastDownloadTimestamp to 0')
    await this.saveLastDownloadTimestamp(0)
  }
}
