// Monitor extension logs for IndexedDB operations
// Run this in the extension's background page console

console.log('=== Extension Log Monitor Started ===');

// Override console methods to add timestamps and context
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  if (args.some(arg => typeof arg === 'string' && (
    arg.includes('IndexedDB') || 
    arg.includes('Database') || 
    arg.includes('Repository') || 
    arg.includes('Schema') ||
    arg.includes('background:') ||
    arg.includes('Background:')
  ))) {
    originalLog(`[${new Date().toISOString()}] 🔍`, ...args);
  } else {
    originalLog(...args);
  }
};

console.error = function(...args) {
  originalError(`[${new Date().toISOString()}] ❌`, ...args);
};

console.warn = function(...args) {
  originalWarn(`[${new Date().toISOString()}] ⚠️`, ...args);
};

console.log('Log monitor installed. IndexedDB operations will be highlighted.');

// Also check current IndexedDB state
setTimeout(async () => {
  try {
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases();
      console.log('Current IndexedDB databases:', databases);
    }
  } catch (error) {
    console.error('Error listing databases:', error);
  }
}, 1000);
