<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import SyncSetup from '@/components/SyncSetup.svelte';
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


</script>

<main>
  <div style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
    <button on:click={performFullSync} disabled={isSyncing} style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: {isSyncing ? 'not-allowed' : 'pointer'};">
      {isSyncing ? 'Syncing...' : 'Sync Now'}
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
