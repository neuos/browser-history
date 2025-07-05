#!/usr/bin/env -S deno run --allow-all

// Test the exact sync events that were failing
const testEvents = [
  {
    id: "0b6928c4-a44c-4f7f-93b2-e74721614897",
    deviceId: "19e141bb-30bf-4dc7-a303-e7a0e0d77483",
    timestamp: 1751719381811,
    eventType: "CREATE",
    entityType: "history",
    entityId: "c7f0e949-cdd8-419c-ada8-7839b75633a7",
    data: {
      id: "c7f0e949-cdd8-419c-ada8-7839b75633a7",
      deviceId: "9f42ff53-4335-48da-b37e-a889c8cc9995", // This was causing the FOREIGN KEY error
      url: "https://neuhuber.eu/",
      tabId: 2043629744,
      timestamp: 1751719381808,
      navigationSourceId: null,
      createdAt: 1751719381811,
      updatedAt: 1751719381811
    },
    checksum: ""
  },
  {
    id: "12a9dac0-8341-46ce-8b0a-df1619a78e5e",
    deviceId: "19e141bb-30bf-4dc7-a303-e7a0e0d77483",
    timestamp: 1751719382022,
    eventType: "CREATE",
    entityType: "history",
    entityId: "dc58b8c8-b858-4b59-83ef-6d4b1f633b1e",
    data: {
      id: "dc58b8c8-b858-4b59-83ef-6d4b1f633b1e",
      deviceId: "9f42ff53-4335-48da-b37e-a889c8cc9995", // Same device ID
      url: "https://github.com/topics",
      tabId: 2043629756,
      timestamp: 1751719382020,
      navigationSourceId: null,
      createdAt: 1751719382022,
      updatedAt: 1751719382022
    },
    checksum: ""
  }
]

console.log('Testing sync events that previously failed...')

// First register the sender device
const registerResponse = await fetch('http://localhost:8000/auth/register-device', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deviceName: 'Test Device',
    publicKey: 'test-key',
    secret: 'secret',
  }),
})

if (!registerResponse.ok) {
  console.error('Failed to register device:', await registerResponse.text())
  Deno.exit(1)
}

const deviceData = await registerResponse.json()
console.log('✅ Device registered:', deviceData.deviceId)

// Now send the sync events
const syncResponse = await fetch('http://localhost:8000/sync/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${deviceData.token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ events: testEvents }),
})

if (!syncResponse.ok) {
  console.error('❌ Sync failed:', syncResponse.status, await syncResponse.text())
  Deno.exit(1)
}

const syncResult = await syncResponse.json()
console.log('✅ Sync successful:', syncResult)
console.log('✅ All previously failing events now work!')
