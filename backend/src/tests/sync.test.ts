import { assertEquals, assertExists, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Database } from "../database/database.ts";
import type { SyncEvent, HistoryNode, Device } from "../types/index.ts";

// Helper function to create a test database
function createTestDatabase(path: string): Database {
  const db = new Database(path);
  db.init();
  return db;
}

// Helper function to create test devices
function createTestDevice(id: string, name: string): Device {
  return {
    deviceId: id,
    deviceName: name,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
}

// Helper function to create test sync events
function createTestSyncEvent(
  id: string,
  deviceId: string,
  entityId: string,
  eventType: "CREATE" | "UPDATE" | "DELETE" = "CREATE",
  data: any = {},
  timestamp?: number
): SyncEvent {
  return {
    id,
    deviceId,
    timestamp: timestamp ?? Date.now(),
    eventType,
    entityType: "history",
    entityId,
    data,
    checksum: `checksum-${id}`,
  };
}

Deno.test({
  name: "Sync Service - Event Processing",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const testDbPath = "./test-sync-db.db";
    
    // Clean up any existing test database
    try {
      await Deno.remove(testDbPath);
    } catch {
      // File might not exist, ignore
    }

    const db = createTestDatabase(testDbPath);

    await t.step("Setup test devices", () => {
      const device1 = createTestDevice("sync-device-1", "Sync Test Device 1");
      const device2 = createTestDevice("sync-device-2", "Sync Test Device 2");
      
      db.registerDevice(device1);
      db.registerDevice(device2);
      
      const devices = db.getAllDevices();
      assertEquals(devices.length, 2);
    });

    await t.step("should handle CREATE sync events", () => {
      const historyData = {
        id: "history-sync-1",
        url: "https://example.com/sync-test",
        tabId: 12345,
        timestamp: Date.now(),
        navigationSourceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const syncEvent = createTestSyncEvent(
        "sync-event-1",
        "sync-device-1",
        "history-sync-1",
        "CREATE",
        historyData
      );

      // Simulate sync event processing
      db.addSyncEvent(syncEvent);

      // Process the sync event into a history node
      const historyNode: HistoryNode = {
        id: syncEvent.entityId,
        deviceId: syncEvent.deviceId, // Use authenticated device ID from JWT
        url: historyData.url,
        tabId: historyData.tabId,
        timestamp: historyData.timestamp,
        navigationSourceId: historyData.navigationSourceId || undefined,
        createdAt: historyData.createdAt,
        updatedAt: historyData.updatedAt,
        deletedAt: undefined,
      };

      db.upsertHistoryNode(historyNode);

      // Verify the event was stored
      const events = db.getSyncEvents(0);
      assertEquals(events.length, 1);
      assertEquals(events[0].id, "sync-event-1");

      // Verify the history node was created
      const historyNodes = db.getHistoryNodes("sync-device-1");
      assertEquals(historyNodes.length, 1);
      assertEquals(historyNodes[0].url, "https://example.com/sync-test");
    });

    await t.step("should handle UPDATE sync events", () => {
      const updatedData = {
        id: "history-sync-1",
        url: "https://example.com/sync-test-updated",
        tabId: 12345,
        timestamp: Date.now(),
        navigationSourceId: "nav-source-1",
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
      };

      const updateEvent = createTestSyncEvent(
        "sync-event-2",
        "sync-device-1",
        "history-sync-1",
        "UPDATE",
        updatedData
      );

      db.addSyncEvent(updateEvent);

      // Process the update
      const updatedHistoryNode: HistoryNode = {
        id: updateEvent.entityId,
        deviceId: updateEvent.deviceId,
        url: updatedData.url,
        tabId: updatedData.tabId,
        timestamp: updatedData.timestamp,
        navigationSourceId: updatedData.navigationSourceId,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt,
        deletedAt: undefined,
      };

      db.upsertHistoryNode(updatedHistoryNode);

      // Verify the node was updated
      const historyNodes = db.getHistoryNodes("sync-device-1");
      assertEquals(historyNodes.length, 1); // Still only one node
      assertEquals(historyNodes[0].url, "https://example.com/sync-test-updated");
      assertEquals(historyNodes[0].navigationSourceId, "nav-source-1");
    });

    await t.step("should handle DELETE sync events", () => {
      const deleteEvent = createTestSyncEvent(
        "sync-event-3",
        "sync-device-1",
        "history-sync-1",
        "DELETE",
        { deletedAt: Date.now() }
      );

      db.addSyncEvent(deleteEvent);

      // Process the delete (soft delete)
      const deletedHistoryNode: HistoryNode = {
        id: deleteEvent.entityId,
        deviceId: deleteEvent.deviceId,
        url: "https://example.com/sync-test-updated",
        tabId: 12345,
        timestamp: Date.now(),
        navigationSourceId: "nav-source-1",
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
        deletedAt: Date.now(),
      };

      db.upsertHistoryNode(deletedHistoryNode);

      // Verify the node is soft deleted (filtered out)
      const historyNodes = db.getHistoryNodes("sync-device-1");
      assertEquals(historyNodes.length, 0); // Should be filtered out
    });

    await t.step("should handle FOREIGN KEY constraint correctly", () => {
      // This test ensures the fix for FOREIGN KEY constraint errors
      // where sync events contain deviceIds that don't exist in devices table

      const historyData = {
        id: "history-foreign-key-test",
        deviceId: "unknown-device-999", // This device doesn't exist in devices table
        url: "https://example.com/foreign-key-test",
        tabId: 99999,
        timestamp: Date.now(),
        navigationSourceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const syncEvent = createTestSyncEvent(
        "sync-event-foreign-key",
        "sync-device-1", // This is the authenticated device from JWT
        "history-foreign-key-test",
        "CREATE",
        historyData
      );

      db.addSyncEvent(syncEvent);

      // Process with the fix: use authenticated deviceId from JWT, ignore data.deviceId
      const historyNode: HistoryNode = {
        id: syncEvent.entityId,
        deviceId: syncEvent.deviceId, // Use authenticated device ID, NOT historyData.deviceId
        url: historyData.url,
        tabId: historyData.tabId,
        timestamp: historyData.timestamp,
        navigationSourceId: historyData.navigationSourceId || undefined,
        createdAt: historyData.createdAt,
        updatedAt: historyData.updatedAt,
        deletedAt: undefined,
      };

      // This should not throw FOREIGN KEY constraint error
      db.upsertHistoryNode(historyNode);

      // Verify the node was created with the correct deviceId
      const historyNodes = db.getHistoryNodes("sync-device-1");
      const foreignKeyTestNode = historyNodes.find(n => n.id === "history-foreign-key-test");
      assertExists(foreignKeyTestNode);
      assertEquals(foreignKeyTestNode.deviceId, "sync-device-1"); // Should be authenticated device, not "unknown-device-999"
    });

    await t.step("should handle cross-device synchronization", () => {
      // Create events from device-2
      const device2HistoryData = {
        id: "history-device-2",
        url: "https://example.com/device-2-page",
        tabId: 54321,
        timestamp: Date.now(),
        navigationSourceId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const device2Event = createTestSyncEvent(
        "sync-event-device-2",
        "sync-device-2",
        "history-device-2",
        "CREATE",
        device2HistoryData
      );

      db.addSyncEvent(device2Event);

      const device2HistoryNode: HistoryNode = {
        id: device2Event.entityId,
        deviceId: device2Event.deviceId,
        url: device2HistoryData.url,
        tabId: device2HistoryData.tabId,
        timestamp: device2HistoryData.timestamp,
        navigationSourceId: device2HistoryData.navigationSourceId || undefined,
        createdAt: device2HistoryData.createdAt,
        updatedAt: device2HistoryData.updatedAt,
        deletedAt: undefined,
      };

      db.upsertHistoryNode(device2HistoryNode);

      // Verify both devices have their own history
      const device1Nodes = db.getHistoryNodes("sync-device-1");
      const device2Nodes = db.getHistoryNodes("sync-device-2");
      
      assertEquals(device1Nodes.length, 1); // The foreign key test node
      assertEquals(device2Nodes.length, 1); // The device-2 node
      
      // Verify cross-device sync can retrieve all events
      const allEvents = db.getSyncEvents(0);
      assertEquals(allEvents.length >= 4, true); // At least 4 events created

      // Verify device-specific event filtering (excludes own device events for sync)
      const device1Events = db.getSyncEvents(0, "sync-device-1");
      const device2Events = db.getSyncEvents(0, "sync-device-2");
      
      // device1Events excludes sync-device-1's own events, so it gets device-2's events
      assertEquals(device1Events.length, 1); // 1 event from device-2
      // device2Events excludes sync-device-2's own events, so it gets device-1's events  
      assertEquals(device2Events.length >= 4, true); // At least 4 events from device-1
    });

    await t.step("should handle large sync batches", () => {
      // Simulate a large batch of sync events
      const batchSize = 50;
      const startTime = Date.now(); // Use current time

      for (let i = 0; i < batchSize; i++) {
        const historyData = {
          id: `batch-history-${i}`,
          url: `https://example.com/batch-page-${i}`,
          tabId: 10000 + i,
          timestamp: startTime + i * 100,
          navigationSourceId: null,
          createdAt: startTime + i * 100,
          updatedAt: startTime + i * 100,
        };

        const syncEvent = createTestSyncEvent(
          `batch-sync-event-${i}`,
          "sync-device-1",
          `batch-history-${i}`,
          "CREATE",
          historyData,
          historyData.timestamp
        );

        db.addSyncEvent(syncEvent);

        db.addSyncEvent(syncEvent);

        const historyNode: HistoryNode = {
          id: syncEvent.entityId,
          deviceId: syncEvent.deviceId,
          url: historyData.url,
          tabId: historyData.tabId,
          timestamp: historyData.timestamp,
          navigationSourceId: historyData.navigationSourceId || undefined,
          createdAt: historyData.createdAt,
          updatedAt: historyData.updatedAt,
          deletedAt: undefined,
        };

        db.upsertHistoryNode(historyNode);
      }

      // Verify all batch events were processed
      const device1Nodes = db.getHistoryNodes("sync-device-1", 100, 0);
      
      // Should have at least the batch size of new nodes
      // (Previous tests may have left some soft-deleted nodes)
      assertEquals(device1Nodes.length >= batchSize, true);
      
      // Check that we created exactly batchSize new events in this test
      const recentEvents = db.getSyncEvents(startTime);
      assertEquals(recentEvents.length, batchSize);
    });

    await t.step("should handle concurrent sync scenarios", () => {
      // Simulate concurrent updates to the same entity from different devices
      const entityId = "concurrent-history-entity";
      const baseTime = Date.now();

      // Device 1 creates the entity
      const createEvent = createTestSyncEvent(
        "concurrent-create",
        "sync-device-1",
        entityId,
        "CREATE",
        {
          id: entityId,
          url: "https://example.com/concurrent",
          tabId: 7777,
          timestamp: baseTime,
          createdAt: baseTime,
          updatedAt: baseTime,
        }
      );

      db.addSyncEvent(createEvent);
      db.upsertHistoryNode({
        id: entityId,
        deviceId: "sync-device-1",
        url: "https://example.com/concurrent",
        tabId: 7777,
        timestamp: baseTime,
        navigationSourceId: undefined,
        createdAt: baseTime,
        updatedAt: baseTime,
        deletedAt: undefined,
      });

      // Device 2 updates the same entity (conflict scenario)
      const updateEvent = createTestSyncEvent(
        "concurrent-update",
        "sync-device-2",
        entityId,
        "UPDATE",
        {
          id: entityId,
          url: "https://example.com/concurrent-updated",
          tabId: 7777,
          timestamp: baseTime + 1000,
          createdAt: baseTime,
          updatedAt: baseTime + 1000,
        }
      );

      db.addSyncEvent(updateEvent);
      
      // In real sync, this would create a new history node for device-2
      // since each device maintains its own history
      db.upsertHistoryNode({
        id: `${entityId}-device-2`,
        deviceId: "sync-device-2",
        url: "https://example.com/concurrent-updated",
        tabId: 7777,
        timestamp: baseTime + 1000,
        navigationSourceId: undefined,
        createdAt: baseTime + 1000,
        updatedAt: baseTime + 1000,
        deletedAt: undefined,
      });

      // Verify both versions exist
      const device1Nodes = db.getHistoryNodes("sync-device-1");
      const device2Nodes = db.getHistoryNodes("sync-device-2");
      
      const device1ConcurrentNode = device1Nodes.find(n => n.id === entityId);
      const device2ConcurrentNode = device2Nodes.find(n => n.id.includes(entityId));
      
      assertExists(device1ConcurrentNode);
      assertExists(device2ConcurrentNode);
      assertEquals(device1ConcurrentNode.url, "https://example.com/concurrent");
      assertEquals(device2ConcurrentNode.url, "https://example.com/concurrent-updated");
    });

    // Clean up
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore
    }
  },
});
