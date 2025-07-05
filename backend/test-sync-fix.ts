#!/usr/bin/env -S deno run --allow-all

import { Database } from "./src/database/database.ts";

// Initialize database
const db = new Database("./data/history.db");

// Create a test sync event that mimics the real issue
const testEvent = {
  id: "test-event-1",
  deviceId: "e3b96107-aee7-45ac-be53-888214fa4de1", // This exists in devices table
  timestamp: Date.now(),
  eventType: "CREATE" as const,
  entityType: "history" as const,
  entityId: "test-history-node-1",
  data: {
    id: "test-history-node-1",
    deviceId: "0e718196-db3b-4da0-aefa-640cc8b39f31", // This DOESN'T exist in devices table
    url: "https://example.com/test",
    tabId: 123,
    timestamp: Date.now(),
    navigationSourceId: "test-nav-id",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  checksum: "test-checksum",
};

console.log("Testing sync event processing with fixed logic...");
console.log("Event deviceId (from JWT):", testEvent.deviceId);
console.log("Data deviceId (from payload):", testEvent.data.deviceId);

// Apply the fixed logic
function applySyncEventFixed(db: Database, event: typeof testEvent) {
  const now = Date.now();

  try {
    if (event.entityType === "history") {
      // Always use the authenticated deviceId from JWT, ignore any deviceId in data payload
      const nodeDeviceId = event.deviceId;
      
      console.log("Using deviceId:", nodeDeviceId);
      
      const historyNode = {
        id: event.entityId,
        deviceId: nodeDeviceId,
        url: event.data.url as string,
        tabId: event.data.tabId as number,
        timestamp: event.data.timestamp as number,
        navigationSourceId: event.data.navigationSourceId as string | undefined,
        createdAt: (event.data.createdAt as number) || now,
        updatedAt: now,
        deletedAt: undefined,
      };
      
      console.log("Attempting to insert history node:", historyNode);
      db.upsertHistoryNode(historyNode);
      console.log("✅ Successfully inserted history node!");
    }
  } catch (error) {
    console.error("❌ Failed to apply sync event:", error);
    throw error;
  }
}

try {
  applySyncEventFixed(db, testEvent);
  console.log("🎉 Test completed successfully!");
} catch (error) {
  console.error("💥 Test failed:", error);
  Deno.exit(1);
}
