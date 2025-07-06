# Debug Guide: Browser History Sync Architecture

## Architecture Overview
The extension now uses a direct, simplified sync architecture:

1. **Background Script**: Contains repositories, sync service, and all sync logic
2. **SyncClient**: Directly applies sync events to repositories (no message passing)
3. **Popup**: Requests data from background script via messaging
4. **No Internal Message Passing**: Eliminates "Receiving end does not exist" errors

## Current Issue Resolution Status
✅ **RESOLVED**: IndexedDB now visible in service worker DevTools context  
✅ **RESOLVED**: Sync events are applied directly to repositories  
✅ **RESOLVED**: No more "Receiving end does not exist" errors  
✅ **RESOLVED**: Data integrity with comprehensive timestamp validation  
✅ **RESOLVED**: Popup-background communication for history data  

## Debug Steps

### 1. Load the Updated Extension
1. Open Chrome and go to `chrome://extensions/`
2. Make sure "Developer mode" is enabled
3. Remove the old extension if loaded
4. Click "Load unpacked" and select `/Users/one/src/github/browser-history/extension/.output/chrome-mv3-dev/`

### 2. Check Background Script Logs
1. In `chrome://extensions/`, find the "Browser History" extension
2. Click "service worker" to open the background script console
3. You should see logs starting with "Background:" and "SyncClient:"

### 3. Set Up Sync
1. Click the extension icon to open the popup
2. Set up sync with:
   - Server URL: `http://localhost:8000`
   - Device Name: `debug-device-d`
   - Shared Secret: `secret`

### 4. Trigger Sync and Check Logs
1. Click "Sync Now" button in the popup
2. Watch the background script console for:
   - Download logs: "SyncClient: Downloaded X events from other devices"
   - Direct application: "SyncClient: Applying sync event directly"
   - Repository writes: "SyncClient: Successfully added history node"
   - Verification: "SyncClient: SUCCESS - History node confirmed in database"

### 5. Check IndexedDB in Service Worker Context
1. In the background script DevTools, go to Application tab
2. Navigate to Storage → IndexedDB → browser-history-db (version 2)
3. Check the "history" and "pages" object stores
4. You should see synced data appearing

### 6. Verify UI Updates
1. Open the popup after sync
2. Check that the history list shows cross-device entries
3. Timestamps should be properly formatted

## Expected Behavior
- **Direct sync**: SyncClient applies events directly to repositories
- **No message errors**: No "Receiving end does not exist" errors
- **Visible database**: IndexedDB appears in service worker DevTools
- **Working UI**: Popup shows synced history from other devices

## Key Logs to Look For

### Success Case:
```
SyncClient: Downloaded 5 events from other devices
SyncClient: Applying sync event directly: CREATE history abc-123
SyncClient: Successfully added history node for: https://example.com from device: xyz-456
SyncClient: SUCCESS - History node confirmed in database
Background: Found 12 history entries for popup
HistoryList: Received history data: 12 entries
```

### Error Case (should not occur now):
```
❌ Could not establish connection. Receiving end does not exist
❌ Failed to broadcast sync event
```

## Architecture Benefits
1. **Simplified**: No internal message passing within background script
2. **Reliable**: Direct repository access eliminates connection errors  
3. **Debuggable**: Clear, linear execution flow
4. **Performant**: No serialization overhead for internal operations
5. **Maintainable**: Single source of truth for data operations

## Files Modified
- `SyncClient.ts` - Direct repository access, removed message passing
- `background.ts` - Removed APPLY_SYNC_EVENT/SYNC_EVENT_RECEIVED handlers
- `HistoryList.svelte` - Message-based data requests to background
- All repositories - Enhanced validation and error handling
