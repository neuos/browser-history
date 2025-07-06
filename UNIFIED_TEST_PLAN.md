# Unified Test Setup Plan

## 📊 Current Test State Analysis

### ✅ **Existing Tests**
- **Backend Unit Tests**: `backend/src/tests/database.test.ts` (Deno)
- **Backend Integration Tests**: `backend/test.sh` (Shell script with curl)
- **E2E Tests**: `tests/extension-simple.spec.ts` (Playwright)
- **Test Infrastructure**: Playwright config, fixtures, test setup scripts

### 🔧 **Debug Files Identified**
- **Backend Debug Scripts**: 
  - `backend/test-fix.ts` - FOREIGN KEY constraint debugging
  - `backend/test-sync-fix.ts` - Sync event processing tests
  - `backend/test-failing-events.ts` - Specific failing event reproduction
  - `backend/debug_env.ts` - Environment variable debugging
- **Extension Debug Scripts**:
  - `extension/debug-sync.sh` - Extension sync functionality testing

### 🧹 **Files to Clean Up**
The debug files above should be moved to a proper debug/scripts directory rather than cluttering the root directories.

## 🎯 Unified Test Command Structure

### **Root package.json Scripts** (Implementation Ready)

```json
{
  "scripts": {
    // === Main Test Commands ===
    "test": "bun run test:setup && bun run test:all",
    "test:all": "bun run test:backend && bun run test:extension && bun run test:e2e",
    "test:quick": "bun run test:backend:unit && bun run test:extension:unit",
    "test:ci": "bun run test:clean && bun run test:setup && bun run test:all",
    
    // === Backend Tests ===
    "test:backend": "bun run test:backend:unit && bun run test:backend:integration",
    "test:backend:unit": "cd backend && deno test --allow-all src/tests/",
    "test:backend:integration": "cd backend && chmod +x test.sh && ./test.sh",
    "test:backend:watch": "cd backend && deno test --allow-all --watch src/tests/",
    
    // === Extension Tests ===
    "test:extension": "bun run test:extension:unit && bun run test:extension:build",
    "test:extension:unit": "cd extension && bun test", 
    "test:extension:build": "cd extension && bun run build",
    "test:extension:watch": "cd extension && bun test --watch",
    
    // === E2E Tests ===
    "test:e2e": "bun run build:extension && playwright test extension-simple.spec.ts --reporter=line",
    "test:e2e:headed": "bun run build:extension && playwright test extension-simple.spec.ts --headed --reporter=line",
    "test:e2e:ui": "bun run build:extension && playwright test extension-simple.spec.ts --ui",
    "test:e2e:debug": "bun run build:extension && playwright test extension-simple.spec.ts --debug",
    "test:e2e:report": "playwright show-report",
    
    // === Debug Utilities ===
    "debug:db": "cd backend && deno run --allow-all scripts/debug-database.ts",
    "debug:sync": "cd backend && deno run --allow-all scripts/debug-sync.ts", 
    "debug:events": "cd backend && deno run --allow-all scripts/debug-events.ts",
    "debug:env": "cd backend && deno run --allow-all scripts/debug-env.ts",
    "debug:extension": "cd extension && chmod +x scripts/debug-sync.sh && ./scripts/debug-sync.sh",
    
    // === Setup and Cleanup ===
    "test:setup": "chmod +x test-setup.sh && ./test-setup.sh",
    "test:clean": "bun run test:clean:artifacts && bun run test:clean:db",
    "test:clean:artifacts": "rm -rf test-results playwright-report *.png backend/*.db",
    "test:clean:db": "rm -f backend/data/test*.db backend/test-*.db",
    
    // === Development ===
    "dev:backend": "cd backend && deno task dev",
    "dev:extension": "cd extension && bun run dev", 
    "dev:full": "concurrently \"bun run dev:backend\" \"bun run dev:extension\"",
    "build:all": "bun run build:extension",
    "build:extension": "cd extension && bun run build"
  }
}
```

## 📁 Proposed Directory Reorganization

### **Move Debug Files to Proper Structure**

