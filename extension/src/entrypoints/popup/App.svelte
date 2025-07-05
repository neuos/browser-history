<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import SyncSetup from '@/components/SyncSetup.svelte';
  import svelteLogo from '../../assets/svelte.svg'
  import Counter from '../../lib/Counter.svelte'
  import { popupSyncService } from '@/lib/sync/PopupSyncService';

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
</script>

<main>
  <button on:click={debugSync} style="margin-bottom: 10px; padding: 5px 10px; background: #007acc; color: white; border: none; border-radius: 3px;">
    Debug Sync
  </button>
  <HistoryList />
  <SyncSetup />
</main>

<style>
    main {
      min-width: 512px;
    }
</style>
