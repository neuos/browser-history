#!/usr/bin/env node

// Test script to simulate the browser storage issue
// This helps us understand if the configuration is being stored/loaded correctly

console.log('=== Browser Storage Configuration Test ===')
console.log('')

// Simulate the browser.storage.local behavior
const mockStorage = {
  data: {},
  
  async get(keys) {
    console.log('MockStorage: get() called with keys:', keys)
    const result = {}
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = this.data[key] || null
      })
    } else if (typeof keys === 'string') {
      result[keys] = this.data[keys] || null
    }
    console.log('MockStorage: returning:', result)
    return result
  },
  
  async set(items) {
    console.log('MockStorage: set() called with:', items)
    Object.assign(this.data, items)
    console.log('MockStorage: data is now:', this.data)
  },
  
  async remove(keys) {
    console.log('MockStorage: remove() called with keys:', keys)
    if (Array.isArray(keys)) {
      keys.forEach(key => delete this.data[key])
    } else {
      delete this.data[keys]
    }
    console.log('MockStorage: data is now:', this.data)
  }
}

// Simulate SyncClient configuration flow
class TestSyncClient {
  constructor() {
    this.config = null
    this.deviceInfo = null
    this.isLoaded = false
    this.browser = { storage: { local: mockStorage } }
  }

  async loadConfig() {
    console.log('TestSyncClient: loadConfig called, isLoaded:', this.isLoaded)
    if (this.isLoaded) return

    try {
      console.log('TestSyncClient: Loading config from browser storage...')
      const result = await this.browser.storage.local.get(['syncConfig', 'deviceInfo'])
      console.log('TestSyncClient: Storage result:', { 
        hasSyncConfig: !!result.syncConfig, 
        hasDeviceInfo: !!result.deviceInfo,
        syncConfig: result.syncConfig,
        deviceInfo: result.deviceInfo 
      })
      this.config = result.syncConfig || null
      this.deviceInfo = result.deviceInfo || null
      this.isLoaded = true
      
      console.log('TestSyncClient: Loaded config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
    } catch (error) {
      console.error('Failed to load sync config:', error)
      this.isLoaded = true
    }
  }

  async saveConfig(config) {
    console.log('TestSyncClient: Saving config:', config)
    this.config = config
    await this.browser.storage.local.set({ syncConfig: config })
  }

  async saveDeviceInfo(deviceInfo) {
    console.log('TestSyncClient: Saving device info:', deviceInfo)
    this.deviceInfo = deviceInfo
    await this.browser.storage.local.set({ deviceInfo })
  }

  async isConfigured() {
    console.log('TestSyncClient: isConfigured called, isLoaded:', this.isLoaded, 'config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
    if (!this.isLoaded) {
      console.log('TestSyncClient: Config not loaded yet, loading now...')
      await this.loadConfig()
    }
    const configured = !!(this.config && this.deviceInfo)
    console.log('TestSyncClient: isConfigured?', configured, 'config:', !!this.config, 'deviceInfo:', !!this.deviceInfo)
    return configured
  }

  async clearConfiguration() {
    console.log('TestSyncClient: clearConfiguration called - clearing config and device info')
    this.config = null
    this.deviceInfo = null
    this.isLoaded = false
  }
}

// Test the flow
async function runTest() {
  const client = new TestSyncClient()
  
  console.log('1. Initial state - should not be configured')
  console.log('Is configured:', await client.isConfigured())
  console.log('')
  
  console.log('2. Save configuration')
  await client.saveConfig({
    serverUrl: 'http://localhost:8000',
    deviceName: 'test-device',
    sharedSecret: 'secret',
    token: 'test-token'
  })
  
  await client.saveDeviceInfo({
    deviceId: 'test-device-id',
    deviceName: 'test-device',
    token: 'test-token',
    expiresIn: 86400,
    registeredAt: Date.now()
  })
  console.log('')
  
  console.log('3. Check if configured after saving')
  console.log('Is configured:', await client.isConfigured())
  console.log('')
  
  console.log('4. Create new client instance (simulates extension restart)')
  const client2 = new TestSyncClient()
  console.log('Is configured (new instance):', await client2.isConfigured())
  console.log('')
  
  console.log('5. Call isConfigured multiple times (simulates multiple callback calls)')
  console.log('Is configured (call 1):', await client2.isConfigured())
  console.log('Is configured (call 2):', await client2.isConfigured())
  console.log('Is configured (call 3):', await client2.isConfigured())
  console.log('')
  
  console.log('Test completed!')
}

runTest().catch(console.error)
