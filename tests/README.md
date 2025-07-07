# Browser History Extension - Testing Suite

This directory contains comprehensive tests for the Browser History extension using Playwright.

## Overview

The testing suite is organized into different categories to ensure complete coverage:

### E2E Tests (`e2e/`)
- ✅ **Core Extension Functionality** (`extension-core.spec.ts`)
  - Extension loading and popup functionality
  - Sync configuration and setup  
  - History capture from browsing
  - SSE connection establishment
  - Automatic history list updates
  - Sync disconnect handling

- ✅ **Cross-Device Synchronization** (`cross-device-sync.spec.ts`)
  - Real-time sync between multiple browser instances
  - Immediate popup updates when sync events arrive
  - Handling multiple sync events efficiently
  - Multi-device scenario testing

### Verification Tests (`verification/`)
- ✅ **Implementation Verification** (`implementation-check.spec.ts`)
  - Confirms that the sync callback mechanism is properly implemented
  - Validates that the fix for immediate popup updates is in place
  - Documents the flow of sync notifications

## Sync Notification Fix

The main fix implemented ensures that cross-browser sync events immediately update the popup UI without requiring the popup to be closed and reopened.

### How the Fix Works
1. **Device A** navigates to a new page
2. **Device A** captures the history and syncs it to the server  
3. **Device B** receives the sync event via polling or SSE
4. **Device B** applies the sync event to its local storage
5. **Device B** invokes the callback, which broadcasts `HISTORY_UPDATED`
6. **Device B** popup (if open) receives `HISTORY_UPDATED` and reloads the history list
7. **Device B** popup immediately shows the new history from Device A

### Implementation Components
- `SyncClient` accepts callbacks via `SyncClientCallbacks` interface
- `SyncClient` invokes `onSyncEventsApplied` callback when events are processed
- `SyncService` passes callbacks through to `SyncClient`
- Background script uses `createSyncService` factory with callback
- Background script broadcasts `HISTORY_UPDATED` when sync events are applied
- Popup `HistoryList.svelte` listens for `HISTORY_UPDATED` and reloads history

## Prerequisites

1. **Backend Server**: The sync server must be running at `http://localhost:8000`
   ```bash
   cd backend
   deno run --allow-all src/main.ts
   ```

2. **Extension Build**: The extension must be built before testing
   ```bash
   cd extension
   bun run build
   ```

3. **Playwright Browsers**: Browser binaries must be installed
   ```bash
   bunx playwright install
   ```

## Test Structure

### Test Files

- **`extension-simple.spec.ts`**: Main E2E test suite with 4 comprehensive scenarios
- **`fixtures.ts`**: Custom Playwright fixtures for extension context and dependencies  
- **`pages/`**: Page Object Model classes following Playwright best practices
  - `ExtensionPopupPage.ts`: Page object for extension popup interactions
  - `ExtensionManager.ts`: Utility class for extension management and navigation
  - `BackendApi.ts`: API client for backend health checks and event management

### Page Object Model

Following Playwright's recommended [Page Object Model pattern](https://playwright.dev/docs/pom), the tests are organized using dedicated page objects:

#### `ExtensionPopupPage`
Encapsulates all popup interactions:
- `goto()`: Navigate to extension popup
- `setupSync()`: Configure sync settings
- `getSyncStatus()`: Check sync connection status  
- `getHistoryItems()`: Retrieve browsing history
- `disconnect()`: Disconnect from sync server
- `visitPage()`: Navigates to pages to generate history
- `disconnect()`: Disconnects sync

#### `BackendTestUtils`
Provides methods for backend server interaction:
- `checkHealth()`: Verifies server is running
- `getEvents()`: Fetches sync events from server
- `clearEvents()`: Clears server data (not implemented)

## Running Tests

### Basic Commands

```bash
# Run all tests (builds extension first)
bun run test

# Run just E2E tests (assumes extension is built)
bun run test:e2e

# Run with browser UI visible
bun run test:e2e:headed

# Run with Playwright UI for debugging
bun run test:e2e:ui

# Run in debug mode (step through tests)
bun run test:e2e:debug

# View test report
bun run test:e2e:report
```

### Setup Script

```bash
# Run setup script to prepare environment
./test-setup.sh
```

## Test Scenarios

### 1. Extension Loading
- Verifies extension loads correctly
- Checks popup UI elements are present
- Validates initial sync status

### 2. Sync Configuration
- Tests sync setup form
- Verifies connection to backend server
- Checks status updates after configuration

### 3. History Capture
- Navigates to test pages
- Verifies history is captured and displayed
- Tests different types of page navigation

### 4. Cross-Device Sync
- Simulates multiple devices using browser contexts
- Tests history synchronization between devices
- Verifies real-time sync updates

### 5. Error Handling
- Tests network failures
- Verifies graceful degradation
- Checks error message display

## Configuration

### Playwright Config (`playwright.config.ts`)

The configuration includes:
- **Chrome Extension Loading**: Automatically loads the built extension
- **Backend Server**: Starts the Deno backend server
- **Test Parallelization**: Runs tests efficiently
- **Reporting**: Generates HTML reports

### Browser Context Setup

Each test creates a browser context with:
- Storage permissions for the extension
- Extension loaded from `.output/chrome-mv3`
- Isolated environment per test

## Debugging

### Debug Mode
```bash
bun run test:e2e:debug
```
This opens the browser in debug mode where you can:
- Step through test execution
- Inspect the extension popup
- View network requests
- Check console logs

### Browser UI Mode
```bash
bun run test:e2e:headed
```
This runs tests with the browser UI visible so you can see what's happening.

### Playwright UI
```bash
bun run test:e2e:ui
```
This opens the Playwright UI for interactive test development and debugging.

## Test Data

### Mock Data
Tests use predictable test data:
- Server URL: `http://localhost:8000`
- Device names: `Test Device - Playwright`, `Test Device 2 - Playwright`
- Shared secret: `test-secret-e2e`
- Test URLs: `https://example.com`, `https://httpbin.org/get`

### Cleanup
Tests are designed to be isolated and don't require cleanup between runs.

## Troubleshooting

### Common Issues

1. **Extension not found**
   - Ensure extension is built: `cd extension && bun run build`
   - Check build output in `extension/.output/chrome-mv3`

2. **Backend not running**
   - Start backend: `cd backend && deno run --allow-all src/main.ts`
   - Verify health: `curl http://localhost:8000/health`

3. **Timeout errors**
   - Backend might be slow to start
   - Extension sync might take time
   - Increase timeouts in test files if needed

4. **Permission errors**
   - Ensure test setup script is executable: `chmod +x test-setup.sh`
   - Check browser permissions in Playwright config

### Logs and Reports

- **Test Reports**: Generated in `playwright-report/`
- **Screenshots**: Captured on failure in `test-results/`
- **Videos**: Recorded for failed tests (if enabled)
- **Console Logs**: Available in test output and reports

## Extending Tests

### Adding New Test Cases

1. Create new test files in `tests/` directory
2. Use existing utility classes for common operations
3. Follow the pattern of setup → action → assertion
4. Add appropriate `beforeAll`/`afterAll` hooks for cleanup

### Custom Utilities

Add new methods to utility classes for:
- Complex extension interactions
- Backend API calls
- Test data generation
- Custom assertions

## CI/CD Integration

The tests are designed to run in CI environments:
- Headless mode by default
- Retry logic for flaky tests
- Proper cleanup and isolation
- HTML reports for debugging failures

Add to your CI pipeline:
```yaml
- name: Setup Test Environment
  run: ./test-setup.sh

- name: Run E2E Tests
  run: bun run test:e2e

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```
