#!/usr/bin/env -S deno run --allow-all

// Debug script for device D sync issues

import { Database } from "./src/database/database.ts";

const db = new Database("./data/history.db");

console.log('🔍 Debugging Device D Sync Issues...');

const deviceD_id = 'ca060099-d4a9-4f7a-aa97-26678b715406';

// Check device D registration
console.log('\n📱 Device D Registration:');
const deviceD = db.getDevice(deviceD_id);
if (deviceD) {
  console.log('✅ Device D found:', deviceD.deviceName, deviceD.deviceId);
  console.log('📅 Registered:', new Date(deviceD.createdAt).toLocaleString());
  console.log('👁️  Last seen:', new Date(deviceD.lastSeen).toLocaleString());
} else {
  console.log('❌ Device D not found in database');
  process.exit(1);
}

// Check what sync events are available for download by device D
console.log('\n📥 Available Events for Device D to Download:');
const availableEvents = db.getSyncEvents(0, deviceD_id); // Get all events excluding device D's own
console.log(`📊 Found ${availableEvents.length} events from other devices`);

if (availableEvents.length > 0) {
  const historyEvents = availableEvents.filter(e => e.entityType === 'history');
  const pageEvents = availableEvents.filter(e => e.entityType === 'page');
  
  console.log(`   - ${historyEvents.length} history events`);
  console.log(`   - ${pageEvents.length} page events`);
  
  console.log('\n🔍 Sample History Events:');
  historyEvents.slice(0, 3).forEach(event => {
    console.log(`   📝 ${event.eventType} ${event.entityType}: ${event.entityId}`);
    console.log(`      📍 URL: ${event.data.url}`);
    console.log(`      🔗 Device: ${event.deviceId}`);
    console.log(`      ⏰ Time: ${new Date(event.timestamp).toLocaleString()}`);
    console.log('');
  });
} else {
  console.log('⚠️  No events available for download - this explains why history is empty!');
}

// Check device D's own events
console.log('\n📤 Device D\'s Own Events:');
const deviceD_events = db.getSyncEvents(0).filter(e => e.deviceId === deviceD_id);
console.log(`📊 Found ${deviceD_events.length} events created by device D`);

// Check if there are any sync events with wrong authentication
console.log('\n🔐 Authentication Check:');
console.log('Device D should be able to authenticate and download events from:');
const otherDevices = ['bedb92d4-2801-4d45-acef-f1a31cd23e6f', 'e3b96107-aee7-45ac-be53-888214fa4de1'];
otherDevices.forEach(deviceId => {
  const device = db.getDevice(deviceId);
  if (device) {
    const events = db.getSyncEvents(0).filter(e => e.deviceId === deviceId);
    console.log(`   📱 ${device.deviceName} (${deviceId}): ${events.length} events`);
  }
});

console.log('\n💡 Troubleshooting Suggestions:');
console.log('1. Check browser console for sync errors in device D');
console.log('2. Verify JWT token is valid for device D');
console.log('3. Check if performFullSync() is actually being called');
console.log('4. Verify network requests are reaching the server');
console.log('5. Check if downloaded events are being applied to IndexedDB');

// Test what the API would return for device D
console.log('\n🧪 Simulating API Response for Device D:');
try {
  const since = 0; // Get all events
  const excludeDevice = deviceD_id;
  
  const apiEvents = db.getSyncEvents(since, excludeDevice);
  console.log(`✅ API would return ${apiEvents.length} events for device D`);
  
  if (apiEvents.length > 0) {
    console.log('🎯 Device D should see history from these URLs:');
    const historyUrls = apiEvents
      .filter(e => e.entityType === 'history')
      .map(e => e.data.url)
      .slice(0, 5);
    
    historyUrls.forEach(url => console.log(`   🌐 ${url}`));
    
    if (historyUrls.length > 5) {
      console.log(`   ... and ${apiEvents.filter(e => e.entityType === 'history').length - 5} more`);
    }
  }
} catch (error) {
  console.error('❌ Error simulating API:', error);
}
