import type { 
  PopupToBackgroundMessage, 
  BackgroundToPopupMessage,
  SyncStatusResponse,
  DeviceInfoResponse,
  IsConfiguredResponse,
  SetupSyncResponse,
  ClearConfigurationResponse,
  PerformFullSyncResponse
} from './messages'
import type { DeviceInfo, SyncStatus } from './types'

export class PopupSyncService {
  // Send a message to background script and wait for response
  private async sendMessage<T extends BackgroundToPopupMessage>(
    message: PopupToBackgroundMessage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync operation timeout'))
      }, 10000) // 10 second timeout

      browser.runtime.sendMessage(message)
        .then(response => {
          clearTimeout(timeout)
          resolve(response)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(new Error(error?.message || 'Message sending failed'))
        })
    })
  }

  async setupSync(serverUrl: string, deviceName: string, sharedSecret: string): Promise<DeviceInfo> {
    console.log('PopupSyncService: Setting up sync via background script')
    const response = await this.sendMessage<SetupSyncResponse>({
      type: 'SETUP_SYNC',
      payload: { serverUrl, deviceName, sharedSecret }
    })

    if (!response.payload.success) {
      throw new Error(response.payload.error || 'Setup failed')
    }

    return response.payload.deviceInfo
  }

  async isConfigured(): Promise<boolean> {
    console.log('PopupSyncService: Checking if configured via background script')
    const response = await this.sendMessage<IsConfiguredResponse>({
      type: 'IS_CONFIGURED'
    })
    return response.payload.isConfigured
  }

  async getDeviceInfo(): Promise<DeviceInfo | null> {
    console.log('PopupSyncService: Getting device info via background script')
    const response = await this.sendMessage<DeviceInfoResponse>({
      type: 'GET_DEVICE_INFO'
    })
    return response.payload as DeviceInfo | null
  }

  getStatus(): SyncStatus {
    // For popup, we need to request status from background
    // This is async, so we'll return a default status and update via events
    return {
      isConnected: false,
      lastSync: 0,
      pendingEvents: 0,
      successfulSyncs: 0,
      error: undefined
    }
  }

  async getStatusAsync(): Promise<SyncStatus> {
    console.log('PopupSyncService: Getting status via background script')
    const response = await this.sendMessage<SyncStatusResponse>({
      type: 'GET_SYNC_STATUS'
    })
    return {
      isConnected: response.payload.isConnected,
      lastSync: response.payload.lastSync,
      pendingEvents: response.payload.pendingEvents,
      successfulSyncs: response.payload.successfulSyncs,
      error: response.payload.error
    }
  }

  async clearConfiguration(): Promise<void> {
    console.log('PopupSyncService: Clearing configuration via background script')
    const response = await this.sendMessage<ClearConfigurationResponse>({
      type: 'CLEAR_CONFIGURATION'
    })
    
    if (!response.payload.success) {
      throw new Error('Failed to clear configuration')
    }
  }

  async performFullSync(): Promise<void> {
    console.log('PopupSyncService: Triggering full sync via background script')
    const response = await this.sendMessage<PerformFullSyncResponse>({
      type: 'PERFORM_FULL_SYNC'
    })
    
    if (!response.payload.success) {
      throw new Error(response.payload.error || 'Full sync failed')
    }
  }

  // Placeholder methods that don't make sense for popup context
  async initialize(): Promise<void> {
    // No-op - initialization happens in background
  }

  async disconnect(): Promise<void> {
    // No-op - managed by background
  }

  // Methods that don't apply to popup context but are needed for interface compatibility
  async syncHistoryNodeCreated(node: any): Promise<void> {
    throw new Error('syncHistoryNodeCreated should not be called from popup context')
  }

  async syncPageCreated(page: any): Promise<void> {
    throw new Error('syncPageCreated should not be called from popup context')
  }

  async syncPageUpdated(page: any): Promise<void> {
    throw new Error('syncPageUpdated should not be called from popup context')
  }
}

// Export a singleton instance for popup use
export const popupSyncService = new PopupSyncService()
