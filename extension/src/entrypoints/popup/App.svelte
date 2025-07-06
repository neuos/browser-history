<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import SyncSetup from '@/components/SyncSetup.svelte';
  import { popupSyncService } from '@/lib/sync/PopupSyncService';
  import { onMount } from 'svelte';

  onMount(async () => {
    // Automatically trigger a full sync when popup opens (if configured)
    const isConfigured = await popupSyncService.isConfigured();
    if (isConfigured) {
      console.log('App: Popup opened and sync is configured, triggering automatic sync...');
      try {
        await popupSyncService.performFullSync();
        console.log('App: Full sync completed successfully');
      } catch (error) {
        console.error('App: Full sync failed:', error);
      }
    }
  });


</script>

<main>
  <HistoryList />
  <SyncSetup />
</main>

<style>
    main {
      min-width: 512px;
    }
</style>
