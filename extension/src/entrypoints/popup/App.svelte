<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import SyncSetup from '@/components/SyncSetup.svelte';
  import svelteLogo from '../../assets/svelte.svg'
  import Counter from '../../lib/Counter.svelte'
  import { popupSyncService } from '@/lib/sync/PopupSyncService';
  import { onMount } from 'svelte';

  let isSyncing = false;
  let syncMessage = '';

  onMount(async () => {
    // Automatically trigger a full sync when popup opens (if configured)
    const isConfigured = await popupSyncService.isConfigured();
    if (isConfigured) {
      console.log('App: Popup opened and sync is configured, triggering automatic sync...');
      await performFullSync();
    }
  });

  async function performFullSync() {
    if (isSyncing) return;
    
    try {
      isSyncing = true;
      syncMessage = 'Syncing...';
      console.log('App: Triggering manual full sync...');
      
      await popupSyncService.performFullSync();
      
      syncMessage = 'Sync completed!';
      console.log('App: Full sync completed successfully');
      
      // Clear message after 2 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 2000);
    } catch (error) {
      console.error('App: Full sync failed:', error);
      syncMessage = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    } finally {
      isSyncing = false;
    }
  }

  async function testRepositoryOperations() {
    try {
      syncMessage = 'Testing repository operations...';
      console.log('App: Testing repository operations...');
      
      const response = await browser.runtime.sendMessage({
        type: 'TEST_REPOSITORY_OPERATIONS'
      });
      
      console.log('App: Repository test response:', response);
      
      if (!response) {
        syncMessage = 'Repository test: No response from background script';
        console.error('App: No response received from background script');
      } else if (response.payload && response.payload.success) {
        syncMessage = `Repository test: SUCCESS (${response.payload.after.history} history, ${response.payload.after.pages} pages)`;
      } else {
        syncMessage = `Repository test: FAILED - ${response.payload?.error || 'Unknown error'}`;
      }
      
      // Clear message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    } catch (error) {
      console.error('App: Repository test failed:', error);
      syncMessage = `Repository test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    }
  }

  async function debugSync() {
    console.log('=== Debug Sync ===');
    
    // Test sync configuration
    const isConfigured = await popupSyncService.isConfigured();
    console.log('Sync configured:', isConfigured);
    
    // Test device info
    const deviceInfo = await popupSyncService.getDeviceInfo();
    console.log('Device info:', deviceInfo);
    
    // Test status
    const status = await popupSyncService.getStatusAsync();
    console.log('Sync status:', status);
    console.log('Successful syncs:', status.successfulSyncs);
    console.log('Last sync:', status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never');
    
    // Test if we can reach the backend
    if (deviceInfo) {
      try {
        const response = await fetch('http://localhost:8000/health');
        const health = await response.json();
        console.log('Backend health:', health);
      } catch (error) {
        console.error('Failed to reach backend:', error);
      }
    }
    
    console.log('=== End Debug Sync ===');
  }

  async function checkServerEvents() {
    try {
      syncMessage = 'Checking server events...';
      console.log('App: Checking server events...');
      
      const response = await browser.runtime.sendMessage({
        type: 'CHECK_SERVER_EVENTS'
      });
      
      console.log('App: Server events response:', response);
      
      if (!response) {
        syncMessage = 'Server check: No response from background script';
        console.error('App: No response received from background script');
      } else if (response.payload && response.payload.success) {
        const { events, devices } = response.payload;
        syncMessage = `Server check: ${events.length} events, ${devices.length} devices`;
        console.log('Server events:', events);
        console.log('Registered devices:', devices);
      } else {
        syncMessage = `Server check: FAILED - ${response.payload?.error || 'Unknown error'}`;
      }
      
      // Clear message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    } catch (error) {
      console.error('App: Server events check failed:', error);
      syncMessage = `Server check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    }
  }

  async function resetSyncTimestamp() {
    try {
      syncMessage = 'Resetting sync timestamp...';
      console.log('App: Resetting sync timestamp...');
      
      const response = await browser.runtime.sendMessage({
        type: 'RESET_SYNC_TIMESTAMP'
      });
      
      console.log('App: Reset sync timestamp response:', response);
      
      if (!response) {
        syncMessage = 'Reset failed: No response from background script';
        console.error('App: No response received from background script');
      } else if (response.payload && response.payload.success) {
        syncMessage = `Sync timestamp reset! Try syncing now.`;
        console.log('Sync timestamp reset successfully');
      } else {
        syncMessage = `Reset failed: ${response.payload?.error || 'Unknown error'}`;
      }
      
      // Clear message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    } catch (error) {
      console.error('App: Reset sync timestamp failed:', error);
      syncMessage = `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 5000);
    }
  }

  async function testIndexedDBAccess() {
    try {
      syncMessage = 'Testing IndexedDB access...';
      console.log('App: Testing IndexedDB access...');
      
      const response = await browser.runtime.sendMessage({
        type: 'TEST_INDEXEDDB_ACCESS'
      });
      
      console.log('App: IndexedDB test response:', response);
      
      if (!response) {
        syncMessage = 'IndexedDB test: No response from background script';
        console.error('App: No response received from background script');
      } else if (response.payload && response.payload.success) {
        const { basicTest, appDbTest, historyCount, pageCount } = response.payload;
        syncMessage = `IndexedDB test: Basic=${basicTest}, App=${appDbTest}, H=${historyCount}, P=${pageCount}`;
        console.log('IndexedDB test results:', response.payload);
      } else {
        syncMessage = `IndexedDB test FAILED: ${response.payload?.error || 'Unknown error'}`;
      }
      
      // Clear message after 8 seconds (longer for this test)
      setTimeout(() => {
        syncMessage = '';
      }, 8000);
    } catch (error) {
      console.error('App: IndexedDB test failed:', error);
      syncMessage = `IndexedDB test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Clear error message after 8 seconds
      setTimeout(() => {
        syncMessage = '';
      }, 8000);
    }
  }
</script>

<main>
  <div style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
    <button on:click={performFullSync} disabled={isSyncing} style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: {isSyncing ? 'not-allowed' : 'pointer'};">
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </button>
    <button on:click={debugSync} style="padding: 5px 10px; background: #007acc; color: white; border: none; border-radius: 3px;">
      Debug Sync
    </button>
    <button on:click={testRepositoryOperations} style="padding: 5px 10px; background: #6f42c1; color: white; border: none; border-radius: 3px;">
      Test Repo
    </button>
    <button on:click={checkServerEvents} style="padding: 5px 10px; background: #fd7e14; color: white; border: none; border-radius: 3px;">
      Check Server
    </button>
    <button on:click={resetSyncTimestamp} style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px;">
      Reset Sync
    </button>
    <button on:click={testIndexedDBAccess} style="padding: 5px 10px; background: #17a2b8; color: white; border: none; border-radius: 3px;">
      Test DB
    </button>
    <button on:click={checkServerEvents} style="padding: 5px 10px; background: #e83e8c; color: white; border: none; border-radius: 3px;">
      Check Events
    </button>
    <button on:click={testIndexedDBAccess} style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">
      Test IndexedDB
    </button>
    {#if syncMessage}
      <span style="color: {syncMessage.includes('failed') ? '#dc3545' : '#28a745'}; font-size: 12px;">
        {syncMessage}
      </span>
    {/if}
  </div>
  <HistoryList />
  <SyncSetup />
</main>

<style>
    main {
      min-width: 512px;
    }
</style>
