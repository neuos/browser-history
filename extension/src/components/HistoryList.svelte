<script lang="ts">
  import { onMount } from "svelte";
  import type { HistoryEntry } from "@/lib/HistoryTree/HistoryEntry";
  import { Debouncer as Debouncer } from "@/lib/Debouncer";

  let history: HistoryEntry[] = [];
  let isLoading = true;
  let error: string | undefined;
  let searchTerm = "";
  let startDate = "";
  let endDate = "";

  const loadingDebouncer = new Debouncer(30, () => isLoading = true, () => isLoading = false);

  // Request history data from background script instead of creating repositories here
  async function loadHistory(): Promise<HistoryEntry[]> {
    try {
      console.log('HistoryList: Requesting history data from background script...');
      const response = await browser.runtime.sendMessage({
        type: 'GET_HISTORY_DATA',
        searchTerm,
        startDate,
        endDate
      });
      
      if (response && response.type === 'GET_HISTORY_DATA_RESPONSE') {
        if (Array.isArray(response.payload)) {
          console.log('HistoryList: Received history data:', response.payload.length, 'entries');
          console.log('HistoryList: Sample entry for debugging:', response.payload[0]);
          
          // Convert ISO string timestamps back to Date objects for UI
          const processedEntries = response.payload.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
          
          console.log('HistoryList: Sample processed entry:', processedEntries[0]);
          return processedEntries;
        } else if (response.payload && response.payload.error) {
          console.error('HistoryList: Error from background script:', response.payload.error);
          throw new Error(response.payload.error);
        }
      }
      
      console.warn('HistoryList: Invalid response format:', response);
      return [];
    } catch (error) {
      console.error('HistoryList: Error requesting history data:', error);
      throw error;
    }
  }

  // Format date to a readable string
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("default", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
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

  // Get URL parts for styled display
  function getUrlParts(url: string): { schema: string; host: string; path: string; query: string } {
    try {
      const urlObj = new URL(url);
      return {
        schema: urlObj.protocol + "//",
        host: urlObj.hostname,
        path: urlObj.pathname,
        query: urlObj.search + urlObj.hash
      };
    } catch (e) {
      return {
        schema: "",
        host: url,
        path: "",
        query: ""
      };
    }
  }

  // Get description from metadata (Open Graph or meta description)
  function getDescription(entry: any): string | null {
    if (!entry.metadata) return null;
    
    // Priority: og:description > twitter:description > meta:description
    return entry.metadata['og:description'] || 
           entry.metadata['twitter:description'] || 
           entry.metadata['meta:description'] || 
           null;
  }

  // Load history data from background script
  async function loadHistoryData() {
    loadingDebouncer.start();

    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (end) {
        // Set to the end of the day to include all entries for that day
        end.setHours(23, 59, 59, 999);
      }

      history = await loadHistory();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load history";
    } finally {
      loadingDebouncer.stop();
    }
  }

  onMount(() => {
    loadHistoryData();
  });

  function handleSearch() {
    loadHistoryData();
  }

  function clearFilters() {
    searchTerm = "";
    startDate = "";
    endDate = "";
    loadHistoryData();
  }
</script>

