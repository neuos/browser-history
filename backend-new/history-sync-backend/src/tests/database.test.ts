import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Database } from "../database/database.ts";
import type { Device, SyncEvent } from "../types/index.ts";

Deno.test("Database - Device operations", async (t) => {
  const testDbPath = "./test-db.db";
  
  // Clean up any existing test database
  try {
    await Deno.remove(testDbPath);
  } catch {
    // File might not exist, ignore
  }

  const db = new Database(testDbPath);
  db.init();

  await t.step("should register a device", () => {
    const device: Device = {
      deviceId: "test-device-1",
      deviceName: "Test Device",
      publicKey: "test-public-key",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    db.registerDevice(device);
    const retrieved = db.getDevice("test-device-1");
    
    assertExists(retrieved);
    if (retrieved) {
      assertEquals(retrieved.deviceId, device.deviceId);
      assertEquals(retrieved.deviceName, device.deviceName);
      assertEquals(retrieved.publicKey, device.publicKey);
    }
  });

  await t.step("should get all devices", () => {
    const devices = db.getAllDevices();
    assertEquals(devices.length, 1);
    assertEquals(devices[0].deviceId, "test-device-1");
  });

  await t.step("should update device last seen", () => {
    const before = db.getDevice("test-device-1")!.lastSeen;
    
    // Wait a bit to ensure timestamp difference
    const originalTime = Date.now;
    Date.now = () => before + 1000; // Mock time to be 1 second later
    
    db.updateDeviceLastSeen("test-device-1");
    const after = db.getDevice("test-device-1")!.lastSeen;
    assertEquals(after > before, true);
    
    // Restore original Date.now
    Date.now = originalTime;
  });

  // Cleanup
  db.close();
  try {
    await Deno.remove(testDbPath);
  } catch {
    // Ignore cleanup errors
  }
});

Deno.test("Database - Sync events", async (t) => {
  const testDbPath = "./test-sync-db.db";
  
  // Clean up any existing test database
  try {
    await Deno.remove(testDbPath);
  } catch {
    // File might not exist, ignore
  }

  const db = new Database(testDbPath);
  db.init();

  // Register a test device first
  const device: Device = {
    deviceId: "test-device-sync",
    deviceName: "Test Sync Device",
    publicKey: "test-public-key",
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
  db.registerDevice(device);

  await t.step("should add sync events", () => {
    const event: SyncEvent = {
      id: "test-event-1",
      deviceId: "test-device-sync",
      timestamp: Date.now(),
      eventType: "CREATE",
      entityType: "page",
      entityId: "https://example.com",
      data: {
        url: "https://example.com",
        title: "Example Page",
      },
      checksum: "test-checksum",
    };

    db.addSyncEvent(event);
    
    const events = db.getSyncEvents(0);
    assertEquals(events.length, 1);
    assertEquals(events[0].id, event.id);
    assertEquals(events[0].entityId, event.entityId);
  });

  await t.step("should filter sync events by timestamp", () => {
    const now = Date.now();
    
    const event2: SyncEvent = {
      id: "test-event-2",
      deviceId: "test-device-sync",
      timestamp: now + 1000,
      eventType: "UPDATE",
      entityType: "page",
      entityId: "https://example2.com",
      data: {
        url: "https://example2.com",
        title: "Example Page 2",
      },
      checksum: "test-checksum-2",
    };

    db.addSyncEvent(event2);
    
    // Get events since the timestamp between the two events
    const recentEvents = db.getSyncEvents(now + 500);
    assertEquals(recentEvents.length, 1);
    assertEquals(recentEvents[0].id, "test-event-2");
  });

  // Cleanup
  db.close();
  try {
    await Deno.remove(testDbPath);
  } catch {
    // Ignore cleanup errors
  }
});
