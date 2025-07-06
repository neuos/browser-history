import { assertEquals, assertExists, assertThrows, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Database } from "../database/database.ts";
import type { Device, SyncEvent, HistoryNode, Page, SyncState } from "../types/index.ts";

Deno.test({
  name: "Database - Comprehensive Coverage Tests",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const testDbPath = "./test-comprehensive-db.db";
    
    // Clean up any existing test database
    try {
      await Deno.remove(testDbPath);
    } catch {
      // File might not exist, ignore
    }

    const db = new Database(testDbPath);
    db.init();

    // Test device operations
    await t.step("Device Operations", async (t) => {
      await t.step("should register multiple devices", () => {
        const device1: Device = {
          deviceId: "device-1",
          deviceName: "Device One",
          createdAt: Date.now(),
          lastSeen: Date.now(),
        };

        const device2: Device = {
          deviceId: "device-2", 
          deviceName: "Device Two",
          createdAt: Date.now() + 1000,
          lastSeen: Date.now() + 1000,
        };

        db.registerDevice(device1);
        db.registerDevice(device2);

        const retrieved1 = db.getDevice("device-1");
        const retrieved2 = db.getDevice("device-2");
        
        assertExists(retrieved1);
        assertExists(retrieved2);
        assertEquals(retrieved1?.deviceName, "Device One");
        assertEquals(retrieved2?.deviceName, "Device Two");
      });

      await t.step("should handle non-existent device", () => {
        const nonExistent = db.getDevice("non-existent-device");
        assertEquals(nonExistent, undefined);
      });

      await t.step("should get all devices", () => {
        const devices = db.getAllDevices();
        assertEquals(devices.length, 2);
      });

      await t.step("should update device last seen", () => {
        const before = db.getDevice("device-1")!.lastSeen;
        // Wait a bit to ensure timestamp difference
        const startTime = Date.now();
        while (Date.now() - startTime < 2) {
          // Small delay
        }
        
        db.updateDeviceLastSeen("device-1");
        
        const after = db.getDevice("device-1")!.lastSeen;
        assertEquals(after > before, true);
      });

      await t.step("should delete device", () => {
        db.deleteDevice("device-2");
        const deleted = db.getDevice("device-2");
        assertEquals(deleted, undefined);
        
        const remaining = db.getAllDevices();
        assertEquals(remaining.length, 1);
        assertEquals(remaining[0].deviceId, "device-1");
      });
    });

    // Test sync event operations
    await t.step("Sync Event Operations", async (t) => {
      await t.step("should add and retrieve sync events", () => {
        const now = Date.now();
        const event1: SyncEvent = {
          id: "event-1",
          deviceId: "device-1",
          timestamp: now,
          eventType: "CREATE",
          entityType: "history",
          entityId: "history-1",
          data: { test: "data1" },
          checksum: "checksum1"
        };

        const event2: SyncEvent = {
          id: "event-2", 
          deviceId: "device-1",
          timestamp: now + 1000,
          eventType: "UPDATE",
          entityType: "page",
          entityId: "page-1",
          data: { test: "data2" },
          checksum: "checksum2"
        };

        db.addSyncEvent(event1);
        db.addSyncEvent(event2);

        const events = db.getSyncEvents(0);
        assertEquals(events.length, 2);
        assertEquals(events[0].id, "event-1");
        assertEquals(events[1].id, "event-2");
      });

      await t.step("should filter sync events by timestamp", () => {
        const now = Date.now();
        const events = db.getSyncEvents(now + 500);
        assertEquals(events.length, 1);
        assertEquals(events[0].id, "event-2");
      });

      await t.step("should filter sync events by device", () => {
        // Register another device and add event
        db.registerDevice({
          deviceId: "device-3",
          deviceName: "Device Three", 
          createdAt: Date.now(),
          lastSeen: Date.now()
        });

        const event3: SyncEvent = {
          id: "event-3",
          deviceId: "device-3",
          timestamp: Date.now(),
          eventType: "DELETE",
          entityType: "history",
          entityId: "history-2",
          data: { test: "data3" },
          checksum: "checksum3"
        };

        db.addSyncEvent(event3);

        // getSyncEvents with deviceId filter excludes events FROM that device
        // (this is correct for sync - you want events from OTHER devices)
        const excludeDevice1Events = db.getSyncEvents(0, "device-1");
        const excludeDevice3Events = db.getSyncEvents(0, "device-3");
        
        assertEquals(excludeDevice1Events.length, 1); // Should get event-3 (from device-3)
        assertEquals(excludeDevice3Events.length, 2); // Should get event-1, event-2 (from device-1)
        assertEquals(excludeDevice1Events[0].deviceId, "device-3");
      });
    });

    // Test history node operations
    await t.step("History Node Operations", async (t) => {
      await t.step("should upsert history nodes", () => {
        const now = Date.now();
        const node1: HistoryNode = {
          id: "history-1",
          deviceId: "device-1", 
          url: "https://example.com/page1",
          tabId: 123,
          timestamp: now,
          navigationSourceId: "nav-1",
          createdAt: now,
          updatedAt: now,
          deletedAt: undefined
        };

        const node2: HistoryNode = {
          id: "history-2",
          deviceId: "device-1",
          url: "https://example.com/page2", 
          tabId: 124,
          timestamp: now + 1000,
          navigationSourceId: undefined,
          createdAt: now + 1000,
          updatedAt: now + 1000,
          deletedAt: undefined
        };

        db.upsertHistoryNode(node1);
        db.upsertHistoryNode(node2);

        const nodes = db.getHistoryNodes();
        assertEquals(nodes.length, 2);
        // Results are ordered by timestamp DESC, so node2 (newer) comes first
        assertEquals(nodes[0].url, "https://example.com/page2");
        assertEquals(nodes[1].url, "https://example.com/page1");
      });

      await t.step("should update existing history node", () => {
        const now = Date.now();
        const updatedNode: HistoryNode = {
          id: "history-1",
          deviceId: "device-1",
          url: "https://example.com/page1-updated",
          tabId: 123,
          timestamp: now,
          navigationSourceId: "nav-1",
          createdAt: now,
          updatedAt: now + 2000,
          deletedAt: undefined
        };

        db.upsertHistoryNode(updatedNode);
        
        const nodes = db.getHistoryNodes();
        assertEquals(nodes.length, 2); // Still 2 nodes
        const updatedNodeFromDb = nodes.find(n => n.id === "history-1");
        assertEquals(updatedNodeFromDb?.url, "https://example.com/page1-updated");
      });

      await t.step("should filter history nodes by device", () => {
        // Add node for different device
        const node3: HistoryNode = {
          id: "history-3",
          deviceId: "device-3",
          url: "https://example.com/page3",
          tabId: 125,
          timestamp: Date.now(),
          navigationSourceId: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: undefined
        };

        db.upsertHistoryNode(node3);

        const device1Nodes = db.getHistoryNodes("device-1");
        const device3Nodes = db.getHistoryNodes("device-3");
        
        assertEquals(device1Nodes.length, 2);
        assertEquals(device3Nodes.length, 1);
        assertEquals(device3Nodes[0].deviceId, "device-3");
      });

      await t.step("should handle pagination", () => {
        // Add more nodes to test pagination
        for (let i = 4; i <= 10; i++) {
          const node: HistoryNode = {
            id: `history-${i}`,
            deviceId: "device-1",
            url: `https://example.com/page${i}`,
            tabId: 100 + i,
            timestamp: Date.now() + i * 1000,
            navigationSourceId: undefined,
            createdAt: Date.now() + i * 1000,
            updatedAt: Date.now() + i * 1000,
            deletedAt: undefined
          };
          db.upsertHistoryNode(node);
        }

        const firstPage = db.getHistoryNodes("device-1", 5, 0);
        const secondPage = db.getHistoryNodes("device-1", 5, 5);
        
        assertEquals(firstPage.length, 5);
        assertEquals(secondPage.length, 4); // 9 total nodes for device-1 (2 original + 7 new)
      });

      await t.step("should handle soft delete", () => {
        const deletedNode: HistoryNode = {
          id: "history-1",
          deviceId: "device-1",
          url: "https://example.com/page1-updated",
          tabId: 123,
          timestamp: Date.now(),
          navigationSourceId: "nav-1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: Date.now()
        };

        db.upsertHistoryNode(deletedNode);
        
        // Should still be in database but filtered out by default
        const nodes = db.getHistoryNodes("device-1");
        const deletedNodeFromDb = nodes.find(n => n.id === "history-1");
        assertEquals(deletedNodeFromDb, undefined); // Filtered out
      });
    });

    // Test page operations
    await t.step("Page Operations", async (t) => {
      await t.step("should upsert and retrieve pages", () => {
        const now = Date.now();
        const page1: Page = {
          url: "https://example.com/page1",
          title: "Example Page 1",
          favicon: "https://example.com/favicon.ico",
          metadata: { description: "Test page 1" },
          lastUpdate: now,
          createdAt: now,
          updatedAt: now,
          deletedAt: undefined
        };

        const page2: Page = {
          url: "https://example.com/page2",
          title: "Example Page 2",
          favicon: undefined,
          metadata: { description: "Test page 2" },
          lastUpdate: now + 1000,
          createdAt: now + 1000,
          updatedAt: now + 1000,
          deletedAt: undefined
        };

        db.upsertPage(page1);
        db.upsertPage(page2);

        const retrieved1 = db.getPage("https://example.com/page1");
        const retrieved2 = db.getPage("https://example.com/page2");
        
        assertExists(retrieved1);
        assertExists(retrieved2);
        assertEquals(retrieved1?.title, "Example Page 1");
        assertEquals(retrieved2?.title, "Example Page 2");
        // SQLite returns null for NULL values, not undefined
        assertEquals(retrieved2?.favicon, null);
      });

      await t.step("should handle non-existent page", () => {
        const nonExistent = db.getPage("https://nonexistent.com");
        assertEquals(nonExistent, undefined);
      });

      await t.step("should get multiple pages", () => {
        const urls = [
          "https://example.com/page1",
          "https://example.com/page2", 
          "https://nonexistent.com"
        ];
        
        const pages = db.getPages(urls);
        assertEquals(pages.length, 2);
        assertEquals(pages[0].url, "https://example.com/page1");
        assertEquals(pages[1].url, "https://example.com/page2");
      });

      await t.step("should update existing page", () => {
        const now = Date.now();
        const updatedPage: Page = {
          url: "https://example.com/page1",
          title: "Updated Example Page 1",
          favicon: "https://example.com/new-favicon.ico",
          metadata: { description: "Updated test page 1" },
          lastUpdate: now + 5000,
          createdAt: now, // Should keep original created time
          updatedAt: now + 5000,
          deletedAt: undefined
        };

        db.upsertPage(updatedPage);
        
        const retrieved = db.getPage("https://example.com/page1");
        assertEquals(retrieved?.title, "Updated Example Page 1");
        assertEquals(retrieved?.favicon, "https://example.com/new-favicon.ico");
      });
    });

    // Test sync state operations
    await t.step("Sync State Operations", async (t) => {
      await t.step("should update and retrieve sync state", () => {
        const now = Date.now();
        const syncState: SyncState = {
          deviceId: "device-1",
          lastSyncTimestamp: now,
          syncVector: { "device-1": now, "device-3": now - 1000 }
        };

        db.updateSyncState(syncState);
        
        const retrieved = db.getSyncState("device-1");
        assertExists(retrieved);
        assertEquals(retrieved?.lastSyncTimestamp, now);
        assertEquals(retrieved?.syncVector, syncState.syncVector);
      });

      await t.step("should handle non-existent sync state", () => {
        const nonExistent = db.getSyncState("non-existent-device");
        assertEquals(nonExistent, undefined);
      });

      await t.step("should update existing sync state", () => {
        const now = Date.now();
        const updatedSyncState: SyncState = {
          deviceId: "device-1",
          lastSyncTimestamp: now + 5000,
          syncVector: { "device-1": now + 5000, "device-3": now + 2000 }
        };

        db.updateSyncState(updatedSyncState);
        
        const retrieved = db.getSyncState("device-1");
        assertEquals(retrieved?.lastSyncTimestamp, now + 5000);
        assertNotEquals(retrieved?.syncVector, { "device-1": now, "device-3": now - 1000 });
      });
    });

    // Test edge cases and error conditions
    await t.step("Edge Cases and Error Handling", async (t) => {
      await t.step("should handle empty database queries", () => {
        // Create a fresh database for this test
        const emptyDbPath = "./test-empty-db.db";
        try {
          Deno.removeSync(emptyDbPath);
        } catch {
          // Ignore if file doesn't exist
        }
        
        const emptyDb = new Database(emptyDbPath);
        emptyDb.init();

        assertEquals(emptyDb.getAllDevices().length, 0);
        assertEquals(emptyDb.getSyncEvents(0).length, 0);
        assertEquals(emptyDb.getHistoryNodes().length, 0);
        assertEquals(emptyDb.getPages([]).length, 0);
        assertEquals(emptyDb.getDevice("non-existent"), undefined);
        assertEquals(emptyDb.getPage("https://non-existent.com"), undefined);
        assertEquals(emptyDb.getSyncState("non-existent"), undefined);

        // Clean up
        try {
          Deno.removeSync(emptyDbPath);
        } catch {
          // Ignore
        }
      });

      await t.step("should handle very old timestamps", () => {
        const veryOldTimestamp = 0;
        const events = db.getSyncEvents(veryOldTimestamp);
        assertEquals(events.length >= 3, true); // Should get all events
      });

      await t.step("should handle future timestamps", () => {
        const futureTimestamp = Date.now() + 999999999;
        const events = db.getSyncEvents(futureTimestamp);
        assertEquals(events.length, 0); // Should get no events
      });

      await t.step("should handle special characters in URLs", () => {
        const specialPage: Page = {
          url: "https://example.com/page?param=value&other=test#anchor",
          title: "Page with Special Characters: äöü αβγ 中文",
          favicon: undefined,
          metadata: { special: "characters: äöü αβγ 中文" },
          lastUpdate: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: undefined
        };

        db.upsertPage(specialPage);
        
        const retrieved = db.getPage("https://example.com/page?param=value&other=test#anchor");
        assertExists(retrieved);
        assertEquals(retrieved?.title, "Page with Special Characters: äöü αβγ 中文");
      });

      await t.step("should handle large data payloads", () => {
        const largeData = { 
          content: "x".repeat(10000), // 10KB of data
          array: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
        };

        const largeEvent: SyncEvent = {
          id: "large-event",
          deviceId: "device-1",
          timestamp: Date.now(),
          eventType: "CREATE",
          entityType: "history",
          entityId: "large-history",
          data: largeData,
          checksum: "large-checksum"
        };

        db.addSyncEvent(largeEvent);
        
        const events = db.getSyncEvents(0);
        const retrievedEvent = events.find(e => e.id === "large-event");
        assertExists(retrievedEvent);
        assertEquals((retrievedEvent?.data.content as string).length, 10000);
      });
    });

    // Clean up
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore
    }
  },
});
