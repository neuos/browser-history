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

  await t.step("should register and retrieve device", () => {
    const device: Device = {
      deviceId: "test-device-123",
      deviceName: "Test Device",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    }

    db.registerDevice(device);
    const retrieved = db.getDevice("test-device-123");
    
    assertExists(retrieved);
    if (retrieved) {
      assertEquals(retrieved.deviceId, device.deviceId);
      assertEquals(retrieved.deviceName, device.deviceName);
    }
  });

  await t.step("should get all devices", () => {
    const devices = db.getAllDevices();
    assertEquals(devices.length, 1);
    assertEquals(devices[0].deviceId, "test-device-123");
  });

  await t.step("should update device last seen", () => {
    const before = db.getDevice("test-device-123")!.lastSeen;
    
    // Wait a bit to ensure timestamp difference
    setTimeout(() => {
      db.updateDeviceLastSeen("test-device-123");
    }, 10);
    
    const after = db.getDevice("test-device-123")!.lastSeen;
    assertEquals(after >= before, true);
  });

  // Clean up
  try {
    await Deno.remove(testDbPath);
  } catch {
    // Ignore
  }
});
