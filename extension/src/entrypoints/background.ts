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

export default defineBackground(() => {
  console.log('Background: defineBackground called');
  
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
    
    // Test IndexedDB operations with proper error handling
    console.log('Background: Testing IndexedDB operations...');
    try {
      console.log('Background: Attempting to get all pages...');
      const pages = await pageRepository.getAll();
      console.log(`Background: Successfully found ${pages.length} pages in the repository.`);

      console.log('Background: Attempting to get all histories...');
      const histories = await historyRepository.getAll();
      console.log(`Background: Successfully found ${histories.length} history nodes in the repository.`);
      
      // Store initial counts for comparison
      (globalThis as any).initialHistoryCount = histories.length;
      (globalThis as any).initialPageCount = pages.length;
      
      // Test creating a simple history node
      const testNode = new HistoryNode(999, 'https://test.example.com/background-test', null);
      testNode.deviceId = 'test-device-id' as any; // Type assertion for testing
      console.log('Background: Creating test history node:', testNode);
      await historyRepository.add(testNode);
      console.log('Background: Test history node created successfully');
      
      // Verify it was saved
      const savedNode = await historyRepository.get(testNode.id);
      console.log('Background: Retrieved test node:', savedNode);
      
      // Check new total
      const newHistories = await historyRepository.getAll();
      console.log(`Background: After test, found ${newHistories.length} history nodes (was ${histories.length})`);
    } catch (error) {
      console.error('Background: Error testing IndexedDB:', error);
    }

    // Set up periodic repository count checking
    setInterval(async () => {
      try {
        const currentHistories = await historyRepository.getAll();
        const currentPages = await pageRepository.getAll();
        const initialHistoryCount = (globalThis as any).initialHistoryCount || 0;
        const initialPageCount = (globalThis as any).initialPageCount || 0;
        
        console.log(`Background: Repository status - History: ${currentHistories.length} (was ${initialHistoryCount}), Pages: ${currentPages.length} (was ${initialPageCount})`);
        
        if (currentHistories.length > initialHistoryCount) {
          console.log('Background: 🎉 New history entries detected!');
          (globalThis as any).initialHistoryCount = currentHistories.length;
        }
        if (currentPages.length > initialPageCount) {
          console.log('Background: 🎉 New page entries detected!');
          (globalThis as any).initialPageCount = currentPages.length;
        }
      } catch (error) {
        console.error('Background: Error checking repository counts:', error);
      }
    }, 10000); // Check every 10 seconds

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
      console.log('Background: Message received:', message.type);
      
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

      if (message.type === 'PERFORM_FULL_SYNC') {
        console.log('Background: Handling PERFORM_FULL_SYNC message')
        syncService.performFullSync()
          .then(() => {
            sendResponse({
              type: 'PERFORM_FULL_SYNC_RESPONSE',
              payload: { success: true }
            })
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

      // Test repository operations manually
      if (message.type === 'TEST_REPOSITORY_OPERATIONS') {
        console.log('Background: Handling TEST_REPOSITORY_OPERATIONS message');
        
        // Handle the async operation properly
        (async () => {
          try {
            console.log('Background: Testing repository operations on demand...');
            
            // Get current counts
            const beforeHistories = await historyRepository.getAll();
            const beforePages = await pageRepository.getAll();
            console.log(`Background: Before test - History: ${beforeHistories.length}, Pages: ${beforePages.length}`);
            
            // Create test history node
            const testNode = new HistoryNode(888, 'https://manual-test.example.com', null);
            testNode.deviceId = 'manual-test-device' as any;
            console.log('Background: Creating manual test history node:', testNode);
            await historyRepository.add(testNode);
            
            // Verify
            const savedNode = await historyRepository.get(testNode.id);
            console.log('Background: Manual test - saved node:', savedNode);
            
            // Get updated counts
            const afterHistories = await historyRepository.getAll();
            const afterPages = await pageRepository.getAll();
            console.log(`Background: After test - History: ${afterHistories.length}, Pages: ${afterPages.length}`);
            
            // Send successful response
            sendResponse({
              type: 'TEST_REPOSITORY_OPERATIONS_RESPONSE',
              payload: { 
                success: true, 
                before: { history: beforeHistories.length, pages: beforePages.length },
                after: { history: afterHistories.length, pages: afterPages.length },
                saved: !!savedNode
              }
            });
          } catch (error) {
            console.error('Background: Repository test failed:', error);
            // Send error response
            sendResponse({
              type: 'TEST_REPOSITORY_OPERATIONS_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        })().catch(error => {
          // Fallback error handler in case the async function itself fails
          console.error('Background: Critical error in repository test:', error);
          sendResponse({
            type: 'TEST_REPOSITORY_OPERATIONS_RESPONSE',
            payload: { success: false, error: 'Critical error in test execution' }
          });
        });
        
        return true; // Keep message channel open for async response
      }

      if (message.type === 'CHECK_SERVER_EVENTS') {
        console.log('Background: Handling CHECK_SERVER_EVENTS message');
        (async () => {
          try {
            // Get device info to get the auth token
            const deviceInfo = await syncService.getDeviceInfo();
            
            if (!deviceInfo) {
              console.error('Background: No device info available for server check');
              sendResponse({
                type: 'CHECK_SERVER_EVENTS_RESPONSE',
                payload: { success: false, error: 'No device info available' }
              });
              return;
            }
            
            console.log('Background: Device Info for server check:', deviceInfo);
            
            // Check server events
            const serverUrl = 'http://localhost:8000';
            const eventsUrl = `${serverUrl}/sync/events?since=0&exclude_device=false`; // Include all events
            
            console.log('Background: Fetching from:', eventsUrl);
            
            const response = await fetch(eventsUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${deviceInfo.token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Background: Server request failed:', response.status, errorText);
              sendResponse({
                type: 'CHECK_SERVER_EVENTS_RESPONSE',
                payload: { success: false, error: `Server request failed: ${response.status} ${errorText}` }
              });
              return;
            }
            
            const result = await response.json();
            console.log('Background: Server events response:', result);
            
            const events = result.events || [];
            console.log(`Background: Found ${events.length} events on server`);
            
            if (events.length > 0) {
              events.forEach((event: any, index: number) => {
                console.log(`Background: Event ${index + 1}:`, {
                  id: event.id,
                  type: event.eventType,
                  entity: event.entityType,
                  entityId: event.entityId,
                  timestamp: new Date(event.timestamp).toLocaleString(),
                  deviceId: event.deviceId,
                  data: event.data
                });
              });
            }
            
            // Also check device list
            const devicesUrl = `${serverUrl}/sync/devices`;
            const devicesResponse = await fetch(devicesUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${deviceInfo.token}`,
                'Content-Type': 'application/json'
              }
            });
            
            let devices = [];
            if (devicesResponse.ok) {
              const devicesResult = await devicesResponse.json();
              devices = devicesResult.devices || [];
              console.log('Background: Registered devices:', devices);
            } else {
              console.warn('Background: Failed to fetch devices');
            }
            
            sendResponse({
              type: 'CHECK_SERVER_EVENTS_RESPONSE',
              payload: { 
                success: true, 
                events: events,
                devices: devices
              }
            });
            
          } catch (error) {
            console.error('Background: Error checking server events:', error);
            sendResponse({
              type: 'CHECK_SERVER_EVENTS_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        })();
        return true; // Keep message channel open for async response
      }

      if (message.type === 'RESET_SYNC_TIMESTAMP') {
        console.log('Background: Handling RESET_SYNC_TIMESTAMP message');
        (async () => {
          try {
            // Reset the sync timestamp using the proper method
            await syncService.resetSyncTimestamp();
            console.log('Background: Successfully reset sync timestamp');
            
            sendResponse({
              type: 'RESET_SYNC_TIMESTAMP_RESPONSE',
              payload: { success: true }
            });
            
          } catch (error) {
            console.error('Background: Error resetting sync timestamp:', error);
            sendResponse({
              type: 'RESET_SYNC_TIMESTAMP_RESPONSE',
              payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        })();
        return true; // Keep message channel open for async response
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
