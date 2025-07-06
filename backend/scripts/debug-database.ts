#!/usr/bin/env -S deno run --allow-all

/**
 * Debug Database - Inspect database state and perform diagnostic queries
 * 
 * This script provides detailed information about the database state,
 * including device counts and device information.
 */

import { Database } from '../src/database/database.ts';

console.log('🔍 Debug Database State...\n');

try {
  const db = new Database('./data/history.db');
  
  console.log('📊 Database Statistics:');
  
  // Device information
  const devices = db.getAllDevices();
  console.log(`  📱 Total devices: ${devices.length}`);
  
  if (devices.length > 0) {
    console.log('\n  📋 Device List:');
    devices.forEach(device => {
      const lastSeenDate = new Date(device.lastSeen);
      console.log(`    - ${device.deviceId}`);
      console.log(`      Name: ${device.deviceName}`);
      console.log(`      Created: ${new Date(device.createdAt).toISOString()}`);
      console.log(`      Last Seen: ${lastSeenDate.toISOString()}`);
      console.log('');
    });
  } else {
    console.log('  📱 No devices found');
  }

  // Check if we can access individual devices
  if (devices.length > 0) {
    console.log('� Device Details:');
    for (const device of devices) {
      const deviceDetail = db.getDevice(device.deviceId);
      if (deviceDetail) {
        console.log(`  ✅ Device ${device.deviceId} is accessible`);
      } else {
        console.log(`  ❌ Device ${device.deviceId} is not accessible`);
      }
    }
  }

  console.log('\n✅ Database inspection completed successfully!');
  console.log('\n💡 For more detailed queries, add public methods to the Database class.');
  
} catch (error) {
  console.error('❌ Database inspection failed:', error);
  Deno.exit(1);
}
