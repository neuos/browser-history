<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import { popupSyncService } from '@/lib/sync/PopupSyncService';
  import { onMount, onDestroy } from 'svelte';
  import type { DeviceInfo, SyncStatus } from '@/lib/sync/types';
  import { emojiForDeviceId } from '@/lib/deviceColor';
  import { normalizeGuid } from '@/lib/guid';

  let showSyncStatus = false;
  let isConfigured = false;
  let deviceInfo: DeviceInfo | null = null;
  let syncStatus: SyncStatus | null = null;
  let statusRefreshInterval: ReturnType<typeof setInterval> | null = null;
  let onMessageCleanup: (() => void) | null = null;

  // Reactive status for UI
  $: statusColor = !isConfigured ? '#6c757d' : (!syncStatus?.isConnected ? '#ffc107' : '#28a745');
  $: statusText = !isConfigured ? 'Not Configured' : (!syncStatus?.isConnected ? 'Disconnected' : 'Connected');
  // Preview for the emoji field: the same deterministic fallback emoji the history list uses
  // for this device when no emoji has been picked, so the field previews the real result.
  $: emojiFallback = deviceInfo?.deviceId ? emojiForDeviceId(normalizeGuid(deviceInfo.deviceId)) : '⚪';
  
  // Setup form variables
  let isSetupMode = false;
  let serverUrl = 'http://localhost:5165';
  let deviceName = '';
  let sharedSecret = '';
  let deviceEmoji = '';
  let isSetupLoading = false;
  let setupError = '';

  onMount(async () => {
    // Initialize sync service and load configuration
    await popupSyncService.initialize();
    await updateSyncStatus();

    // Listen for connection state changes from background
    const messageListener = (message: any) => {
      if (message.type === 'SYNC_STATUS_CHANGED') {
        console.log('App: Received SYNC_STATUS_CHANGED message');
        updateSyncStatus();
      }
      if (message.type === 'RESYNC_PROGRESS') {
        resyncProgress = message.payload;
      }
    };
    
    browser.runtime.onMessage.addListener(messageListener);
    onMessageCleanup = () => browser.runtime.onMessage.removeListener(messageListener);

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
      }, 3000); // Every 3 seconds
    }
  });

  onDestroy(() => {
    if (statusRefreshInterval) {
      clearInterval(statusRefreshInterval);
    }

    if (onMessageCleanup) {
      onMessageCleanup();
      onMessageCleanup = null;
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
      await popupSyncService.setDeviceEmoji(deviceEmoji || undefined);
      await updateSyncStatus();

      isSetupMode = false;
      showSyncStatus = false; // Close the panel after successful setup
      
      // Start refresh interval
      /*
      if (isConfigured && !statusRefreshInterval) {
        statusRefreshInterval = setInterval(async () => {
          await updateSyncStatus();
        }, 5000);
      }
      */
    } catch (error) {
      setupError = error instanceof Error ? error.message : 'Setup failed';
      console.error('Setup failed:', error);
    } finally {
      isSetupLoading = false;
    }
  }
  
  let migrateResult = '';
  let isResyncing = false;
  let resyncProgress: { phase: 'downloading' | 'applying'; current: number; total: number } | null = null;
  $: resyncProgressText = resyncProgress
    ? `${resyncProgress.phase === 'downloading' ? 'Downloading' : 'Applying'} ${resyncProgress.current}/${resyncProgress.total}...`
    : '';

  // Wipes the local history/page cache and redownloads the complete event log fresh from the
  // server - the way to pick up a server-side data correction (or just recover from any local
  // drift) without needing devtools access, which Firefox for Android doesn't offer at all. Can
  // take minutes for a large history, so it reports live progress rather than sitting silent.
  async function clearLocalCacheAndResync() {
    if (!confirm('Clear local history cache and redownload everything from the server? This can take a moment.')) {
      return;
    }
    isResyncing = true;
    resyncProgress = null;
    migrateResult = '';
    try {
      const { eventsApplied } = await popupSyncService.clearLocalCacheAndResync();
      migrateResult = `Resynced - applied ${eventsApplied} events from the server.`;
    } catch (error) {
      migrateResult = `Failed: ${error instanceof Error ? error.message : 'unknown error'}`;
    } finally {
      isResyncing = false;
      resyncProgress = null;
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
  
  async function toggleSetupMode() {
    // Entering setup mode on an already-configured device: pre-fill the form with the
    // real saved config instead of leaving it at its stale/default in-memory values, so
    // "Configure" edits the existing setup rather than silently resetting it.
    if (!isSetupMode && isConfigured) {
      try {
        const config = await popupSyncService.getSyncConfig();
        if (config) {
          serverUrl = config.serverUrl;
          deviceName = config.deviceName;
          sharedSecret = config.sharedSecret;
          deviceEmoji = config.emoji || '';
        }
      } catch (error) {
        console.error('Failed to load current sync config:', error);
      }
    }
    isSetupMode = !isSetupMode;
    setupError = '';
  }
</script>

<main>
  <!-- Top header with sync status button -->
  <div class="header">
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
              placeholder="http://localhost:5165"
              disabled={isSetupLoading}
            />
          </div>

          <div class="form-group">
            <label for="deviceName">Device Name:</label>
            <div class="device-name-row">
              <input
                id="deviceName"
                type="text"
                bind:value={deviceName}
                placeholder="My Laptop"
                disabled={isSetupLoading}
              />
              <input
                class="emoji-input"
                type="text"
                bind:value={deviceEmoji}
                placeholder={emojiFallback}
                title="Emoji shown next to this device's history entries. Leave empty to use the fallback shown here. Open your OS emoji picker to type one: Ctrl+Cmd+Space on Mac, Win+. on Windows."
                disabled={isSetupLoading}
              />
            </div>
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
            Configure
          </button>
          
          <button
            class="secondary-btn"
            on:click={clearLocalCacheAndResync}
            disabled={isResyncing}
            title="Clear local history cache and redownload everything fresh from the server"
          >
            {#if isResyncing}
              <span class="spinner"></span> Syncing...
            {:else}
              Re-sync From Server
            {/if}
          </button>

          <button
            class="danger-btn"
            on:click={clearSync}
          >
            Disconnect
          </button>
        </div>

        {#if isResyncing}
          <div class="migrate-result">
            <span class="spinner"></span>
            {resyncProgressText || 'Starting resync...'}
          </div>
        {:else if migrateResult}
          <div class="migrate-result">{migrateResult}</div>
        {/if}
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
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    background: var(--color-bg);
    color: var(--color-text);
  }

  /* Desktop/floating popups have real room to grow into; narrow mobile viewports
     (where this renders as a full page, not a popup) must stay fluid instead,
     or the browser zooms out to fit the enforced minimum and clips the right edge. */
  @media (min-width: 560px) {
    main {
      min-width: 512px;
      width: auto;
      min-height: 0;
    }
  }

  .header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
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
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
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
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--color-text);
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
    color: var(--color-text-secondary);
  }

  .status-row .value {
    color: var(--color-text);
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
    color: var(--color-text);
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .form-group input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-size: 12px;
    box-sizing: border-box;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-group input:disabled {
    background-color: var(--color-hover);
    color: var(--color-text-secondary);
  }

  .device-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .device-name-row input#deviceName {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .device-name-row input.emoji-input {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    padding: 0;
    text-align: center;
    font-size: 14px;
    line-height: 28px;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .error {
    color: var(--color-danger);
    font-size: 12px;
    margin-bottom: 10px;
    padding: 5px;
    background-color: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
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

  .migrate-result {
    margin-top: 10px;
    font-size: 12px;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 6px 8px;
    word-break: break-word;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid rgba(128, 128, 128, 0.3);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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
    background-color: var(--color-accent);
    color: white;
  }

  .primary-btn:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
  }

  .primary-btn:disabled {
    background-color: var(--color-border);
    cursor: not-allowed;
  }

  .secondary-btn {
    background-color: var(--color-secondary-btn-bg);
    color: white;
  }

  .secondary-btn:hover:not(:disabled) {
    background-color: var(--color-secondary-btn-hover);
  }

  .secondary-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .secondary-btn .spinner {
    border-color: rgba(255, 255, 255, 0.4);
    border-top-color: white;
  }

  .danger-btn {
    background-color: var(--color-danger);
    color: white;
  }

  .danger-btn:hover:not(:disabled) {
    background-color: #c82333;
  }
</style>
