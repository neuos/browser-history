// Types for sync system
export interface SyncConfig {
  serverUrl: string
  deviceName: string
  sharedSecret: string
  token?: string
}

export interface SyncEvent {
  id: string
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
  // When the current token was issued - distinct from registeredAt (which is the device's
  // original registration time, shown to the user in SyncSetup.svelte and never updated).
  // Refresh-expiry checks must be relative to this, not registeredAt, or every check after
  // the first refresh keeps comparing against an ever-growing age and refreshes needlessly.
  tokenIssuedAt: number
}

export interface SyncStatus {
  isConnected: boolean
  lastSync: number
  pendingEvents: number
  successfulSyncs: number
  error?: string
}
