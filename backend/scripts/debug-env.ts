#!/usr/bin/env -S deno run --allow-all

/**
 * Debug Environment - Check environment variables and database configuration
 * 
 * This script helps debug environment variable issues and verifies the backend
 * configuration is correctly loaded.
 */

import { load } from '@std/dotenv';
import { Database } from '../src/database/database.ts';

console.log('🔍 Debug Environment Variables...\n');

// Load environment variables
await load({ export: true });

console.log('📋 Environment Variables:');
console.log('  SHARED_SECRET:', Deno.env.get('SHARED_SECRET') ? '✅ Set' : '❌ Not set');
console.log('  JWT_SECRET:', Deno.env.get('JWT_SECRET') ? '✅ Set' : '❌ Not set');
console.log('  PORT:', Deno.env.get('PORT') || '8000 (default)');

console.log('\n📊 Database Status:');
try {
  const db = new Database('./data/history.db');
  const devices = db.getAllDevices();
  console.log(`  Devices in database: ${devices.length}`);
  
  if (devices.length > 0) {
    console.log('  Device list:');
    devices.forEach(device => {
      console.log(`    - ${device.deviceId}: ${device.deviceName}`);
    });
  }
} catch (error) {
  console.error('  ❌ Database error:', error.message);
}

console.log('\n🌐 Backend Health Check:');
try {
  const response = await fetch('http://localhost:8000/health');
  if (response.ok) {
    const health = await response.json();
    console.log('  ✅ Backend is running');
    console.log('  Response:', health);
  } else {
    console.log('  ❌ Backend responded with error:', response.status);
  }
} catch (error) {
  console.log('  ❌ Backend is not running or not accessible');
  console.log('  Error:', error.message);
  console.log('\n  Start backend with: cd backend && deno task dev');
}
