// Message types for communication between popup and background script for sync operations

export interface SyncMessage {
  type: string
  payload?: any
}

// Messages from popup to background
export interface SetupSyncMessage extends SyncMessage {
  type: 'SETUP_SYNC'
  payload: {
    serverUrl: string
    deviceName: string
    sharedSecret: string
  }
}

export interface GetSyncStatusMessage extends SyncMessage {
  type: 'GET_SYNC_STATUS'
}

export interface GetDeviceInfoMessage extends SyncMessage {
  type: 'GET_DEVICE_INFO'
}

export interface IsConfiguredMessage extends SyncMessage {
  type: 'IS_CONFIGURED'
}

export interface ClearConfigurationMessage extends SyncMessage {
  type: 'CLEAR_CONFIGURATION'
}

export interface PerformFullSyncMessage extends SyncMessage {
  type: 'PERFORM_FULL_SYNC'
}

// Messages from background to popup
export interface SyncStatusResponse extends SyncMessage {
  type: 'SYNC_STATUS_RESPONSE'
  payload: {
    isConnected: boolean
    lastSync: number
    pendingEvents: number
    successfulSyncs: number
    error?: string
  }
}

export interface DeviceInfoResponse extends SyncMessage {
  type: 'DEVICE_INFO_RESPONSE'
  payload: {
    deviceId?: string
    deviceName?: string
    token?: string
    expiresIn?: number
    registeredAt?: number
  } | null
}

export interface IsConfiguredResponse extends SyncMessage {
  type: 'IS_CONFIGURED_RESPONSE'
  payload: {
    isConfigured: boolean
  }
}

export interface SetupSyncResponse extends SyncMessage {
  type: 'SETUP_SYNC_RESPONSE'
  payload: {
    success: boolean
    error?: string
    deviceInfo?: any
  }
}

export interface ClearConfigurationResponse extends SyncMessage {
  type: 'CLEAR_CONFIGURATION_RESPONSE'
  payload: {
    success: boolean
  }
}

export interface PerformFullSyncResponse extends SyncMessage {
  type: 'PERFORM_FULL_SYNC_RESPONSE'
  payload: {
    success: boolean
    error?: string
  }
}

export type PopupToBackgroundMessage = 
  | SetupSyncMessage
  | GetSyncStatusMessage
  | GetDeviceInfoMessage
  | IsConfiguredMessage
  | ClearConfigurationMessage
  | PerformFullSyncMessage

export type BackgroundToPopupMessage = 
  | SyncStatusResponse
  | DeviceInfoResponse
  | IsConfiguredResponse
  | SetupSyncResponse
  | ClearConfigurationResponse
  | PerformFullSyncResponse
