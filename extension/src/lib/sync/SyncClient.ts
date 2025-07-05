import type { SyncConfig, DeviceInfo, SyncEvent, SyncStatus } from './types'

export class SyncClient {
  private config: SyncConfig | null = null
  private deviceInfo: DeviceInfo | null = null
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventQueue: SyncEvent[] = []
  private isProcessing = false
  private isLoaded = false
  private loadingPromise: Promise<void> | null = null
  private successfulSyncs = 0
  private lastSyncTime = 0

  constructor() {
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
      const result = await browser.storage.local.get(['syncConfig', 'deviceInfo'])
      console.log('SyncClient: Storage result:', { 
        hasSyncConfig: !!result.syncConfig, 
        hasDeviceInfo: !!result.deviceInfo,
        syncConfig: result.syncConfig,
        deviceInfo: result.deviceInfo 
      })
      this.config = result.syncConfig || null
      this.deviceInfo = result.deviceInfo || null
      this.isLoaded = true
      
      console.log('SyncClient: Loaded config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
      
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

  // Device registration
  async registerDevice(serverUrl: string, deviceName: string, sharedSecret: string): Promise<DeviceInfo> {
    try {
      const response = await fetch(`${serverUrl}/auth/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceName,
          publicKey: 'dummy-key', // For now, we'll use a dummy key
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
      const response = await fetch(`${this.config.serverUrl}/auth/refresh-token`, {
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

      // Try to connect WebSocket (but don't fail if it doesn't work)
      try {
        await this.connectWebSocket()
        console.log('SyncClient: WebSocket connected successfully')
      } catch (wsError) {
        console.warn('SyncClient: WebSocket connection failed, but HTTP sync will still work:', wsError)
      }
      
      // Sync pending events
      await this.syncPendingEvents()
      
    } catch (error) {
      console.error('Connection failed:', error)
      this.scheduleReconnect()
      throw error
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config || !this.deviceInfo) return

    return new Promise((resolve, reject) => {
      const wsUrl = this.config!.serverUrl.replace(/^http/, 'ws') + '/ws'
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.ws = null
        this.scheduleReconnect()
      }

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data)
      }
    })
  }

  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      switch (message.type) {
        case 'sync_event':
          this.applySyncEvent(message.data)
          break
        case 'sync_batch':
          message.data.events.forEach((event: SyncEvent) => this.applySyncEvent(event))
          break
        case 'ping':
          this.sendWebSocketMessage({ type: 'pong', timestamp: Date.now() })
          break
      }
    } catch (error) {
      console.error('Failed to handle WebSocket message:', error)
    }
  }

  private sendWebSocketMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error)
    }, 5000) // Retry every 5 seconds
  }

  // Event synchronization
  async submitSyncEvent(event: SyncEvent): Promise<void> {
    console.log('SyncClient: Submitting sync event:', event.eventType, event.entityType, event.entityId)
    
    // Add to queue
    this.eventQueue.push(event)
    console.log('SyncClient: Event queue length:', this.eventQueue.length)
    
    // Try to sync immediately
    await this.syncPendingEvents()
  }

  private async syncPendingEvents(): Promise<void> {
    if (!this.config || !this.deviceInfo || this.isProcessing || this.eventQueue.length === 0) {
      console.log('SyncClient: Skipping sync - config:', !!this.config, 'deviceInfo:', !!this.deviceInfo, 'processing:', this.isProcessing, 'queue length:', this.eventQueue.length)
      return
    }

    console.log('SyncClient: Starting sync of', this.eventQueue.length, 'events')
    this.isProcessing = true

    try {
      const events = [...this.eventQueue]
      this.eventQueue = []

      console.log('SyncClient: Sending events to', `${this.config.serverUrl}/sync/events`)
      console.log('SyncClient: Events being sent:', events.map(e => ({ id: e.id, type: e.eventType, entity: e.entityType })))
      
      // Note: deviceId is NOT sent in the request body - it's provided via JWT in Authorization header
      // This ensures security and prevents device ID spoofing
      const response = await fetch(`${this.config.serverUrl}/sync/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deviceInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })

      if (!response.ok) {
        console.error('SyncClient: Sync failed with status:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('SyncClient: Error response:', errorText)
        
        // Only put events back in queue if it's a network/auth error, not a duplicate ID error
        if (response.status !== 400 && response.status !== 409 && response.status !== 500) {
          this.eventQueue.unshift(...events)
          console.log('SyncClient: Events put back in queue for retry')
        } else {
          console.warn(`SyncClient: Events not retried due to server error (${response.status}), may be duplicate IDs`)
        }
        
        throw new Error(`Failed to sync events: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('SyncClient: Sync successful:', result)
      console.log(`SyncClient: Synced ${events.length} events successfully`)
      
      // Update success counters
      this.successfulSyncs += events.length
      this.lastSyncTime = Date.now()
      console.log('SyncClient: Updated counters - successfulSyncs:', this.successfulSyncs, 'lastSyncTime:', new Date(this.lastSyncTime).toLocaleString())
    } catch (error) {
      console.error('SyncClient: Event sync failed:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Apply incoming sync events
  private async applySyncEvent(event: SyncEvent): Promise<void> {
    try {
      console.log('Applying sync event:', event)
      
      // Broadcast to extension components
      browser.runtime.sendMessage({
        type: 'SYNC_EVENT_RECEIVED',
        event,
      })
    } catch (error) {
      console.error('Failed to apply sync event:', error)
    }
  }

  // Status
  getStatus(): SyncStatus {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
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
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
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
}
