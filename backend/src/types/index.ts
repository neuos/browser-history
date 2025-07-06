// Core interfaces for the sync system

export interface Device {
  deviceId: string
  deviceName: string
  createdAt: number
  lastSeen: number
}

export interface SyncEvent {
  id: string
  deviceId: string
  timestamp: number
  eventType: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: 'history' | 'page'
  entityId: string
  data: Record<string, unknown>
  checksum: string
}

export interface HistoryNode {
  id: string
  deviceId: string
  url: string
  tabId: number
  timestamp: number
  navigationSourceId?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Page {
  url: string
  title?: string
  favicon?: string
  metadata: Record<string, unknown>
  lastUpdate: number
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface SyncState {
  deviceId: string
  lastSyncTimestamp: number
  syncVector: Record<string, number>
}

export interface AuthToken {
  deviceId: string
  exp: number
  iat: number
}

export interface WSMessage {
  type: 'sync_event' | 'sync_request' | 'sync_batch' | 'ping' | 'pong'
  data?: unknown
  timestamp: number
}
