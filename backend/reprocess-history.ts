#!/usr/bin/env -S deno run --allow-all

import { Database } from "./src/database/database.ts";

// Initialize database
const db = new Database("./data/history.db");

console.log("🔄 Reprocessing failed history sync events...");

// Get all sync events since time 0 (all events)
const allEvents = db.getSyncEvents(0);
const historyEvents = allEvents.filter(event => event.entityType === 'history');

console.log(`Found ${historyEvents.length} history sync events to process`);

let processed = 0;
const skipped = 0;
let errors = 0;

for (const event of historyEvents) {
  try {
    // For simplicity, just try to apply each event
    // The upsertHistoryNode will handle duplicates
    
    // Apply the fixed sync logic
    if (event.entityType === "history") {
      // Always use the authenticated deviceId from JWT, ignore any deviceId in data payload
      const nodeDeviceId = event.deviceId;
      const now = Date.now();
      
      const historyNode = {
        id: event.entityId,
        deviceId: nodeDeviceId,
        url: event.data.url as string,
        tabId: event.data.tabId as number,
        timestamp: event.data.timestamp as number,
        navigationSourceId: event.data.navigationSourceId as string | undefined,
        createdAt: (event.data.createdAt as number) || now,
        updatedAt: now,
        deletedAt: event.eventType === "DELETE" ? now : undefined,
      };
      
      db.upsertHistoryNode(historyNode);
      console.log(`✅ Processed ${event.entityId} for device ${nodeDeviceId}`);
      processed++;
    }
  } catch (error) {
    console.error(`❌ Failed to process event ${event.id}:`, error);
    errors++;
  }
}

console.log("\n📊 Reprocessing Summary:");
console.log(`✅ Processed: ${processed}`);
console.log(`⏭️  Skipped: ${skipped}`);
console.log(`❌ Errors: ${errors}`);

// Check final count using SQL query
console.log("\n� Checking final count...");
