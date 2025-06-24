<script lang="ts">
  import HistoryList from '@/components/HistoryList.svelte';
  import SyncSetup from '@/components/SyncSetup.svelte';
  import svelteLogo from '../../assets/svelte.svg'
  import Counter from '../../lib/Counter.svelte'
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
