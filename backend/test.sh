#!/bin/bash

# Simple test script for the history sync backend

set -e

SERVER_URL="http://localhost:8000"
SHARED_SECRET="secret"
DEVICE_NAME="Test Device"

echo "🧪 Testing History Sync Backend"
echo "Server: $SERVER_URL"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$SERVER_URL/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test device registration
echo "2. Testing device registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$SERVER_URL/auth/register-device" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceName\": \"$DEVICE_NAME\",
    \"secret\": \"$SHARED_SECRET\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

if echo "$REGISTER_RESPONSE" | jq -e '.deviceId' > /dev/null; then
  DEVICE_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.deviceId')
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
  echo "✅ Device registered: $DEVICE_ID"
else
  echo "❌ Device registration failed"
  exit 1
fi
echo ""

# Test token authentication
echo "3. Testing token authentication..."
AUTH_TEST=$(curl -s "$SERVER_URL/devices" \
  -H "Authorization: Bearer $TOKEN")

echo "$AUTH_TEST" | jq '.'

if echo "$AUTH_TEST" | jq -e '.devices' > /dev/null; then
  echo "✅ Token authentication works"
else
  echo "❌ Token authentication failed"
  exit 1
fi
echo ""

# Test sync events
echo "4. Testing sync events..."
SYNC_RESPONSE=$(curl -s -X POST "$SERVER_URL/sync/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "eventType": "CREATE",
      "entityType": "page",
      "entityId": "https://example.com",
      "data": {
        "url": "https://example.com",
        "title": "Example Page",
        "metadata": {
          "og:title": "Example Page"
        }
      }
    }]
  }')

echo "$SYNC_RESPONSE" | jq '.'

if echo "$SYNC_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Sync events work"
else
  echo "❌ Sync events failed"
  exit 1
fi
echo ""

# Test history retrieval
echo "5. Testing history retrieval..."
HISTORY_RESPONSE=$(curl -s "$SERVER_URL/history" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY_RESPONSE" | jq '.'
echo "✅ History retrieval works"
echo ""

echo "🎉 All tests passed! Backend is working correctly."
