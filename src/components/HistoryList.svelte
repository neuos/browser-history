<script lang="ts">
  import { onMount } from 'svelte';
  import { HistoryRepositoryIndexedDB } from '@/lib/HistoryTree/HistoryRepositoryIndexedDB';
  import type { HistoryNode } from '@/lib/HistoryTree/HistoryNode';

  let historyNodes: HistoryNode[] = [];
  let isLoading = true;
  let error: string | undefined;

  const repo = new HistoryRepositoryIndexedDB();

  // Format date to a readable string
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('default', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(date);
  }

  // Get the domain from a URL
  function getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  }

  // Load history data
  async function loadHistory() {
    try {
      isLoading = true;
      historyNodes = await repo.getAll();
      // Sort by timestamp, newest first
      historyNodes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load history';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadHistory();
  });
</script>

<div class="history-container">
  <h1>Browsing History</h1>
  
  <button class="refresh-btn" on:click={loadHistory} disabled={isLoading}>
    {isLoading ? 'Loading...' : 'Refresh'}
  </button>
  
  {#if error}
    <div class="error-message">
      Error: {error}
    </div>
  {/if}
  
  {#if isLoading}
    <div class="loading">Loading history...</div>
  {:else if historyNodes.length === 0}
    <div class="empty-state">No browsing history available.</div>
  {:else}
    <ul class="history-list">
      {#each historyNodes as node (node.id)}
        <li class="history-item">
          <a href={node.url} target="_blank" rel="noopener noreferrer">
            <div class="history-item-content">
              {#if node.favicon}
                <img class="favicon" src={node.page.favicon} alt="favicon" width="20" height="20" />
              {/if}
              <div class="history-item-title">
                {node.page?.title || node.url}
              </div>
              <div class="history-item-url">
                {getDomain(node.url)}
              </div>
              <div class="history-item-time">
                {formatDate(node.timestamp)}
              </div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>


<style>
  .history-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  h1 {
    color: #333;
    margin-bottom: 20px;
  }

  .refresh-btn {
    background-color: #4a86e8;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .refresh-btn:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }

  .error-message {
    color: #d32f2f;
    padding: 10px;
    background-color: #ffebee;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .loading, .empty-state {
    text-align: center;
    color: #666;
    padding: 20px;
  }

  .history-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .history-item {
    border-bottom: 1px solid #eee;
  }

  .history-item a {
    display: block;
    padding: 12px 8px;
    color: inherit;
    text-decoration: none;
    transition: background-color 0.2s;
  }

  .history-item a:hover {
    background-color: #f5f5f5;
  }

  .history-item-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .history-item-title {
    font-weight: 500;
    color: #333;
  }

  .history-item-url {
    color: #1a73e8;
    font-size: 14px;
  }

  .history-item-time {
    color: #70757a;
    font-size: 12px;
  }

  .favicon {
    vertical-align: middle;
    margin-right: 8px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
</style>