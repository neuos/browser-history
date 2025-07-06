#!/usr/bin/env -S deno run --allow-read --allow-env

import { EnvironmentConfig } from './src/config/environment.ts';
import { Database } from './src/database/database.ts';

await EnvironmentConfig.initialize();
const env = EnvironmentConfig.getInstance();
const db = new Database(env.DATABASE_PATH);

console.log('=== Sync Events Inspection ===');

// Get some sample sync events to see their structure
const stmt = db.db.prepare('SELECT * FROM sync_events ORDER BY timestamp DESC LIMIT 5');
const events = stmt.all();
console.log('Latest 5 sync events:');
events.forEach((event: any, index: number) => {
  console.log(`\n${index + 1}. Event ID: ${event.id}`);
  console.log(`   Device: ${event.device_id}`);
  console.log(`   Type: ${event.event_type}`);
  console.log(`   Entity: ${event.entity_type}`);
  console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
  console.log(`   Data:`, JSON.parse(event.data));
});

console.log('\n=== Events by entity type ===');
const countStmt = db.db.prepare(`
  SELECT entity_type, event_type, COUNT(*) as count 
  FROM sync_events 
  GROUP BY entity_type, event_type 
  ORDER BY entity_type, event_type
`);
const countByType = countStmt.all();
countByType.forEach((row: any) => {
  console.log(`${row.entity_type} ${row.event_type}: ${row.count}`);
});

db.close();
