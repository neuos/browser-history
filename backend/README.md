# History Sync Backend

A Deno-based backend server for synchronizing browser history across multiple devices.

## Features

- **Device-based Authentication**: Simple JWT-based auth for personal use
- **Real-time Sync**: WebSocket support for instant updates
- **Event Sourcing**: All changes tracked as events for robust sync
- **SQLite Database**: Lightweight, file-based storage
- **Docker Support**: Easy deployment with Docker Compose

## Quick Start

### Development

1. **Install Deno** (if not already installed):
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your secrets
   ```

3. **Run the server**:
   ```bash
   deno task dev
   ```

The server will start on `http://localhost:8000`

### Production with Docker Compose

1. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your production secrets
   ```

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

3. **Check status**:
   ```bash
   docker-compose logs -f
   curl http://localhost:8000/health
   ```

## API Endpoints

### Authentication
- `POST /auth/register-device` - Register a new device
- `POST /auth/refresh-token` - Refresh JWT token

### Sync
- `GET /sync/events?since=timestamp` - Get sync events
- `POST /sync/events` - Submit sync events
- `GET /sync/state/:deviceId` - Get sync state

### Data
- `GET /history` - Get history entries
- `GET /devices` - Get registered devices
- `DELETE /devices/:deviceId` - Remove device

### WebSocket
- `GET /ws` - WebSocket endpoint for real-time sync

## Device Setup

1. **Generate shared secret** (use this in all your browser extensions):
   ```bash
   openssl rand -hex 32
   ```

2. **Register your first device**:
   ```bash
   curl -X POST http://localhost:8000/auth/register-device \
     -H "Content-Type: application/json" \
     -d '{
       "deviceName": "My Laptop", 
       "publicKey": "dummy-key-for-now",
       "secret": "your-shared-secret-here"
     }'
   ```

3. **Use the returned JWT token** in your browser extension.

## Database

The SQLite database is stored in `./data/history.db`. It contains:

- **devices** - Registered devices
- **sync_events** - All sync events (event sourcing)
- **history_nodes** - Current state of history nodes
- **pages** - Current state of page metadata
- **sync_state** - Per-device sync state

## Configuration

Environment variables:

- `SHARED_SECRET` - Secret for device registration
- `JWT_SECRET` - Secret for signing JWT tokens
- `DATABASE_PATH` - Path to SQLite database
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - CORS origin (default: *)

## Security Notes

Since this is for personal use:

- Uses simple shared secret for device registration
- No user accounts - all devices have full access
- HTTPS strongly recommended for production
- Change default secrets in production
- Consider firewall rules to restrict access

## Backup

The SQLite database file contains all your data. Back it up regularly:

```bash
# Simple file copy
cp ./data/history.db ./data/history.db.backup

# Or use SQLite backup command
sqlite3 ./data/history.db ".backup ./data/history.db.backup"
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── main.ts              # Server entry point
│   ├── types/               # TypeScript interfaces
│   ├── database/            # Database layer
│   ├── routes/              # API routes
│   ├── websocket/           # WebSocket manager
│   └── scripts/             # Utility scripts
├── Dockerfile
├── docker-compose.yml
└── deno.json
```

### Available Tasks
```bash
deno task dev          # Development server with watch
deno task start        # Production server
deno task db:migrate   # Run database migrations
```

## Troubleshooting

### Database Issues
```bash
# Check database file
ls -la ./data/
sqlite3 ./data/history.db ".tables"

# Reset database
rm ./data/history.db
deno task db:migrate
```

### Docker Issues
```bash
# Check logs
docker-compose logs history-sync

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
