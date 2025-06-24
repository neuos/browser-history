import { initializeDeviceID } from "@/lib/HistoryTree/DeviceID";
import { HistoryRepositoryIndexedDB } from "@/lib/HistoryTree/HistoryRepositoryIndexedDB";
import { PageRepositoryIndexedDB } from "@/lib/HistoryTree/PageRepositoryIndexedDB";
import { HistoryService } from "@/lib/HistoryTree/HistoryService";
import { SPA_URL_CHANGE, PAGE_METADATA_EXTRACTED } from "@/message";
import { Page } from "@/lib/HistoryTree/HistoryNode";

export default defineBackground(() => {
  (async () => {
    await initializeDeviceID();
    console.log('browser history extension started');

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
          }
          
          await pageRepository.addOrUpdate(page);
          console.log('Updated page metadata for', url);
        } catch (error) {
          console.error('Error updating page metadata:', error);
        }
      }
    });
  })();
});
