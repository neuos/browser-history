#!/bin/bash

# Pre-test setup script
echo "🔧 Setting up E2E test environment..."

# Build the extension
echo "📦 Building extension..."
cd extension && bun run build
cd ..

# Check if backend is running
echo "🔍 Checking backend status..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "⚠️  Backend is not running. Please start it with:"
    echo "   cd backend && deno run --allow-all src/main.ts"
    echo ""
    echo "Or the test will start it automatically."
fi

# Ensure test reports directory exists
mkdir -p playwright-report
mkdir -p test-results

echo "✅ E2E test environment ready!"
echo ""
echo "🚀 Run tests with:"
echo "   bun run test:e2e          # Run all tests"
echo "   bun run test:e2e:headed   # Run with browser UI"
echo "   bun run test:e2e:ui       # Run with Playwright UI"
echo "   bun run test:e2e:debug    # Run in debug mode"
echo ""
