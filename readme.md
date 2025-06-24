# Browser History Sync

A cross-device browser history synchronization system consisting of a browser extension and a backend server.

## Project Structure

```
browser-history/
├── extension/          # Browser extension (WXT + Svelte)
│   ├── src/           # Extension source code
│   ├── public/        # Static assets
│   └── package.json   # Extension dependencies
├── backend/           # Sync server (Deno + Hono + SQLite)
│   ├── src/          # Server source code
│   ├── Dockerfile    # Container configuration
│   └── docker-compose.yml
└── README.md         # This file
```

## Features

- **Real-time History Sync** across multiple devices
- **Metadata Extraction** from web pages (Open Graph, Twitter Cards, etc.)
- **Privacy-focused** - designed for personal use
- **Docker-based Backend** for easy deployment
- **Modern Tech Stack** - Deno, TypeScript, Svelte

## Quick Start

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your secrets

# Using Docker (recommended)
docker-compose up -d

# Or using Deno directly
deno task dev
```

### 2. Extension Setup

```bash
cd extension
npm install  # or bun install
npm run dev
```

Then load the extension in your browser from the `.output` directory.

### 3. Device Registration

1. Generate a shared secret and update your `.env` file
2. In the extension popup, register your device with the shared secret
3. Repeat on other devices

## Documentation

- [Backend Documentation](./backend/README.md) - Server setup, API, deployment
- [Extension Documentation](./extension/README.md) - Extension development and usage

## Architecture

The system uses an event-sourcing approach where all changes are stored as events and then applied to build the current state. This ensures reliable synchronization across devices.

```
Extension ←→ WebSocket/HTTP ←→ Backend Server ←→ SQLite Database
```

## Security

- Device-based authentication with JWT tokens
- Shared secret for initial device registration
- HTTPS/WSS transport encryption
- No user accounts needed (personal use)

## Development

Both the extension and backend can be developed independently:

- **Extension**: Hot-reload development server with WXT
- **Backend**: Deno with watch mode for rapid iteration

## Deployment

The backend is designed to run on your personal server using Docker Compose for easy management and persistence.

## License

MIT - For personal use.
