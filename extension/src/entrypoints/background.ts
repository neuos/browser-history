import { initializeDeviceID } from "@/lib/HistoryTree/DeviceID";
import { HistoryRepositoryIndexedDB } from "@/lib/HistoryTree/HistoryRepositoryIndexedDB";
import { PageRepositoryIndexedDB } from "@/lib/HistoryTree/PageRepositoryIndexedDB";
import { HistoryService } from "@/lib/HistoryTree/HistoryService";
import { SPA_URL_CHANGE, PAGE_METADATA_EXTRACTED } from "@/message";
import { Page } from "@/lib/HistoryTree/HistoryNode";
import { syncService } from "@/lib/sync/SyncService";
import type { 
  PopupToBackgroundMessage, 
  BackgroundToPopupMessage 
} from "@/lib/sync/messages";

export default defineBackground(() => {
  (async () => {
    await initializeDeviceID();
    console.log('Background: Browser history extension started');

    // Initialize sync service
    console.log('Background: Initializing sync service...');
    await syncService.initialize();
    console.log('Background: Sync service initialized');
    
    // Check sync configuration immediately
    const isConfigured = await syncService.isConfigured();
    console.log('Background: Sync configured?', isConfigured);
    
    if (isConfigured) {
      const deviceInfo = await syncService.getDeviceInfo();
      console.log('Background: Device info:', deviceInfo);
      const status = syncService.getStatus();
      console.log('Background: Sync status:', status);
    }

    const pageRepository = new PageRepositoryIndexedDB();
    const historyRepository = new HistoryRepositoryIndexedDB();
    
    const pages = await pageRepository.getAll();
    console.log(`Found ${pages.length} pages in the repository.`);

    const histories = await historyRepository.getAll();
    console.log(`Found ${histories.length} history nodes in the repository.`);

    // Create the history service with sync callbacks
    const historyService = new HistoryService(
      historyRepository, 
      pageRepository,
      {
        onHistoryNodeCreated: async (node) => {
          console.log('Background: onHistoryNodeCreated callback triggered for:', node.url)
          if (await syncService.isConfigured()) {
            console.log('Background: Sync is configured, calling syncHistoryNodeCreated')
            await syncService.syncHistoryNodeCreated(node);
          } else {
            console.log('Background: Sync not configured, skipping history node sync')
          }
        },
        onPageCreated: async (page) => {
          console.log('Background: onPageCreated callback triggered for:', page.url)
          if (await syncService.isConfigured()) {
            console.log('Background: Sync is configured, calling syncPageCreated')
            await syncService.syncPageCreated(page);
          } else {
            console.log('Background: Sync not configured, skipping page sync')
          }
        },
        onPageUpdated: async (page) => {
          console.log('Background: onPageUpdated callback triggered for:', page.url)
          if (await syncService.isConfigured()) {
            console.log('Background: Sync is configured, calling syncPageUpdated')
            await syncService.syncPageUpdated(page);
          } else {
            console.log('Background: Sync not configured, skipping page update sync')
          }
        }
      }
    );

    // Clean up when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      historyService.onTabClosed(tabId);
    });

    // Handle standard navigation events
    browser.webNavigation.onCommitted.addListener(async (details) => {
      // Only handle main frame navigations
      if (details.frameId !== 0) return;
      
      console.log('Background: Navigation committed to:', details.url)
      await historyService.onNavigationCommitted(details);
      // Sync is automatically handled by the HistoryService callbacks
    });

    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      await historyService.onTabUpdated(changeInfo, tab);
    });

    // Handle SPA navigation events from content script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === SPA_URL_CHANGE && sender.tab?.id) {
        // Handle async operation without blocking
        historyService.handleSpaNavigation({
          url: message.url,
          tabId: sender.tab.id,
          title: sender.tab.title
        }).catch(error => {
          console.error('Error handling SPA navigation:', error);
        });
      }
      
      // Handle metadata extraction from content script
      if (message.type === PAGE_METADATA_EXTRACTED) {
        const { url, title, metadata, timestamp } = message.payload;
        console.log('Received metadata for', url, metadata);
        
        // Handle async operations without blocking
        (async () => {
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
            if (await syncService.isConfigured()) {
              if (isNewPage) {
                await syncService.syncPageCreated(page);
              } else {
                await syncService.syncPageUpdated(page);
              }
            }
          } catch (error) {
            console.error('Error updating page metadata:', error);
          }
        })();
      }

      // Handle popup sync messages
      if (message.type === 'SETUP_SYNC') {
        console.log('Background: Handling SETUP_SYNC message')
        const { serverUrl, deviceName, sharedSecret } = message.payload
        
        syncService.setupSync(serverUrl, deviceName, sharedSecret)
          .then(deviceInfo => {
            sendResponse({
              type: 'SETUP_SYNC_RESPONSE',
              payload: { success: true, deviceInfo }
            })
          })
          .catch(error => {
            console.error('Background: Setup sync failed:', error)
            sendResponse({
              type: 'SETUP_SYNC_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            })
          })
        return true // Keep message channel open for async response
      }

      if (message.type === 'IS_CONFIGURED') {
        console.log('Background: Handling IS_CONFIGURED message')
        syncService.isConfigured()
          .then(isConfigured => {
            sendResponse({
              type: 'IS_CONFIGURED_RESPONSE',
              payload: { isConfigured }
            })
          })
          .catch(error => {
            console.error('Background: isConfigured failed:', error)
            sendResponse({
              type: 'IS_CONFIGURED_RESPONSE',
              payload: { isConfigured: false }
            })
          })
        return true // Keep message channel open for async response
      }

      if (message.type === 'GET_DEVICE_INFO') {
        console.log('Background: Handling GET_DEVICE_INFO message')
        syncService.getDeviceInfo()
          .then(deviceInfo => {
            sendResponse({
              type: 'DEVICE_INFO_RESPONSE',
              payload: deviceInfo
            })
          })
          .catch(error => {
            console.error('Background: getDeviceInfo failed:', error)
            sendResponse({
              type: 'DEVICE_INFO_RESPONSE',
              payload: null
            })
          })
        return true // Keep message channel open for async response
      }

      if (message.type === 'GET_SYNC_STATUS') {
        console.log('Background: Handling GET_SYNC_STATUS message')
        const status = syncService.getStatus()
        sendResponse({
          type: 'SYNC_STATUS_RESPONSE',
          payload: {
            isConnected: status.isConnected,
            lastSync: status.lastSync,
            pendingEvents: status.pendingEvents,
            successfulSyncs: status.successfulSyncs,
            error: status.error
          }
        })
        return false // Synchronous response
      }

      if (message.type === 'CLEAR_CONFIGURATION') {
        console.log('Background: Handling CLEAR_CONFIGURATION message')
        syncService.clearConfiguration()
          .then(() => {
            sendResponse({
              type: 'CLEAR_CONFIGURATION_RESPONSE',
              payload: { success: true }
            })
          })
          .catch(error => {
            console.error('Background: clearConfiguration failed:', error)
            sendResponse({
              type: 'CLEAR_CONFIGURATION_RESPONSE',
              payload: { success: false }
            })
          })
        return true // Keep message channel open for async response
      }

      // Handle sync events from sync service
      if (message.type === 'APPLY_SYNC_EVENT') {
        const { event } = message;
        
        // Handle this asynchronously without blocking
        (async () => {
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
        })();
        
        return false // No response needed
      }
    });
  })();
});
