#!/bin/bash

# Integration test runner that manages server lifecycle

set -e

SERVER_URL="http://localhost:8000"
SERVER_PID=""

# Cleanup function
cleanup() {
  if [ ! -z "$SERVER_PID" ]; then
    echo "🧹 Stopping test server (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
  fi
  # Also kill any other deno processes that might be running main.ts
  pkill -f "deno.*main.ts" 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo "🚀 Starting backend server for integration tests..."
cd "$(dirname "$0")"

# Start server in background
deno run --allow-all src/main.ts &
SERVER_PID=$!

echo "⏳ Waiting for server to be ready..."
# Wait for server to be ready (max 10 seconds)
for i in {1..20}; do
  if curl -s --connect-timeout 1 "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "❌ Server failed to start within 10 seconds"
    exit 1
  fi
  sleep 0.5
done

echo ""
echo "🧪 Running integration tests..."
./test.sh

echo ""
echo "🎉 Integration tests completed successfully!"
