#!/usr/bin/env deno run --allow-all

/**
 * Database migration script
 * This script initializes the database with the required tables
 */

import { Database } from "../database/database.ts";

console.log("🔄 Starting database migration...");

const db = new Database();
db.init();

console.log("✅ Database migration completed successfully!");
console.log("📊 Database is ready for use.");

db.close();
