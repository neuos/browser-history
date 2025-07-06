// Enhanced test script to inspect IndexedDB storage state
// Run this in the browser console after the extension is loaded

(async () => {
  console.log('=== Browser History Extension Storage Inspection ===');
  
  try {
    // Open the IndexedDB database
    const dbRequest = indexedDB.open('browser-history-db', 1);
    
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });
    
    console.log('Database opened:', db.name, 'version:', db.version);
    console.log('Object stores:', Array.from(db.objectStoreNames));
    
    // Check history store
    if (db.objectStoreNames.contains('history')) {
      const historyTransaction = db.transaction(['history'], 'readonly');
      const historyStore = historyTransaction.objectStore('history');
      
      const historyCount = await new Promise((resolve, reject) => {
        const countRequest = historyStore.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });
      
      console.log('History entries count:', historyCount);
      
      // Get all history entries
      const historyEntries = await new Promise((resolve, reject) => {
        const getAllRequest = historyStore.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
      
      console.log('History entries:', historyEntries);
      
      // Group by device ID
      const byDevice = {};
      historyEntries.forEach(entry => {
        if (!byDevice[entry.deviceId]) {
          byDevice[entry.deviceId] = [];
        }
        byDevice[entry.deviceId].push(entry);
      });
      
      console.log('History entries by device:');
      Object.keys(byDevice).forEach(deviceId => {
        console.log(`  ${deviceId}: ${byDevice[deviceId].length} entries`);
        byDevice[deviceId].slice(0, 3).forEach(entry => {
          console.log(`    - ${entry.url} (${new Date(entry.timestamp).toISOString()})`);
        });
        if (byDevice[deviceId].length > 3) {
          console.log(`    ... and ${byDevice[deviceId].length - 3} more`);
        }
      });
    }
    
    // Check pages store
    if (db.objectStoreNames.contains('pages')) {
      const pagesTransaction = db.transaction(['pages'], 'readonly');
      const pagesStore = pagesTransaction.objectStore('pages');
      
      const pagesCount = await new Promise((resolve, reject) => {
        const countRequest = pagesStore.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });
      
      console.log('Pages count:', pagesCount);
      
      // Get a few sample pages
      const pages = await new Promise((resolve, reject) => {
        const getAllRequest = pagesStore.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
      
      console.log('Sample pages:', pages.slice(0, 5));
    }
    
    db.close();
    console.log('=== Inspection completed ===');
    
  } catch (error) {
    console.error('Error inspecting storage:', error);
  }
})();
