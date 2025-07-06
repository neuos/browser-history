// Test script to verify sync event application
// Run this in the browser console after the extension is loaded

(async () => {
  console.log('=== Testing Sync Event Application ===');
  
  // First, check if sync is configured
  const isConfigured = await browser.runtime.sendMessage({
    type: 'IS_CONFIGURED'
  });
  console.log('Sync configured?', isConfigured);
  
  if (!isConfigured.payload.isConfigured) {
    console.log('Setting up sync first...');
    const setupResult = await browser.runtime.sendMessage({
      type: 'SETUP_SYNC',
      payload: {
        serverUrl: 'http://localhost:8000',
        deviceName: 'test-device-d',
        sharedSecret: 'secret'
      }
    });
    console.log('Setup result:', setupResult);
  }
  
  // Get device info
  const deviceInfo = await browser.runtime.sendMessage({
    type: 'GET_DEVICE_INFO'
  });
  console.log('Device info:', deviceInfo);
  
  // Perform a full sync to download events
  console.log('Performing full sync...');
  const syncResult = await browser.runtime.sendMessage({
    type: 'PERFORM_FULL_SYNC'
  });
  console.log('Sync result:', syncResult);
  
  // Check sync status
  const status = await browser.runtime.sendMessage({
    type: 'GET_SYNC_STATUS'
  });
  console.log('Sync status:', status);
  
  console.log('=== Test completed ===');
  console.log('Check the background script console for detailed logs about sync event application');
})();
