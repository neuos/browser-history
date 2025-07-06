// Monitor IndexedDB state before and after sync operations
// Run this in the browser console to check if sync events are persisted

async function monitorIndexedDB() {
  console.log('=== IndexedDB Monitor - Pre-Sync State ===');
  
  // Check the history tree repository
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_REPOSITORY_COUNT'
    });
    
    console.log('Current repository state:', response);
  } catch (error) {
    console.error('Failed to get repository count:', error);
  }
  
  console.log('=== Please perform sync now, then run monitorIndexedDBAfterSync() ===');
}

async function monitorIndexedDBAfterSync() {
  console.log('=== IndexedDB Monitor - Post-Sync State ===');
  
  // Check the history tree repository again
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_REPOSITORY_COUNT'
    });
    
    console.log('Updated repository state:', response);
  } catch (error) {
    console.error('Failed to get repository count:', error);
  }
  
  // Also check raw IndexedDB
  try {
    const dbs = await indexedDB.databases();
    console.log('Available IndexedDB databases:', dbs);
    
    // Check our specific database
    const dbName = 'browser-history-extension';
    const request = indexedDB.open(dbName);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('IndexedDB opened successfully:', db.name, 'version:', db.version);
      console.log('Object stores:', Array.from(db.objectStoreNames));
      db.close();
    };
    
    request.onerror = function(event) {
      console.error('Failed to open IndexedDB:', event.target.error);
    };
  } catch (error) {
    console.error('Failed to check IndexedDB:', error);
  }
}

// Export functions to global scope
window.monitorIndexedDB = monitorIndexedDB;
window.monitorIndexedDBAfterSync = monitorIndexedDBAfterSync;

console.log('IndexedDB monitoring functions loaded. Run monitorIndexedDB() to start.');
