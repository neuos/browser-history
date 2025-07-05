<script lang="ts">
  import { onMount } from "svelte";
  import { syncService } from "@/lib/sync/SyncService";
  import type { DeviceInfo, SyncStatus } from "@/lib/sync/types";

  let isConfigured = false;
  let deviceInfo: DeviceInfo | null = null;
  let syncStatus: SyncStatus | null = null;
  let isSetupMode = false;
  
  // Setup form
  let serverUrl = 'http://localhost:8000';
  let deviceName = '';
  let sharedSecret = '';
  let isSetupLoading = false;
  let setupError = '';

  onMount(async () => {
    // Initialize sync service first to load any existing configuration
    await syncService.initialize();
    await checkSyncStatus();
    
    // Set default device name only if not configured
    if (!isConfigured && !deviceName) {
      deviceName = `${navigator.platform} - ${new Date().toLocaleDateString()}`;
    }
  });

  async function checkSyncStatus() {
    isConfigured = await syncService.isConfigured();
    deviceInfo = await syncService.getDeviceInfo();
    syncStatus = syncService.getStatus();
  }

  async function setupSync() {
    if (!serverUrl || !deviceName || !sharedSecret) {
      setupError = 'Please fill in all fields';
      return;
    }

    isSetupLoading = true;
    setupError = '';

    try {
      await syncService.setupSync(serverUrl, deviceName, sharedSecret);
      await checkSyncStatus();
      isSetupMode = false;
    } catch (error) {
      setupError = error instanceof Error ? error.message : 'Setup failed';
    } finally {
      isSetupLoading = false;
    }
  }

  async function clearSync() {
    if (confirm('This will remove sync configuration and disconnect from the server. Continue?')) {
      await syncService.clearConfiguration();
      await checkSyncStatus();
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
</script>

<div class="sync-setup">
  {#if !isConfigured || isSetupMode}
    <div class="setup-form">
      <h3>🔄 Setup Cross-Device Sync</h3>
      
      <div class="form-group">
        <label for="serverUrl">Server URL:</label>
        <input
          id="serverUrl"
          type="url"
          bind:value={serverUrl}
          placeholder="http://localhost:8000"
          disabled={isSetupLoading}
        />
      </div>

      <div class="form-group">
        <label for="deviceName">Device Name:</label>
        <input
          id="deviceName"
          type="text"
          bind:value={deviceName}
          placeholder="My Laptop"
          disabled={isSetupLoading}
        />
      </div>

      <div class="form-group">
        <label for="sharedSecret">Shared Secret:</label>
        <input
          id="sharedSecret"
          type="password"
          bind:value={sharedSecret}
          placeholder="Enter your sync secret"
          disabled={isSetupLoading}
        />
      </div>

      {#if setupError}
        <div class="error">{setupError}</div>
      {/if}

      <div class="form-actions">
        <button 
          class="primary-btn"
          on:click={setupSync}
          disabled={isSetupLoading}
        >
          {isSetupLoading ? 'Setting up...' : 'Setup Sync'}
        </button>
        
        {#if isConfigured}
          <button 
            class="secondary-btn"
            on:click={() => isSetupMode = false}
            disabled={isSetupLoading}
          >
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="sync-status">
      <h3>🔄 Sync Status</h3>
      
      <div class="status-info">
        <div class="status-item">
          <span class="label">Device:</span>
          <span class="value">{deviceInfo?.deviceName}</span>
        </div>
        
        <div class="status-item">
          <span class="label">Connection:</span>
          <span class="value" class:connected={syncStatus?.isConnected} class:disconnected={!syncStatus?.isConnected}>
            {syncStatus?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        
        <div class="status-item">
          <span class="label">Pending Events:</span>
          <span class="value">{syncStatus?.pendingEvents || 0}</span>
        </div>
        
        {#if deviceInfo}
          <div class="status-item">
            <span class="label">Registered:</span>
            <span class="value">{formatTimestamp(deviceInfo.registeredAt)}</span>
          </div>
        {/if}

        {#if syncStatus?.error}
          <div class="status-item">
            <span class="label">Error:</span>
            <span class="value error">{syncStatus.error}</span>
          </div>
        {/if}
      </div>

      <div class="status-actions">
        <button 
          class="secondary-btn"
          on:click={checkSyncStatus}
        >
          Refresh Status
        </button>
        
        <button 
          class="secondary-btn"
          on:click={() => isSetupMode = true}
        >
          Reconfigure
        </button>
        
        <button 
          class="danger-btn"
          on:click={clearSync}
        >
          Disconnect
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .sync-setup {
    padding: 16px;
    border-top: 1px solid #e8eaed;
    background-color: #f8f9fa;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #3c4043;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #5f6368;
    margin-bottom: 4px;
  }

  .form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #dfe1e5;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #1a73e8;
    box-shadow: 0 0 0 1px #1a73e8;
  }

  .form-group input:disabled {
    background-color: #f1f3f4;
    color: #80868b;
  }

  .error {
    color: #d93025;
    font-size: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background-color: #fce8e6;
    border-radius: 4px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .primary-btn {
    background-color: #1a73e8;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    flex: 1;
  }

  .primary-btn:disabled {
    background-color: #e0e0e0;
    color: #a0a0a0;
    cursor: not-allowed;
  }

  .primary-btn:hover:not(:disabled) {
    background-color: #185abc;
  }

  .secondary-btn {
    background-color: transparent;
    color: #1a73e8;
    border: 1px solid #dadce0;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .secondary-btn:hover {
    background-color: #f8f9fa;
    border-color: #cdd1d5;
  }

  .danger-btn {
    background-color: transparent;
    color: #d93025;
    border: 1px solid #dadce0;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .danger-btn:hover {
    background-color: #fce8e6;
    border-color: #d93025;
  }

  .status-info {
    margin-bottom: 16px;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e8eaed;
    font-size: 14px;
  }

  .status-item:last-child {
    border-bottom: none;
  }

  .status-item .label {
    color: #5f6368;
    font-weight: 500;
  }

  .status-item .value {
    color: #202124;
  }

  .status-item .value.connected {
    color: #137333;
  }

  .status-item .value.disconnected {
    color: #d93025;
  }

  .status-item .value.error {
    color: #d93025;
    font-size: 12px;
  }

  .status-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .status-actions button {
    flex: 1;
    min-width: 0;
  }
</style>
