import { initializeDeviceID } from "@/lib/HistoryTree/DeviceID";
import { HistoryRepositoryIndexedDB } from "@/lib/HistoryTree/HistoryRepositoryIndexedDB";
import { PageRepositoryIndexedDB } from "@/lib/HistoryTree/PageRepositoryIndexedDB";
import { HistoryService } from "@/lib/HistoryTree/HistoryService";
import { SPA_URL_CHANGE, PAGE_METADATA_EXTRACTED } from "@/message";
import { Page, HistoryNode } from "@/lib/HistoryTree/HistoryNode";
import { syncService } from "@/lib/sync/SyncService";
import type { 
  PopupToBackgroundMessage, 
  BackgroundToPopupMessage 
} from "@/lib/sync/messages";

// Utility function to broadcast history updates to popup windows
async function broadcastHistoryUpdated(reason: 'sync_complete' | 'initial_load' | 'manual_refresh') {
  console.log('Background: Broadcasting HISTORY_UPDATED message, reason:', reason);
  
  try {
    // Send message to all connected tabs/popups
    await browser.runtime.sendMessage({
      type: 'HISTORY_UPDATED',
      payload: { reason }
    });
  } catch (error) {
    console.log('Background: Error broadcasting message (popup might not be open):', error);
    // This is normal - popup might not be open
  }
}

export default defineBackground(() => {
  console.log('Background: defineBackground called');
  
  // Theme-aware icon functionality
  const updateIconForTheme = async (isDark: boolean) => {
    try {
      const iconPrefix = isDark ? 'icon-dark' : 'icon';
      
      console.log('Background: Setting icon for', isDark ? 'dark' : 'light', 'theme');
      
      await browser.action.setIcon({
        path: {
          '16': `${iconPrefix}/16.png`,
          '32': `${iconPrefix}/32.png`,
          '48': `${iconPrefix}/48.png`,
          '96': `${iconPrefix}/96.png`,
          '128': `${iconPrefix}/128.png`
        }
      });
      
      console.log('Background: Icon updated successfully');
    } catch (error) {
      console.warn('Background: Failed to set theme icon:', error);
    }
  };

  // Initialize theme detection
  const initializeTheme = async () => {
    try {
      // Check stored theme preference
      const stored = await browser.storage.local.get(['currentTheme']);
      const isDark = stored.currentTheme === 'dark';
      console.log('Background: Initializing with stored theme:', stored.currentTheme || 'default(light)');
      updateIconForTheme(isDark);
    } catch (error) {
      console.warn('Background: Failed to load stored theme, using default light theme:', error);
      updateIconForTheme(false);
    }
  };
  
  initializeTheme();
  
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
          
          // Notify popup that new history has been created
          broadcastHistoryUpdated('manual_refresh');
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
      console.log('Background: Message received:', message.type);
      
      // Handle theme detection from offscreen document or content scripts
      if (message.type === 'THEME_DETECTED') {
        const { isDark } = message.payload;
        console.log('Background: Theme detected:', isDark ? 'dark' : 'light');
        updateIconForTheme(isDark);
        return false; // No async response needed
      }
      
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
            
            // Notify popup that sync has been set up and history might be updated
            console.log('Background: Broadcasting HISTORY_UPDATED message after sync setup')
            broadcastHistoryUpdated('sync_complete')
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

      if (message.type === 'PERFORM_FULL_SYNC') {
        console.log('Background: Handling PERFORM_FULL_SYNC message')
        syncService.performFullSync()
          .then(() => {
            sendResponse({
              type: 'PERFORM_FULL_SYNC_RESPONSE',
              payload: { success: true }
            })
            
            // Notify popup that history has been updated after sync
            console.log('Background: Broadcasting HISTORY_UPDATED message after sync completion')
            broadcastHistoryUpdated('sync_complete')
          })
          .catch(error => {
            console.error('Background: performFullSync failed:', error)
            sendResponse({
              type: 'PERFORM_FULL_SYNC_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            })
          })
        return true // Keep message channel open for async response
      }

      if (message.type === 'GET_HISTORY_DATA') {
        console.log('Background: Handling GET_HISTORY_DATA message', message);
        (async () => {
          try {
            console.log('Background: Getting history entries from repository...');
            
            // Get search parameters from message
            const { searchTerm, startDate, endDate } = message;
            
            // Convert date strings back to Date objects if provided
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            
            // Get history entries using the service
            const historyEntries = await historyService.getHistoryEntries({
              query: searchTerm || undefined,
              startDate: start,
              endDate: end,
            });
            
            console.log(`Background: Found ${historyEntries.length} history entries for popup`);
            
            // Ensure all timestamps are properly serialized for message passing
            const processedEntries = historyEntries.map(entry => {
              if (!entry.timestamp) {
                console.error('Background: HistoryEntry missing timestamp:', entry);
                throw new Error(`History entry ${entry.id} for ${entry.url} has no timestamp`);
              }
              
              const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
              if (isNaN(timestamp.getTime())) {
                console.error('Background: HistoryEntry has invalid timestamp:', entry.timestamp, entry);
                throw new Error(`History entry ${entry.id} for ${entry.url} has invalid timestamp: ${entry.timestamp}`);
              }
              
              return {
                ...entry,
                timestamp: timestamp.toISOString()
              };
            });
            
            console.log('Background: Sample processed entry for popup:', processedEntries[0]);
            
            sendResponse({
              type: 'GET_HISTORY_DATA_RESPONSE',
              payload: processedEntries
            });
          } catch (error) {
            console.error('Background: Error getting history data:', error);
            sendResponse({
              type: 'GET_HISTORY_DATA_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        })();
        
        return true; // Keep message channel open for async response
      }

      return false; // Default: no async response needed
    });

    console.log('Background: Setup completed successfully');
  })().catch(error => {
    console.error('Background: Critical error during setup:', error);
  });
});
