// Simple test to validate sync functionality in browser console
// Run this in the browser extension's background script console

console.log('=== Sync Test ===');

// Test 1: Check if sync service is initialized
console.log('1. Testing sync service initialization...');
try {
  // This assumes we're running in the background script context
  console.log('SyncService status:', syncService?.getStatus());
} catch (error) {
  console.error('Failed to get sync service status:', error);
}

// Test 2: Check if sync is configured
console.log('2. Testing sync configuration...');
syncService?.isConfigured().then(configured => {
  console.log('Sync configured:', configured);
}).catch(error => {
  console.error('Failed to check sync configuration:', error);
});

// Test 3: Check device info
console.log('3. Testing device info...');
syncService?.getDeviceInfo().then(deviceInfo => {
  console.log('Device info:', deviceInfo);
}).catch(error => {
  console.error('Failed to get device info:', error);
});

// Test 4: Simulate a sync event
console.log('4. Testing sync event submission...');
// This would require importing the necessary types, so we'll just log for now
console.log('To test sync events, navigate to a new page and check the logs.');

console.log('=== End Sync Test ===');
