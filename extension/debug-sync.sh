#!/bin/bash

# Test script to debug sync functionality
# This script helps identify where the sync is failing

echo "=== Browser History Extension Sync Debug ==="
echo

# Test 1: Check if backend is running
echo "1. Testing backend health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
    curl -s http://localhost:8000/health | jq
else
    echo "❌ Backend is not running or not accessible"
    echo "Please start the backend with: cd backend && deno task dev"
    exit 1
fi

echo

# Test 2: Test device registration
echo "2. Testing device registration..."
DEVICE_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/register-device \
  -H "Content-Type: application/json" \
  -d '{"deviceName": "debug-device", "publicKey": "dummy-key", "secret": "secret"}')

if echo "$DEVICE_RESPONSE" | jq -e '.deviceId' > /dev/null; then
    echo "✅ Device registration works"
    echo "$DEVICE_RESPONSE" | jq
    DEVICE_ID=$(echo "$DEVICE_RESPONSE" | jq -r '.deviceId')
    TOKEN=$(echo "$DEVICE_RESPONSE" | jq -r '.token')
else
    echo "❌ Device registration failed"
    echo "$DEVICE_RESPONSE"
    exit 1
fi

echo

# Test 3: Test sync events endpoint
echo "3. Testing sync events endpoint..."
SYNC_RESPONSE=$(curl -s -X POST http://localhost:8000/sync/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "events": [
      {
        "id": "debug-event-1",
        "timestamp": '$(date +%s)'000,
        "eventType": "CREATE",
        "entityType": "history",
        "entityId": "debug-node-1",
        "data": {
          "id": "debug-node-1",
          "url": "https://debug-test.com",
          "tabId": 999,
          "timestamp": '$(date +%s)'000,
          "navigationSourceId": null,
          "createdAt": '$(date +%s)'000,
          "updatedAt": '$(date +%s)'000
        }
      }
    ]
  }')

if echo "$SYNC_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Sync events endpoint works"
    echo "$SYNC_RESPONSE" | jq
else
    echo "❌ Sync events endpoint failed"
    echo "$SYNC_RESPONSE"
    exit 1
fi

echo

# Test 4: Check backend database
echo "4. Checking backend database..."
EVENTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/sync/events?since=0")

if echo "$EVENTS_RESPONSE" | jq -e '.events' > /dev/null; then
    echo "✅ Backend database has events:"
    echo "$EVENTS_RESPONSE" | jq '.events | length' | xargs echo "Number of events:"
else
    echo "❌ Failed to retrieve events from backend"
    echo "$EVENTS_RESPONSE"
fi

echo
echo "=== Backend tests completed ==="
echo
echo "If all backend tests pass, the issue is likely in the extension."
echo "To debug the extension:"
echo "1. Load the extension in Chrome"
echo "2. Open the extension popup and set up sync with:"
echo "   - Server URL: http://localhost:8000"
echo "   - Device Name: test-device"
echo "   - Shared Secret: secret"
echo "3. Navigate to some pages and check the browser console for sync logs"
echo "4. Look for logs starting with 'SyncService:', 'SyncClient:', or 'Background:'"
