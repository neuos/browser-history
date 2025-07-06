#!/usr/bin/env -S deno run --allow-all

// Test what device D should be downloading

const API_BASE = 'http://localhost:8000';

console.log('🔧 Testing Device D Download Process...');

// First, let's see if the API endpoint works without authentication
console.log('\n1️⃣ Testing API endpoint accessibility...');

try {
  const response = await fetch(`${API_BASE}/health`);
  if (response.ok) {
    console.log('✅ Backend is reachable');
  } else {
    console.log('❌ Backend health check failed');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Cannot reach backend:', error.message);
  process.exit(1);
}

// Test the sync events endpoint (this will fail with auth error, but we'll see the request)
console.log('\n2️⃣ Testing sync events endpoint (expect 401)...');

try {
  const response = await fetch(`${API_BASE}/sync/events?since=0&exclude_device=true`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer fake-token-for-device-d`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`📡 Response status: ${response.status}`);
  const responseText = await response.text();
  console.log(`📄 Response body: ${responseText}`);
  
  if (response.status === 401) {
    console.log('✅ Expected 401 - authentication is working, extension needs valid JWT');
  }
} catch (error) {
  console.log('❌ Request failed:', error.message);
}

console.log('\n3️⃣ Instructions for debugging in browser:');
console.log('Open device D browser → DevTools → Console → Look for:');
console.log('  - "SyncClient: Starting bidirectional sync..."');
console.log('  - "SyncClient: Downloading events from other devices since: X"');
console.log('  - "SyncClient: Downloaded X events from other devices"');
console.log('  - Any error messages during sync');
console.log('');
console.log('If you see errors, they might be:');
console.log('  - JWT authentication failed (token expired/invalid)');
console.log('  - Network request failed');
console.log('  - Events downloaded but not applied to IndexedDB');
console.log('');
console.log('🔍 Check browser Application tab → Storage → IndexedDB → browser-history-db');
console.log('   Look for history entries from other devices');

console.log('\n4️⃣ Expected behavior when clicking "Sync Now":');
console.log('  1. performFullSync() called');
console.log('  2. GET /sync/events?since=0&exclude_device=true');
console.log('  3. Download 65 events (9 history + 56 pages)');
console.log('  4. Apply events to IndexedDB');
console.log('  5. Update lastDownloadTimestamp');
console.log('  6. History list refreshes with cross-device history');

console.log('\n💡 Possible fixes if sync is failing:');
console.log('  - Re-register device D if JWT expired');
console.log('  - Check browser network tab for failed requests');
console.log('  - Verify background script is running');
console.log('  - Check if popup is communicating with background script');
console.log('  - Look for IndexedDB permission issues');
