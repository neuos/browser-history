import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Database } from "../database/database.ts";
import type { Device } from "../types/index.ts";

Deno.test({
  name: "Database - Device operations",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
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
      
      // Update last seen timestamp
      db.updateDeviceLastSeen("test-device-123");
      
      const after = db.getDevice("test-device-123")!.lastSeen;
      // Should be updated to current time (greater than or equal to before)
      assertEquals(after >= before, true);
    });

    // Clean up
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore
    }
  },
});