<div class="history-container">
  <div class="controls">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Search history..."
      class="search-box"
      on:input={handleSearch}
    />
    <input
      type="date"
      class="date-input"
      bind:value={startDate}
      on:change={handleSearch}
    />
    <input
      type="date"
      class="date-input"
      bind:value={endDate}
      on:change={handleSearch}
    />
    <button class="refresh-btn" on:click={loadHistory} disabled={isLoading} hidden>
      {isLoading ? "Loading..." : "Refresh"}
    </button>
  </div>

  <div class="list-wrapper">
    {#if error}
      <div class="error-message">
        Error: {error}
      </div>
    {/if}

    {#if isLoading}
      <div class="loading">Loading history...</div>
    {:else if history.length === 0}
      <div class="empty-state">
        {#if searchTerm || startDate || endDate}
          <p>No history entries match your search.</p>
          <button class="secondary-btn" on:click={clearFilters}
            >Clear filters</button
          >
        {:else}
          <p>Your browsing history is empty.</p>
          <p class="subtle">Pages you visit will appear here.</p>
        {/if}
      </div>
    {:else}
      <ul class="history-list">
        {#each history as entry (entry.id)}
          <li class="history-item">
            <a href={entry.url} target="_blank" rel="noopener noreferrer">
              <div class="history-item-content">
                <div class="favicon-container">
                  {#if entry.favicon}
                    <img
                      class="favicon"
                      src={entry.favicon}
                      alt=""
                      width="20"
                      height="20"
                    />
                  {:else}
                    <svg
                      class="favicon-placeholder"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path
                        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                      />
                    </svg>
                  {/if}
                </div>
                <div class="entry-info">
                  <div
                    class="history-item-title"
                    title={entry.title || entry.url}
                  >
                    {entry.title || entry.url}
                  </div>
                  <div class="history-item-url" title={entry.url}>
                    {#if getUrlParts(entry.url).schema}<span class="url-schema">{getUrlParts(entry.url).schema}</span>{/if}<span class="url-host">{getUrlParts(entry.url).host}</span>{#if getUrlParts(entry.url).path && getUrlParts(entry.url).path !== '/'}<span class="url-path">{getUrlParts(entry.url).path}</span>{/if}{#if getUrlParts(entry.url).query}<span class="url-query">{getUrlParts(entry.url).query}</span>{/if}
                  </div>
                  {#if getDescription(entry)}
                    <div class="history-item-description" title={getDescription(entry)}>
                      {getDescription(entry)}
                    </div>
                  {/if}
                </div>
                <div class="history-item-time">
                  {formatDate(entry.timestamp)}
                </div>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .history-container {
    display: flex;
    flex-direction: column;
    height: 580px;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    background-color: #fff;
    color: #202124;
  }

  .list-wrapper {
    flex-grow: 1;
    overflow-y: auto;
    min-height: 0;
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    color: #3c4043;
    margin-top: 0;
    margin-bottom: 16px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
  }

  .search-box {
    flex: 1 1 100%;
    order: 1;
    padding: 10px 16px;
    font-size: 14px;
    border: 1px solid #dfe1e5;
    border-radius: 24px;
    outline: none;
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }

  .search-box:hover {
    border-color: #cdd1d5;
  }

  .search-box:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 1px #1a73e8;
  }

  .date-input {
    flex: 1 1 auto;
    order: 2;
    padding: 10px;
    font-size: 14px;
    border: 1px solid #dfe1e5;
    border-radius: 6px;
  }

  .refresh-btn {
    order: 3;
    background-color: #1a73e8;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .refresh-btn:disabled {
    background-color: #e0e0e0;
    color: #a0a0a0;
    cursor: not-allowed;
  }

  .refresh-btn:hover:not(:disabled) {
    background-color: #185abc;
  }

  .error-message {
    color: #d93025;
    padding: 12px;
    background-color: #fce8e6;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .loading,
  .empty-state {
    text-align: center;
    color: #5f6368;
    padding: 40px 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }

  .empty-state p {
    margin: 0 0 12px;
  }

  .empty-state .subtle {
    color: #80868b;
    font-size: 14px;
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

  .history-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .history-item {
    border-bottom: 1px solid #e8eaed;
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-item a {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: 8px 4px; /* REDUCE padding */
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .history-item a:hover {
    background-color: #f8f9fa;
  }

  .history-item-content {
    display: flex;
    align-items: center;
    gap: 12px; /* REDUCE gap */
  }

  .favicon-container {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .favicon {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }

  .favicon-placeholder {
    width: 20px;
    height: 20px;
    color: #5f6368;
  }

  .entry-info { 
    flex-grow: 1;
    min-width: 0; /* Important for text-overflow to work in flex children */
  }

  .history-item-title {
    font-size: 14px;
    font-weight: 400;
    color: #202124;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-item-url {
    color: #5f6368;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; */
  }

  .history-item-description {
    color: #5f6368;
    font-size: 11px;
    line-height: 1.3;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-style: italic;
  }

  .url-schema {
    color: #80868b;
    font-weight: 300;
  }

  .url-host {
    color: #202124;
    font-weight: 600;
  }

  .url-path {
    color: #5f6368;
    font-weight: 400;
  }

  .url-query {
    color: #80868b;
    font-weight: 300;
  }

  .history-item-time {
    color: #5f6368;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
