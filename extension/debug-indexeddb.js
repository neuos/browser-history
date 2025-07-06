// Debug script to check IndexedDB state in the browser extension context
console.log('=== IndexedDB Debug Script ===');

// Function to list all databases
async function listDatabases() {
  try {
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases();
      console.log('All IndexedDB databases:', databases);
      return databases;
    } else {
      console.log('indexedDB.databases() not supported');
      return [];
    }
  } catch (error) {
    console.error('Error listing databases:', error);
    return [];
  }
}

// Function to check a specific database
async function checkDatabase(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    console.log(`Checking database: ${dbName}, version: ${version}`);
    
    const request = indexedDB.open(dbName, version);
    
    request.onerror = () => {
      console.error(`Error opening database ${dbName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      console.log(`Database ${dbName} opened successfully`);
      console.log('Object stores:', Array.from(db.objectStoreNames));
      
      // Check each object store
      Array.from(db.objectStoreNames).forEach(storeName => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          console.log(`Store ${storeName} has ${countRequest.result} items`);
        };
        countRequest.onerror = () => {
          console.error(`Error counting items in ${storeName}:`, countRequest.error);
        };
      });
      
      db.close();
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log(`Database ${dbName} upgrade needed. Old version: ${event.oldVersion}, New version: ${event.newVersion}`);
      const db = request.result;
      console.log('Object stores during upgrade:', Array.from(db.objectStoreNames));
    };
  });
}

// Function to delete a database
async function deleteDatabase(dbName) {
  return new Promise((resolve, reject) => {
    console.log(`Deleting database: ${dbName}`);
    
    const deleteRequest = indexedDB.deleteDatabase(dbName);
    
    deleteRequest.onerror = () => {
      console.error(`Error deleting database ${dbName}:`, deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onsuccess = () => {
      console.log(`Database ${dbName} deleted successfully`);
      resolve();
    };
    
    deleteRequest.onblocked = () => {
      console.warn(`Delete blocked for database ${dbName}. Close all connections first.`);
    };
  });
}

// Main execution
(async () => {
  console.log('1. Listing all databases...');
  await listDatabases();
  
  console.log('2. Checking browser-history-db...');
  try {
    await checkDatabase('browser-history-db');
  } catch (error) {
    console.log('Database does not exist or has issues:', error.message);
  }
  
  // If you want to delete the database to start fresh, uncomment:
  // console.log('3. Deleting browser-history-db to start fresh...');
  // try {
  //   await deleteDatabase('browser-history-db');
  //   console.log('Database deleted. Restart the extension to recreate it.');
  // } catch (error) {
  //   console.error('Error deleting database:', error);
  // }
})();
