// Test sync event creation and application
// This creates test sync events to verify the sync pipeline works

async function createTestSyncEvent() {
  console.log('=== Creating Test Sync Event ===');
  
  try {
    // Create a test history sync event
    const testEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'CREATE',
      entityType: 'history',
      entityId: crypto.randomUUID(),
      deviceId: 'test-device-999',
      data: {
        id: crypto.randomUUID(),
        deviceId: 'test-device-999',
        url: 'https://test-sync-event.example.com',
        tabId: 999,
        timestamp: Date.now(),
        navigationSourceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };
    
    console.log('Test event created:', testEvent);
    
    // Send directly to background script for processing
    console.log('Sending APPLY_SYNC_EVENT to background script...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'APPLY_SYNC_EVENT',
      event: testEvent
    });
    
    console.log('Background script response:', response);
    
    // Wait a bit then check repository count
    setTimeout(async () => {
      const countResponse = await chrome.runtime.sendMessage({
        type: 'GET_REPOSITORY_COUNT'
      });
      console.log('Repository count after test event:', countResponse);
    }, 1000);
    
  } catch (error) {
    console.error('Error creating test sync event:', error);
  }
}

async function createTestPageEvent() {
  console.log('=== Creating Test Page Sync Event ===');
  
  try {
    // Create a test page sync event
    const testEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'CREATE',
      entityType: 'page',
      entityId: 'https://test-page-sync.example.com',
      deviceId: 'test-device-999',
      data: {
        url: 'https://test-page-sync.example.com',
        title: 'Test Page Sync Event',
        favicon: 'https://test-page-sync.example.com/favicon.ico',
        lastUpdate: Date.now(),
        metadata: {
          description: 'Test page for sync event verification'
        }
      }
    };
    
    console.log('Test page event created:', testEvent);
    
    // Send directly to background script for processing
    console.log('Sending APPLY_SYNC_EVENT to background script...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'APPLY_SYNC_EVENT',
      event: testEvent
    });
    
    console.log('Background script response:', response);
    
    // Wait a bit then check repository count
    setTimeout(async () => {
      const countResponse = await chrome.runtime.sendMessage({
        type: 'GET_REPOSITORY_COUNT'
      });
      console.log('Repository count after test page event:', countResponse);
    }, 1000);
    
  } catch (error) {
    console.error('Error creating test page event:', error);
  }
}

// Export to global scope
window.createTestSyncEvent = createTestSyncEvent;
window.createTestPageEvent = createTestPageEvent;

console.log('Test sync event creators loaded.');
console.log('- Run createTestSyncEvent() to test history event processing');
console.log('- Run createTestPageEvent() to test page event processing');