```
backend/
├── scripts/                    # 📁 NEW: Organized debug/utility scripts
│   ├── debug-database.ts      # Move from backend/debug_env.ts + enhance
│   ├── debug-sync.ts          # Move from backend/test-sync-fix.ts
│   ├── debug-events.ts        # Move from backend/test-failing-events.ts  
│   ├── debug-foreign-keys.ts  # Move from backend/test-fix.ts
│   └── migrate.ts             # Existing migration script
├── src/tests/                 # ✅ Existing unit tests
│   ├── database.test.ts       # ✅ Already exists
│   ├── auth.test.ts           # 📝 TODO: Create auth/JWT tests
│   ├── sync.test.ts           # 📝 TODO: Create sync logic tests
│   └── sse.test.ts            # 📝 TODO: Create SSE tests
└── test.sh                   # ✅ Existing integration tests

extension/
├── scripts/                   # 📁 NEW: Organized debug scripts  
│   └── debug-sync.sh         # Move from extension/debug-sync.sh
├── src/tests/                # 📁 NEW: Extension unit tests
│   ├── sync-client.test.ts   # 📝 TODO: SyncClient tests
│   ├── history-service.test.ts # 📝 TODO: HistoryService tests
│   └── background.test.ts    # 📝 TODO: Background script tests
└── package.json              # Update with test scripts

tests/                        # ✅ Existing E2E tests
├── extension-simple.spec.ts  # ✅ Already exists
├── extension-sync.spec.ts    # 📝 TODO: Detailed sync tests
├── fixtures.ts               # ✅ Already exists
└── pages/                    # ✅ Already exists
```

## 🚀 Implementation Phases

### **Phase 1: Immediate (Directory Cleanup + Unified Commands)**
1. **Reorganize debug files** into proper `scripts/` directories
2. **Update root package.json** with comprehensive test scripts
3. **Test the unified commands** to ensure they work
4. **Clean up root directories** of temporary debug files

### **Phase 2: Backend Test Coverage (Next Sprint)**
1. **Create `backend/src/tests/auth.test.ts`** - JWT, device registration
2. **Create `backend/src/tests/sync.test.ts`** - Sync event handling, FOREIGN KEY fixes
3. **Create `backend/src/tests/sse.test.ts`** - SSE connection management
4. **Enhance debug scripts** with better error handling and documentation

### **Phase 3: Extension Unit Tests (Future Sprint)**
1. **Set up Bun testing** configuration for extension
2. **Create `extension/src/tests/sync-client.test.ts`** - Test SyncClient logic
3. **Create `extension/src/tests/history-service.test.ts`** - Test HistoryService
4. **Create `extension/src/tests/background.test.ts`** - Test background scripts

### **Phase 4: Enhanced E2E Coverage (Future Sprint)**
1. **Add detailed sync flow tests** (`extension-sync.spec.ts`)
2. **Add multi-device simulation tests** (`extension-multi-device.spec.ts`)
3. **Add error handling and edge case tests**
4. **Add performance and load testing**

## 🎨 Developer Experience Improvements

### **Simple Commands for Common Tasks**
```bash
# Run all tests
bun test

# Quick development feedback
bun run test:quick

# Test specific components
bun run test:backend
bun run test:extension  
bun run test:e2e

# Debug specific issues
bun run debug:sync
bun run debug:db
bun run debug:events

# Clean environment
bun run test:clean
```

### **Continuous Integration Ready**
```bash
# CI pipeline command
bun run test:ci
```

### **Development Workflow**
```bash
# Start development servers
bun run dev:full

# Watch tests during development  
bun run test:backend:watch
bun run test:extension:watch
```

## 🎯 Benefits of This Approach

1. **🚀 Single Entry Point**: `bun test` runs everything
2. **⚡ Fast Feedback**: `bun run test:quick` for rapid development
3. **🎯 Granular Control**: Test specific components as needed
4. **🔧 Debug Tools**: Built-in debugging utilities
5. **🧹 Clean Environment**: Easy cleanup between test runs
6. **📊 CI Ready**: Structure works well for automated testing
7. **📁 Organized**: Debug files in proper locations, not cluttering root
8. **🔄 Maintainable**: Clear separation of concerns

## 📋 Next Steps

1. **Implement Phase 1** (directory cleanup + unified commands)
2. **Test the unified command structure** 
3. **Create missing backend unit tests** (auth, sync, sse)
4. **Set up extension unit testing** with Bun
5. **Enhance E2E test coverage**

This plan provides a clear path from the current fragmented test setup to a unified, professional testing system that will scale with the project.
