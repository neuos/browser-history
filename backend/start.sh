#!/bin/bash

# Start script for the history sync backend

set -e

echo "🚀 Starting Browser History Sync Backend"

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "📦 Using Docker Compose..."
    
    # Create data directory if it doesn't exist
    mkdir -p ./data
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Creating from .env.example..."
        cp .env.example .env
        echo "📝 Please edit .env with your configuration and run this script again."
        exit 1
    fi
    
    # Start services
    docker-compose up -d
    
    echo "✅ Backend started successfully!"
    echo "🌐 Server: http://localhost:8000"
    echo "🔍 Health: http://localhost:8000/health"
    echo ""
    echo "📋 Useful commands:"
    echo "  docker-compose logs -f    # View logs"
    echo "  docker-compose down       # Stop services"
    echo "  docker-compose restart    # Restart services"
    
elif command -v deno &> /dev/null; then
    echo "🦕 Using Deno..."
    
    # Create data directory if it doesn't exist
    mkdir -p ./data
    
    # Run database migrations
    echo "🔄 Running database migrations..."
    deno run --allow-all src/scripts/migrate.ts
    
    # Start the server
    echo "🚀 Starting server..."
    deno run --allow-all src/main.ts
    
else
    echo "❌ Neither Docker nor Deno found. Please install one of:"
    echo "  - Docker & Docker Compose: https://docs.docker.com/get-docker/"
    echo "  - Deno: https://deno.land/install"
    exit 1
fi
