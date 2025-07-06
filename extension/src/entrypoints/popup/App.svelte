<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import { popupSyncService } from '@/lib/sync/PopupSyncService';
  import { onMount, onDestroy } from 'svelte';
  import type { DeviceInfo, SyncStatus } from '@/lib/sync/types';

  let showSyncStatus = false;
  let isConfigured = false;
  let deviceInfo: DeviceInfo | null = null;
  let syncStatus: SyncStatus | null = null;
  let statusRefreshInterval: ReturnType<typeof setInterval> | null = null;
  
  // Reactive status for UI
  $: statusColor = !isConfigured ? '#6c757d' : (!syncStatus?.isConnected ? '#ffc107' : '#28a745');
  $: statusText = !isConfigured ? 'Not Configured' : (!syncStatus?.isConnected ? 'Disconnected' : 'Connected');
  
  // Setup form variables
  let isSetupMode = false;
  let serverUrl = 'http://localhost:8000';
  let deviceName = '';
  let sharedSecret = '';
  let isSetupLoading = false;
  let setupError = '';

  onMount(async () => {
    // Initialize sync service and load configuration
    await popupSyncService.initialize();
    await updateSyncStatus();
    
    // Set default device name if not configured
    if (!isConfigured && !deviceName) {
      deviceName = `${navigator.platform} - ${new Date().toLocaleDateString()}`;
    }
    
    // Automatically trigger a full sync when popup opens (if configured)
    if (isConfigured) {
      console.log('App: Popup opened and sync is configured, triggering automatic sync...');
      try {
        await popupSyncService.performFullSync();
        console.log('App: Full sync completed successfully');
        await updateSyncStatus(); // Refresh status after sync
      } catch (error) {
        console.error('App: Full sync failed:', error);
      }
    }

    // Refresh status periodically when configured
    if (isConfigured) {
      statusRefreshInterval = setInterval(async () => {
        await updateSyncStatus();
      }, 5000); // Every 5 seconds
    }
  });

  onDestroy(() => {
    if (statusRefreshInterval) {
      clearInterval(statusRefreshInterval);
    }
  });

  async function updateSyncStatus() {
    try {
      const newIsConfigured = await popupSyncService.isConfigured();
      const newDeviceInfo = await popupSyncService.getDeviceInfo();
      const newSyncStatus = await popupSyncService.getStatusAsync();
      
      // Trigger reactivity by reassigning
      isConfigured = newIsConfigured;
      deviceInfo = newDeviceInfo;
      syncStatus = newSyncStatus;
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  function toggleSyncStatus() {
    showSyncStatus = !showSyncStatus;
  }
  
  async function setupSync() {
    if (!serverUrl || !deviceName || !sharedSecret) {
      setupError = 'Please fill in all fields';
      return;
    }
    
    try {
      isSetupLoading = true;
      setupError = '';
      
      await popupSyncService.setupSync(serverUrl, deviceName, sharedSecret);
      await updateSyncStatus();
      
      isSetupMode = false;
      showSyncStatus = false; // Close the panel after successful setup
      
      // Start refresh interval
      if (isConfigured && !statusRefreshInterval) {
        statusRefreshInterval = setInterval(async () => {
          await updateSyncStatus();
        }, 5000);
      }
    } catch (error) {
      setupError = error instanceof Error ? error.message : 'Setup failed';
      console.error('Setup failed:', error);
    } finally {
      isSetupLoading = false;
    }
  }
  
  async function clearSync() {
    if (confirm('This will remove sync configuration and disconnect from the server. Continue?')) {
      // Stop the refresh interval
      if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
        statusRefreshInterval = null;
      }
      
      await popupSyncService.clearConfiguration();
      await updateSyncStatus();
      isSetupMode = false;
    }
  }
  
  function toggleSetupMode() {
    isSetupMode = !isSetupMode;
    setupError = '';
  }
</script>

<main>
  <!-- Top header with sync status button -->
  <div class="header">
    <h2>Browser History</h2>
    <button 
      class="sync-status-btn" 
      on:click={toggleSyncStatus}
      style="background-color: {statusColor};"
      title="Click to toggle sync status details"
    >
      <span class="status-indicator"></span>
      {statusText}
    </button>
  </div>

  <!-- Expandable sync status section -->
  {#if showSyncStatus}
    <div class="sync-status-panel">
      <div class="status-header">
        <h3>Sync Status</h3>
        <button class="close-btn" on:click={toggleSyncStatus}>×</button>
      </div>
      
      {#if !isConfigured || isSetupMode}
        <!-- Setup Form -->
        <div class="setup-form">
          <h4>🔄 Setup Cross-Device Sync</h4>
          
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
                on:click={toggleSetupMode}
                disabled={isSetupLoading}
              >
                Cancel
              </button>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Status Display -->
        <div class="status-details">
          <div class="status-row">
            <span class="label">Device:</span>
            <span class="value">{deviceInfo?.deviceName || 'Unknown'}</span>
          </div>
          <div class="status-row">
            <span class="label">Connection:</span>
            <span class="value" style="color: {syncStatus?.isConnected ? '#28a745' : '#dc3545'}">
              {syncStatus?.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {#if syncStatus}
            <div class="status-row">
              <span class="label">Last Sync:</span>
              <span class="value">
                {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
              </span>
            </div>
            <div class="status-row">
              <span class="label">Synced Items:</span>
              <span class="value">{syncStatus.successfulSyncs || 0}</span>
            </div>
            <div class="status-row">
              <span class="label">Pending:</span>
              <span class="value">{syncStatus.pendingEvents || 0}</span>
            </div>
          {/if}
        </div>
        
        <!-- Action Buttons -->
        <div class="status-actions">
          <button 
            class="secondary-btn"
            on:click={updateSyncStatus}
          >
            Refresh Status
          </button>
          
          <button 
            class="secondary-btn"
            on:click={toggleSetupMode}
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
      {/if}
    </div>
  {/if}

  <!-- Main content -->
  <div class="content">
    <HistoryList />
  </div>
</main>

<style>
  main {
    min-width: 512px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #f8f9fa;
  }

  .header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .sync-status-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .sync-status-btn:hover {
    opacity: 0.8;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.8);
  }

  .sync-status-panel {
    background-color: #f1f3f4;
    border-bottom: 1px solid #e0e0e0;
    padding: 15px;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .status-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .status-details {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .status-row .label {
    font-weight: 500;
    color: #666;
  }

  .status-row .value {
    color: #333;
    font-family: monospace;
  }

  .content {
    flex: 1;
    overflow-y: auto;
  }

  .setup-form {
    margin-top: 10px;
  }

  .setup-form h4 {
    margin: 0 0 15px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  .form-group input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 12px;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #007acc;
  }

  .form-group input:disabled {
    background-color: #f5f5f5;
    color: #666;
  }

  .error {
    color: #dc3545;
    font-size: 12px;
    margin-bottom: 10px;
    padding: 5px;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 3px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 15px;
  }

  .status-actions {
    display: flex;
    gap: 8px;
    margin-top: 15px;
    flex-wrap: wrap;
  }

  .primary-btn, .secondary-btn, .danger-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .primary-btn {
    background-color: #007acc;
    color: white;
  }

  .primary-btn:hover:not(:disabled) {
    background-color: #005a9e;
  }

  .primary-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .secondary-btn {
    background-color: #6c757d;
    color: white;
  }

  .secondary-btn:hover:not(:disabled) {
    background-color: #5a6268;
  }

  .danger-btn {
    background-color: #dc3545;
    color: white;
  }

  .danger-btn:hover:not(:disabled) {
    background-color: #c82333;
  }
</style>
