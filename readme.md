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
bun install
bun run dev
```

Then load the extension in your browser from the `.output` directory.

### 3. Device Registration

1. Generate a shared secret and update your `.env` file
2. In the extension popup, register your device with the shared secret
3. Repeat on other devices

## Documentation

- [Backend Documentation](./backend/README.md) - Server setup, API, deployment
- [Extension Documentation](./extension/README.md) - Extension development and usage
- [Testing Documentation](./tests/README.md) - Comprehensive test suite documentation
- [Test Suite Organization](./TEST_SUITE_ORGANIZATION.md) - Test structure and organization details

## Testing

The project includes a comprehensive test suite organized into different categories:

### Test Structure
```
tests/
├── e2e/                    # End-to-End Integration Tests
│   ├── extension-core.spec.ts      # Core extension functionality
│   └── cross-device-sync.spec.ts   # Cross-device synchronization
└── verification/           # Implementation Verification Tests
    └── implementation-check.spec.ts # Sync fix verification
```

### Running Tests
```bash
# Run all E2E tests
bun run test:e2e

# Run specific test suites
bun run test:e2e tests/e2e/extension-core.spec.ts
bun run test:e2e tests/e2e/cross-device-sync.spec.ts
bun run test:e2e tests/verification/implementation-check.spec.ts
```

### Sync Notification Fix
The test suite verifies the implemented fix that ensures cross-device sync events immediately update the popup UI without requiring the popup to be closed and reopened. This fix includes:

- Callback mechanism in `SyncClient` for sync event notifications
- Background script integration that broadcasts `HISTORY_UPDATED` events
- Popup automatic refresh when sync events are received from other devices

## Architecture

The system uses an event-sourcing approach where all changes are stored as events and then applied to build the current state. This ensures reliable synchronization across devices.

```
Extension ←→ WebSocket/HTTP ←→ Backend Server ←→ SQLite Database
```

## Security

- Device-based authentication with JWT tokens
- Shared secret for initial device registration
- HTTPS transport encryption
- No user accounts needed (personal use)

## Development

Both the extension and backend can be developed independently:

- **Extension**: Hot-reload development server with WXT
- **Backend**: Deno with watch mode for rapid iteration

### VS Code Launch Configuration

The project includes VS Code launch configurations for easy development without using the console:

#### Quick Start Options

- **🚀 Start Full Development Environment**: Launches both backend server and extension development simultaneously
- **🚀 Start Backend Server**: Runs the backend with watch mode for hot-reload
- **🧩 Start Extension Development**: Starts the extension development server

#### Testing Options

- **🧪 Run All Tests**: Executes backend unit tests and integration tests sequentially
- **🧪 Run Backend Unit Tests**: Runs Deno unit tests
- **🧪 Run Backend Integration Tests**: Runs integration test suite
- **🧪 Run E2E Tests**: Runs Playwright end-to-end tests
- **🧪 Run E2E Tests (Headed)**: Runs E2E tests with visible browser
- **🐛 Debug E2E Tests**: Runs E2E tests in debug mode

#### Debug Tools

- **🔧 Debug Database**: Inspect database state and contents
- **🔧 Debug Sync**: Debug synchronization processes

Simply open the VS Code Command Palette (`Cmd+Shift+P` on macOS) and type "Debug: Select and Start Debugging" to see all available options.

## Deployment

The backend is designed to run on your personal server using Docker Compose for easy management and persistence.

## License
private use only