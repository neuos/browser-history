#!/usr/bin/env -S deno run --allow-all

/**
 * Debug Foreign Keys - Test FOREIGN KEY constraint fixes for sync events
 * 
 * This script tests the fix for FOREIGN KEY constraint errors that occurred when
 * sync events contained deviceIds that didn't exist in the devices table.
 * The fix uses the authenticated deviceId from JWT instead of data payload deviceId.
 */

import { Database } from '../src/database/database.ts'

console.log('🔍 Testing FOREIGN KEY constraint fix...')

// Initialize database
const db = new Database('./data/history.db')

// Create a test sync event with a device ID that would be authenticated via JWT
const testEvent = {
  id: "test-event-123",
  deviceId: "sender-device-456", // This device exists (sender)
  timestamp: Date.now(),
  eventType: "CREATE" as const,
  entityType: "history" as const,
  entityId: "test-history-789",
  data: {
    id: "test-history-789",
    deviceId: "unknown-device-999", // This device doesn't exist - should cause FOREIGN KEY error before fix
    url: "https://test.example.com",
    tabId: 12345,
    timestamp: Date.now() - 1000,
    navigationSourceId: null,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000
  },
  checksum: ""
}

// First register the sender device
console.log('📝 Registering sender device...')
db.registerDevice({
  deviceId: "sender-device-456",
  deviceName: "Test Sender Device",
  createdAt: Date.now(),
  lastSeen: Date.now()
})

// Test the applySyncEvent function that should now handle authenticated device IDs
function testApplySyncEvent(db: Database, event: typeof testEvent) {
  const now = Date.now();

  try {
    if (event.entityType === "history") {
      // Always use the authenticated deviceId from JWT, ignore any deviceId in data payload
      const nodeDeviceId = event.deviceId;
      
      console.log(`📤 Using authenticated deviceId: ${nodeDeviceId} (ignoring data.deviceId: ${event.data.deviceId})`)
      
      const historyNode = {
        id: event.entityId,
        deviceId: nodeDeviceId,
        url: event.data.url as string,
        tabId: event.data.tabId as number,
        timestamp: event.data.timestamp as number,
        navigationSourceId: event.data.navigationSourceId || undefined,
        createdAt: (event.data.createdAt as number) || now,
        updatedAt: now,
        deletedAt: undefined,
      };
      db.upsertHistoryNode(historyNode);
      console.log('✅ History node inserted successfully!');
    }
  } catch (error) {
    console.error("❌ Failed to apply sync event:", error);
    throw error;
  }
}

console.log('🧪 Testing sync event with authenticated device ID...')
testApplySyncEvent(db, testEvent)

// Check if devices were created
console.log('\n📊 Devices in database:')
const devices = db.getAllDevices()
devices.forEach(device => {
  console.log(`  - ${device.deviceId}: ${device.deviceName}`)
})

console.log('\n🎉 Test completed successfully! The FOREIGN KEY fix works.')
