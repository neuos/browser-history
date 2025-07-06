# Test Strategy Plan

## 📋 Test Categories

### 1. **Backend Tests**
- **Unit Tests** (`backend/src/tests/`)
  - Database operations
  - Auth functions 
  - Sync logic
  - SSE manager
- **Integration Tests**
  - API endpoints
  - Full sync flow
  - Database migrations

### 2. **Extension Tests**
- **Unit Tests** (to be created)
  - SyncClient
  - HistoryService
  - Background script logic
- **E2E Tests** (existing)
  - Full extension functionality
  - Cross-device sync
  - UI interactions

### 3. **System Tests**
- **End-to-End Integration**
  - Extension + Backend together
  - Real browser scenarios
  - Multi-device simulation

### 4. **Debug/Manual Tests**
- **Debugging Tools**
  - Database inspection
  - Event monitoring
  - Sync state debugging

## 🎯 Unified Test Command Structure

```json
{
  "scripts": {
    // Main test commands
    "test": "bun run test:all",
    "test:all": "bun run test:backend && bun run test:extension && bun run test:e2e",
    "test:quick": "bun run test:backend:unit && bun run test:extension:unit",
    
    // Backend tests
    "test:backend": "bun run test:backend:unit && bun run test:backend:integration", 
    "test:backend:unit": "cd backend && deno test --allow-all src/tests/",
    "test:backend:integration": "cd backend && ./test.sh",
    
    // Extension tests
    "test:extension": "bun run test:extension:unit && bun run test:extension:build",
    "test:extension:unit": "cd extension && bun test", // To be implemented
    "test:extension:build": "cd extension && bun run build",
    
    // E2E tests
    "test:e2e": "playwright test extension-simple.spec.ts --reporter=line",
    "test:e2e:headed": "playwright test extension-simple.spec.ts --headed --reporter=line",
    "test:e2e:ui": "playwright test extension-simple.spec.ts --ui",
    "test:e2e:debug": "playwright test extension-simple.spec.ts --debug",
    
    // Debug utilities
    "debug:db": "cd backend && deno run --allow-all scripts/debug-database.ts",
    "debug:sync": "cd backend && deno run --allow-all scripts/debug-sync.ts",
    "debug:events": "cd backend && deno run --allow-all scripts/debug-events.ts",
    
    // Setup and cleanup
    "test:setup": "./test-setup.sh",
    "test:clean": "bun run test:clean:artifacts && bun run test:clean:db",
    "test:clean:artifacts": "rm -rf test-results playwright-report *.png",
    "test:clean:db": "rm -f backend/data/test*.db backend/*.db",
    
    // Development
    "dev:backend": "cd backend && deno task dev",
    "dev:extension": "cd extension && bun run dev",
    "build:all": "bun run build:extension",
    "build:extension": "cd extension && bun run build"
  }
}
```

## 📁 Proposed File Structure

```
browser-history/
├── tests/                          # E2E tests (Playwright)
│   ├── extension-simple.spec.ts
│   ├── extension-sync.spec.ts      # New: Detailed sync tests
│   ├── extension-multi-device.spec.ts # New: Multi-device tests
│   ├── fixtures.ts
│   ├── pages/
│   └── README.md
├── backend/
│   ├── src/tests/                  # Backend unit tests (Deno)
│   │   ├── database.test.ts
│   │   ├── auth.test.ts            # New
│   │   ├── sync.test.ts            # New  
│   │   └── sse.test.ts             # New
│   ├── scripts/                    # Debug/utility scripts
│   │   ├── debug-database.ts       # Database inspection
│   │   ├── debug-sync.ts           # Sync monitoring
│   │   ├── debug-events.ts         # Event debugging
│   │   └── migrate.ts              # DB migrations
│   ├── test.sh                     # Integration tests
│   └── deno.json                   # Backend test config
├── extension/
│   ├── src/tests/                  # Extension unit tests (Bun)
│   │   ├── sync-client.test.ts     # New
│   │   ├── history-service.test.ts # New
│   │   └── background.test.ts      # New
│   └── package.json               # Extension test config
├── package.json                   # Root test orchestration
├── playwright.config.ts           # E2E test config
├── test-setup.sh                  # Test environment setup
└── bun.lockb
```

## 🚀 Implementation Steps

### Phase 1: Unified Commands (Immediate)
1. Update root `package.json` with comprehensive test scripts
2. Create `test-setup.sh` improvements
3. Add `test:clean` utilities

### Phase 2: Backend Test Coverage (Next)
1. Add `auth.test.ts` - JWT, device registration
2. Add `sync.test.ts` - Sync event handling
3. Add `sse.test.ts` - SSE connection management
4. Create debug scripts in `backend/scripts/`

### Phase 3: Extension Unit Tests (Future)
1. Set up Bun testing for extension
2. Add `sync-client.test.ts`
3. Add `history-service.test.ts`
4. Add `background.test.ts`

### Phase 4: Enhanced E2E Tests (Future)
1. Add detailed sync flow tests
2. Add multi-device simulation tests
3. Add error handling tests

## ✅ Benefits

1. **Single Command**: `bun test` runs everything
2. **Granular Control**: Run specific test types as needed
3. **Fast Development**: `bun run test:quick` for rapid feedback
4. **Debug Tools**: Built-in debugging utilities
5. **Clean Environment**: Easy cleanup between test runs
6. **CI Ready**: Structure works well for automated testing
