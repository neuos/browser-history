// Test server sync events - run this in browser console
// This will check what events are available on the server

async function checkServerEvents() {
  console.log('=== Checking Server Sync Events ===');
  
  try {
    // Get device info to get the auth token
    const deviceResponse = await chrome.runtime.sendMessage({
      type: 'GET_DEVICE_INFO'
    });
    
    if (!deviceResponse || !deviceResponse.payload) {
      console.error('No device info available');
      return;
    }
    
    const deviceInfo = deviceResponse.payload;
    console.log('Device Info:', deviceInfo);
    
    // Check server events
    const serverUrl = 'http://localhost:8000';
    const eventsUrl = `${serverUrl}/sync/events?since=0&exclude_device=false`; // Include all events
    
    console.log('Fetching from:', eventsUrl);
    
    const response = await fetch(eventsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${deviceInfo.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server request failed:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Server events response:', result);
    
    if (result.events && result.events.length > 0) {
      console.log(`Found ${result.events.length} events on server:`);
      result.events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
          id: event.id,
          type: event.eventType,
          entity: event.entityType,
          entityId: event.entityId,
          timestamp: new Date(event.timestamp).toLocaleString(),
          deviceId: event.deviceId,
          data: event.data
        });
      });
    } else {
      console.log('No events found on server');
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
    
    if (devicesResponse.ok) {
      const devicesResult = await devicesResponse.json();
      console.log('Registered devices:', devicesResult);
    }
    
  } catch (error) {
    console.error('Error checking server events:', error);
  }
}

// Export to global scope
window.checkServerEvents = checkServerEvents;

console.log('Server event checker loaded. Run checkServerEvents() to check what events are on the server.');
