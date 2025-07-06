#!/bin/bash

# Debug Extension Sync - Test script to debug extension sync functionality
# This script helps identify where the sync is failing in the extension workflow

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
  -d '{"deviceName": "debug-extension-device", "secret": "secret"}')

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
CURRENT_TIME=$(date +%s)000
SYNC_RESPONSE=$(curl -s -X POST http://localhost:8000/sync/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "events": [
      {
        "id": "debug-event-'$CURRENT_TIME'",
        "timestamp": '$CURRENT_TIME',
        "eventType": "CREATE",
        "entityType": "history",
        "entityId": "debug-node-'$CURRENT_TIME'",
        "data": {
          "id": "debug-node-'$CURRENT_TIME'",
          "url": "https://debug-test.com",
          "tabId": 999,
          "timestamp": '$CURRENT_TIME',
          "navigationSourceId": null,
          "createdAt": '$CURRENT_TIME',
          "updatedAt": '$CURRENT_TIME'
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
echo "=== Backend API tests completed ✅ ==="
echo
echo "🔧 Extension Debug Instructions:"
echo "If all backend tests pass, the issue is likely in the extension."
echo
echo "1. 🏗️  Build the extension:"
echo "   cd extension && bun run build"
echo
echo "2. 🌐 Load the extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable Developer mode"
echo "   - Load unpacked: extension/.output/chrome-mv3"
echo
echo "3. ⚙️  Set up sync in extension popup:"
echo "   - Server URL: http://localhost:8000"
echo "   - Device Name: test-device"
echo "   - Shared Secret: secret"
echo
echo "4. 🕵️  Debug browser console logs:"
echo "   - Open DevTools (F12)"
echo "   - Check Console tab for logs starting with:"
echo "     * 'SyncService:'"
echo "     * 'SyncClient:'"
echo "     * 'Background:'"
echo "     * 'HistoryService:'"
echo
echo "5. 🌐 Navigate to test pages and monitor sync activity"
echo
echo "6. 🔍 Check extension background page logs:"
echo "   - Go to chrome://extensions/"
echo "   - Click 'Inspect views: service worker' for the extension"
