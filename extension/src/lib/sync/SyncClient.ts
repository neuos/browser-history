import type { SyncConfig, DeviceInfo, SyncEvent, SyncStatus } from './types'

export class SyncClient {
  private config: SyncConfig | null = null
  private deviceInfo: DeviceInfo | null = null
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventQueue: SyncEvent[] = []
  private isProcessing = false

  constructor() {
    this.loadConfig()
  }

  // Configuration management
  async loadConfig(): Promise<void> {
    try {
      const result = await browser.storage.local.get(['syncConfig', 'deviceInfo'])
      this.config = result.syncConfig || null
      this.deviceInfo = result.deviceInfo || null
      
      if (this.config && this.deviceInfo) {
        await this.connect()
      }
    } catch (error) {
      console.error('Failed to load sync config:', error)
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

      // Connect WebSocket
      await this.connectWebSocket()
      
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
    // Add to queue
    this.eventQueue.push(event)
    
    // Try to sync immediately
    await this.syncPendingEvents()
  }

  private async syncPendingEvents(): Promise<void> {
    if (!this.config || !this.deviceInfo || this.isProcessing || this.eventQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      const events = [...this.eventQueue]
      this.eventQueue = []

      const response = await fetch(`${this.config.serverUrl}/sync/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deviceInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })

      if (!response.ok) {
        // Put events back in queue
        this.eventQueue.unshift(...events)
        throw new Error('Failed to sync events')
      }

      console.log(`Synced ${events.length} events successfully`)
    } catch (error) {
      console.error('Event sync failed:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Apply incoming sync events
  private async applySyncEvent(event: SyncEvent): Promise<void> {
    try {
      // Don't apply our own events
      if (event.deviceId === this.deviceInfo?.deviceId) {
        return
      }

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
      lastSync: 0, // TODO: Track last sync time
      pendingEvents: this.eventQueue.length,
      error: undefined, // TODO: Track connection errors
    }
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
  isConfigured(): boolean {
    return !!(this.config && this.deviceInfo)
  }

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo
  }

  getConfig(): SyncConfig | null {
    return this.config
  }
}
