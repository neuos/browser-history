<script lang="ts">
  import { onMount } from "svelte";
  import type { HistoryEntry } from "@/lib/HistoryTree/HistoryEntry";
  import { Debouncer as Debouncer } from "@/lib/Debouncer";
  import { emojiForDeviceId } from "@/lib/deviceColor";
  import { normalizeGuid } from "@/lib/guid";

  let history: HistoryEntry[] = [];
  let isLoading = true;
  let error: string | undefined;
  let searchTerm = "";
  let startDate = "";
  let endDate = "";
  let deviceMap = new Map<string, { deviceName: string; emoji?: string }>();

  const loadingDebouncer = new Debouncer(30, () => isLoading = true, () => isLoading = false);

  async function loadDevices() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_ALL_DEVICES' });
      if (response?.type === 'GET_ALL_DEVICES_RESPONSE') {
        deviceMap = new Map(
          response.payload.devices.map((d: { deviceId: string; deviceName: string; emoji?: string }) => [normalizeGuid(d.deviceId), d])
        );
      }
    } catch (e) {
      console.warn('HistoryList: Failed to load device list:', e);
    }
  }

  // Extension-hosted pages can't rely on <a target="_blank"> to open a real external tab - on
  // Firefox for Android specifically, the action popup is itself opened as an ordinary tab (not
  // a floating popup), so a target="_blank" click just navigates that same tab to the URL instead
  // of spawning a new one, replacing the whole history list with the destination page. Opening the
  // tab explicitly through the tabs API is the one approach that behaves the same everywhere.
  //
  // window.close() afterward is deliberate, not cleanup: without it the new tab opens in the
  // background while this popup/tab stays in front showing the exact same history list, so nothing
  // visibly happens from the user's perspective even though a tab really did open. Closing this one
  // surfaces the new tab immediately, matching how clicking a link in any other browser popup UI
  // (bookmarks, etc.) both opens the destination and dismisses the popup.
  async function openInNewTab(event: MouseEvent, url: string) {
    event.preventDefault();
    await browser.tabs.create({ url });
    window.close();
  }

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

  // Normalized so a device ID's textual casing (which has genuinely varied across data sources
  // in the past - see guid.ts) can't cause a device to fail to match its own metadata/color.
  // Falls back to the raw value on malformed input rather than crashing the whole list render.
  function normalizedDeviceId(entry: HistoryEntry): string {
    try {
      return normalizeGuid(entry.deviceId);
    } catch {
      return entry.deviceId;
    }
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
    loadDevices();

    // Listen for history update messages from background script
    const messageListener = (message: any) => {
      if (message.type === 'HISTORY_UPDATED') {
        console.log('HistoryList: Received HISTORY_UPDATED message, reason:', message.payload?.reason);
        // Reload history data when background script notifies us of updates
        loadHistoryData();
        // A device could have just been (re)configured or picked a new emoji - keep the map fresh
        loadDevices();
      }
    };
    
    browser.runtime.onMessage.addListener(messageListener);
    
    // Cleanup listener when component is destroyed
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
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
    <label class="date-field">
      <span class="date-label">From</span>
      <input
        type="date"
        class="date-input"
        bind:value={startDate}
        on:change={handleSearch}
      />
    </label>
    <label class="date-field">
      <span class="date-label">To</span>
      <input
        type="date"
        class="date-input"
        bind:value={endDate}
        on:change={handleSearch}
      />
    </label>
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
            <a href={entry.url} target="_blank" rel="noopener noreferrer" on:click={(e) => openInNewTab(e, entry.url)}>
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
                <div
                  class="device-indicator"
                  title={deviceMap.get(normalizedDeviceId(entry))?.deviceName || 'Unknown device'}
                >
                  <span class="device-emoji">{deviceMap.get(normalizedDeviceId(entry))?.emoji || emojiForDeviceId(normalizedDeviceId(entry))}</span>
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
    /* Fills the available height by default - this renders as a real mobile page,
       not a fixed-size desktop popup, so a hardcoded height leaves a dead gap
       below the list instead of reaching the bottom of the screen. */
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  /* Desktop/floating popups don't have a real page viewport to fill - give them
     a reasonable fixed size instead of collapsing to their content's minimum. */
  @media (min-width: 560px) {
    .history-container {
      height: 580px;
    }
  }

  .list-wrapper {
    flex-grow: 1;
    overflow-y: auto;
    min-height: 0;
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
    border: 1px solid var(--color-border);
    border-radius: 24px;
    outline: none;
    background: var(--color-bg);
    color: var(--color-text);
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }

  .search-box:hover {
    border-color: var(--color-text-tertiary);
  }

  .search-box:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 1px var(--color-accent);
  }

  /* WebKit (Orion iOS/iPadOS) draws an empty <input type="date"> as a blank box with no
     placeholder, so each input gets a visible caption instead of relying on the native one. */
  .date-field {
    flex: 1 1 140px;
    order: 2;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .date-label {
    font-size: 12px;
    color: var(--color-text-secondary, var(--color-text-tertiary));
  }

  .date-input {
    width: 100%;
    min-height: 40px;
    box-sizing: border-box;
    padding: 10px;
    font-size: 14px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .refresh-btn {
    order: 3;
    background-color: var(--color-accent);
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
    background-color: var(--color-border);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
  }

  .refresh-btn:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
  }

  .error-message {
    color: var(--color-danger);
    padding: 12px;
    background-color: var(--color-danger-bg);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .loading,
  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 40px 20px;
    background-color: var(--color-bg-secondary);
    border-radius: 8px;
  }

  .empty-state p {
    margin: 0 0 12px;
  }

  .empty-state .subtle {
    color: var(--color-text-tertiary);
    font-size: 14px;
  }

  .secondary-btn {
    background-color: transparent;
    color: var(--color-accent);
    border: 1px solid var(--color-border);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .secondary-btn:hover {
    background-color: var(--color-hover);
    border-color: var(--color-text-tertiary);
  }

  .history-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .history-item {
    border-bottom: 1px solid var(--color-border);
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-item a {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: 8px 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .history-item a:hover {
    background-color: var(--color-hover);
  }

  .history-item-content {
    display: flex;
    align-items: center;
    gap: 12px;
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
    color: var(--color-text-secondary);
  }

  .device-indicator {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .device-emoji {
    font-size: 12px;
    line-height: 1;
  }

  .entry-info {
    flex-grow: 1;
    min-width: 0; /* Important for text-overflow to work in flex children */
  }

  .history-item-title {
    font-size: 14px;
    font-weight: 400;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-item-url {
    color: var(--color-text-secondary);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-item-description {
    color: var(--color-text-secondary);
    font-size: 11px;
    line-height: 1.3;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-style: italic;
  }

  .url-schema {
    color: var(--color-text-tertiary);
    font-weight: 300;
  }

  .url-host {
    color: var(--color-text);
    font-weight: 600;
  }

  .url-path {
    color: var(--color-text-secondary);
    font-weight: 400;
  }

  .url-query {
    color: var(--color-text-tertiary);
    font-weight: 300;
  }

  .history-item-time {
    color: var(--color-text-secondary);
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
