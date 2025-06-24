import { initializeDeviceID } from "@/lib/HistoryTree/DeviceID";
import { HistoryRepositoryIndexedDB } from "@/lib/HistoryTree/HistoryRepositoryIndexedDB";
import { PageRepositoryIndexedDB } from "@/lib/HistoryTree/PageRepositoryIndexedDB";
import { HistoryService } from "@/lib/HistoryTree/HistoryService";
import { SPA_URL_CHANGE, PAGE_METADATA_EXTRACTED } from "@/message";
import { Page } from "@/lib/HistoryTree/HistoryNode";
import { syncService } from "@/lib/sync/SyncService";

export default defineBackground(() => {
  (async () => {
    await initializeDeviceID();
    console.log('browser history extension started');

    // Initialize sync service
    await syncService.initialize();

    const pageRepository = new PageRepositoryIndexedDB();
    const historyRepository = new HistoryRepositoryIndexedDB();
    
    const pages = await pageRepository.getAll();
    console.log(`Found ${pages.length} pages in the repository.`);

    const histories = await historyRepository.getAll();
    console.log(`Found ${histories.length} history nodes in the repository.`);

    // Create the history service
    const historyService = new HistoryService(historyRepository, pageRepository);

    // Clean up when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      historyService.onTabClosed(tabId);
    });

    // Handle standard navigation events
    browser.webNavigation.onCommitted.addListener(async (details) => {
      // Only handle main frame navigations
      if (details.frameId !== 0) return;
      
      await historyService.onNavigationCommitted(details);
      
      // Sync the navigation if sync is configured
      // Note: The HistoryService would need to be modified to expose the created node
      // For now, we'll handle sync events in a separate message listener
    });

    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      await historyService.onTabUpdated(changeInfo, tab);
    });

    // Handle SPA navigation events from content script
    browser.runtime.onMessage.addListener(async (message, sender) => {
      if (message.type === SPA_URL_CHANGE && sender.tab?.id) {
        await historyService.handleSpaNavigation({
          url: message.url,
          tabId: sender.tab.id,
          title: sender.tab.title
        });
      }
      
      // Handle metadata extraction from content script
      if (message.type === PAGE_METADATA_EXTRACTED) {
        const { url, title, metadata, timestamp } = message.payload;
        console.log('Received metadata for', url, metadata);
        
        try {
          // Get existing page or create new one
          let page = await pageRepository.get(url);
          let isNewPage = false;
          
          if (page) {
            // Update existing page with new metadata
            page.metadata = { ...page.metadata, ...metadata };
            if (title && !page.title) {
              page.title = title;
            }
            page.lastUpdate = new Date(timestamp);
          } else {
            // Create new page with metadata
            page = new Page(url, undefined, title, {
              ...metadata,
              metadataExtracted: timestamp,
              lastVisited: timestamp
            });
            isNewPage = true;
          }
          
          await pageRepository.addOrUpdate(page);
          console.log('Updated page metadata for', url);

          // Sync the page update
          if (syncService.isConfigured()) {
            if (isNewPage) {
              await syncService.syncPageCreated(page);
            } else {
              await syncService.syncPageUpdated(page);
            }
          }
        } catch (error) {
          console.error('Error updating page metadata:', error);
        }
      }

      // Handle sync events from sync service
      if (message.type === 'APPLY_SYNC_EVENT') {
        const { event } = message;
        
        try {
          if (event.entityType === 'history') {
            // Apply history sync event
            // Note: Would need to extend repositories to handle sync events
            console.log('Applying history sync event:', event);
          } else if (event.entityType === 'page') {
            // Apply page sync event
            const pageData = event.data;
            const page = new Page(
              pageData.url,
              pageData.favicon,
              pageData.title,
              pageData.metadata
            );
            page.lastUpdate = new Date(pageData.lastUpdate);
            
            await pageRepository.addOrUpdate(page);
            console.log('Applied page sync event for:', pageData.url);
          }
        } catch (error) {
          console.error('Error applying sync event:', error);
        }
      }
    });
  })();
});
