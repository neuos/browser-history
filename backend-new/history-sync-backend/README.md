# History Sync Backend

A modern Deno-based backend server for cross-device browser history synchronization using Hono v4.8.2 and SQLite.

## Features

- **Hono v4.8.2** - Fast, lightweight web framework
- **SQLite** - Using Deno's built-in `node:sqlite` module
- **WebSocket** - Real-time synchronization between devices
- **JWT Authentication** - Secure device authentication
- **Event Sourcing** - Full history tracking with sync events
- **TypeScript** - Full type safety throughout

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── types/
│   ├── index.ts           # Type definitions
│   └── hono.d.ts          # Hono context extensions
├── database/
│   └── database.ts        # SQLite database operations
├── routes/
│   ├── auth.ts            # Authentication endpoints
│   ├── sync.ts            # Sync endpoints
│   ├── history.ts         # History endpoints
│   └── devices.ts         # Device management
├── websocket/
│   └── manager.ts         # WebSocket connection management
└── scripts/
    └── migrate.ts         # Database migration script
```

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) v2.2 or later

### Installation & Setup

1. Clone and navigate to the project:
   ```bash
   cd backend-new/history-sync-backend
   ```

2. Initialize the database:
   ```bash
   deno task db:migrate
   ```

3. Start the development server:
   ```bash
   deno task dev
   ```

   Or start the production server:
   ```bash
   deno task start
   ```

The server will start on `http://localhost:8000` by default.

## Available Scripts

- `deno task dev` - Start development server with file watching
- `deno task start` - Start production server
- `deno task db:migrate` - Initialize/migrate database

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /auth/register-device` - Register a new device
- `POST /auth/refresh-token` - Refresh authentication token

### Sync
- `GET /sync/events` - Get sync events since timestamp
- `POST /sync/events` - Submit sync events
- `GET /sync/state/:deviceId` - Get sync state for device

### History
- `GET /history` - Get history entries

### Devices
- `GET /devices` - Get all registered devices
- `DELETE /devices/:deviceId` - Delete a device

### WebSocket
- `GET /ws` - WebSocket endpoint for real-time sync

## Environment Variables

- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `SHARED_SECRET` - Secret for device registration
- `JWT_SECRET` - Secret for JWT token signing
- `DATABASE_PATH` - SQLite database file path (default: ./data/history.db)
- `CORS_ORIGIN` - CORS origin (default: *)

## Database Schema

The backend uses SQLite with the following tables:

- `devices` - Registered devices
- `sync_events` - Event sourcing log
- `history_nodes` - Current history state
- `pages` - Page metadata
- `sync_state` - Device sync state tracking

## Development

The project uses:

- **Deno** for runtime and package management
- **Hono** for HTTP server and routing
- **SQLite** for data persistence
- **WebSocket** for real-time communication
- **TypeScript** for type safety

All dependencies are managed through Deno's built-in package manager with JSR imports.

## Migration from Old Backend

This is a complete rewrite of the backend using:

- ✅ Hono v4.8.2 (latest stable)
- ✅ Deno's built-in `node:sqlite` (no external SQLite dependencies)
- ✅ Modern TypeScript with full type safety
- ✅ Proper Hono context variable typing
- ✅ Updated middleware patterns
- ✅ Clean project structure following Deno best practices

The API endpoints remain compatible with existing frontend clients.
