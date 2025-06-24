#!/bin/bash

# Start script for the history sync backend

set -e

echo "🚀 Starting Browser History Sync Backend"

# Check if Deno is available
if command -v deno &> /dev/null; then
    echo "🦕 Using Deno..."
    
    # Create data directory if it doesn't exist
    mkdir -p ./data
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Creating from .env.example..."
        cp .env.example .env
        echo "📝 Please edit .env with your configuration if needed."
    fi
    
    # Run database migrations
    echo "🔄 Running database migrations..."
    deno task db:migrate
    
    # Start the server
    echo "🚀 Starting server..."
    deno task start
    
else
    echo "❌ Deno not found. Please install Deno:"
    echo "  - Deno: https://deno.land/install"
    exit 1
fi
