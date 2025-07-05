// Types for sync system
export interface SyncConfig {
  serverUrl: string
  deviceName: string
  sharedSecret: string
  token?: string
}

export interface SyncEvent {
  id: string
  deviceId?: string
  timestamp: number
  eventType: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: 'history' | 'page'
  entityId: string
  data: any
  checksum?: string
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  token: string
  expiresIn: number
  registeredAt: number
}

export interface SyncStatus {
  isConnected: boolean
  lastSync: number
  pendingEvents: number
  successfulSyncs: number
  error?: string
}
