/**
 * Unit tests for sync callback mechanism that notifies popup of cross-device sync events
 * 
 * This test suite verifies that the SyncClient properly invokes callbacks when:
 * - Sync events are downloaded via HTTP polling
 * - Sync events are received via Server-Sent Events (SSE)
 * - Batch events are processed
 * - No events are received (callback should not be called)
 */

import { SyncClient } from '../../extension/src/lib/sync/SyncClient';
import type { SyncEvent } from '../../extension/src/lib/sync/types';

// Mock browser storage and other browser APIs
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock global browser object
(global as any).browser = mockBrowser;

// Mock fetch globally
(global as any).fetch = jest.fn();

// Mock IndexedDB repositories
jest.mock('../../extension/src/lib/HistoryTree/HistoryRepositoryIndexedDB', () => ({
  HistoryRepositoryIndexedDB: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  }))
}));

jest.mock('../../extension/src/lib/HistoryTree/PageRepositoryIndexedDB', () => ({
  PageRepositoryIndexedDB: jest.fn().mockImplementation(() => ({
    addOrUpdate: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  }))
}));

describe('SyncClient Callback Mechanism', () => {
  let syncClient: SyncClient;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallback = vi.fn();
    
    // Mock storage to return empty config initially
    mockBrowser.storage.local.get.mockResolvedValue({});
    
    syncClient = new SyncClient({
      onSyncEventsApplied: mockCallback,
    });
  });

  describe('HTTP Polling Sync Events', () => {
    it('should call callback when sync events are applied via download', async () => {
      // Mock successful config loading
      mockBrowser.storage.local.get.mockResolvedValue({
        syncConfig: {
          serverUrl: 'http://localhost:5165',
          deviceName: 'Test Device',
          sharedSecret: 'secret',
          token: 'test-token',
        },
        deviceInfo: {
          deviceId: 'device-123',
          deviceName: 'Test Device',
          token: 'test-token',
          expiresIn: 3600,
          registeredAt: Date.now(),
        },
        lastDownloadTimestamp: 0,
      });

      // Mock successful fetch response with sync events
      const mockEvents: SyncEvent[] = [
        {
          id: 'event-1',
          timestamp: Date.now(),
          eventType: 'CREATE',
          entityType: 'history',
          entityId: 'history-1',
          data: {
            id: 'history-1',
            deviceId: 'other-device',
            url: 'https://example.com',
            tabId: 1,
            timestamp: Date.now(),
            navigationSourceId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        {
          id: 'event-2',
          timestamp: Date.now(),
          eventType: 'CREATE',
          entityType: 'page',
          entityId: 'https://example.org',
          data: {
            url: 'https://example.org',
            title: 'Example Org',
            favicon: null,
            metadata: {},
            lastUpdate: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      });

      // Load config and trigger sync
      await syncClient.loadConfig();
      await syncClient.performFullSync();

      // Verify callback was called with the correct event count
      expect(mockCallback).toHaveBeenCalledWith(2);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when no events are downloaded', async () => {
      // Mock successful config loading
      mockBrowser.storage.local.get.mockResolvedValue({
        syncConfig: {
          serverUrl: 'http://localhost:5165',
          deviceName: 'Test Device',
          sharedSecret: 'secret',
          token: 'test-token',
        },
        deviceInfo: {
          deviceId: 'device-123',
          deviceName: 'Test Device',
          token: 'test-token',
          expiresIn: 3600,
          registeredAt: Date.now(),
        },
        lastDownloadTimestamp: 0,
      });

      // Mock fetch response with no events
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [] }),
      });

      await syncClient.loadConfig();
      await syncClient.performFullSync();

      // Verify callback was not called when no events were received
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Server-Sent Events (SSE)', () => {
    beforeEach(() => {
      // Mock EventSource
      const mockEventSource = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
        readyState: EventSource.OPEN,
        onopen: null,
        onmessage: null,
        onerror: null,
      };

      global.EventSource = vi.fn(() => mockEventSource) as any;
    });

    it('should call callback when single SSE event is received', async () => {
      // Mock successful config loading
      mockBrowser.storage.local.get.mockResolvedValue({
        syncConfig: {
          serverUrl: 'http://localhost:5165',
          deviceName: 'Test Device',
          sharedSecret: 'secret',
          token: 'test-token',
        },
        deviceInfo: {
          deviceId: 'device-123',
          deviceName: 'Test Device',
          token: 'test-token',
          expiresIn: 3600,
          registeredAt: Date.now(),
        },
        lastDownloadTimestamp: 0,
      });

      await syncClient.loadConfig();

      // Simulate receiving SSE message with sync event
      const sseMessage = JSON.stringify({
        type: 'sync_event',
        data: {
          id: 'sse-event-1',
          timestamp: Date.now(),
          eventType: 'CREATE',
          entityType: 'history',
          entityId: 'history-sse-1',
          data: {
            id: 'history-sse-1',
            deviceId: 'other-device',
            url: 'https://sse-test.com',
            tabId: 1,
            timestamp: Date.now(),
            navigationSourceId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      });

      // Access the private handleSSEMessage method for testing
      const handleSSEMessage = (syncClient as any).handleSSEMessage.bind(syncClient);
      
      // Wait for the async operations to complete
      await new Promise(resolve => {
        handleSSEMessage(sseMessage);
        // Give time for async operations to complete
        setTimeout(resolve, 100);
      });

      // Verify callback was called for SSE event
      expect(mockCallback).toHaveBeenCalledWith(1);
    });

    it('should handle sync batch events via SSE', async () => {
      // Mock successful config loading
      mockBrowser.storage.local.get.mockResolvedValue({
        syncConfig: {
          serverUrl: 'http://localhost:5165',
          deviceName: 'Test Device',
          sharedSecret: 'secret',
          token: 'test-token',
        },
        deviceInfo: {
          deviceId: 'device-123',
          deviceName: 'Test Device',
          token: 'test-token',
          expiresIn: 3600,
          registeredAt: Date.now(),
        },
        lastDownloadTimestamp: 0,
      });

      await syncClient.loadConfig();

      // Simulate receiving SSE batch message
      const batchEvents = [
        {
          id: 'batch-event-1',
          timestamp: Date.now(),
          eventType: 'CREATE',
          entityType: 'history',
          entityId: 'history-batch-1',
          data: {
            id: 'history-batch-1',
            deviceId: 'other-device',
            url: 'https://batch1.com',
            tabId: 1,
            timestamp: Date.now(),
            navigationSourceId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        {
          id: 'batch-event-2',
          timestamp: Date.now(),
          eventType: 'CREATE',
          entityType: 'history',
          entityId: 'history-batch-2',
          data: {
            id: 'history-batch-2',
            deviceId: 'other-device',
            url: 'https://batch2.com',
            tabId: 1,
            timestamp: Date.now(),
            navigationSourceId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      ];

      const sseMessage = JSON.stringify({
        type: 'sync_batch',
        data: { events: batchEvents },
      });

      // Access the private handleSSEMessage method for testing
      const handleSSEMessage = (syncClient as any).handleSSEMessage.bind(syncClient);
      
      // Wait for the async operations to complete
      await new Promise(resolve => {
        handleSSEMessage(sseMessage);
        // Give time for async operations to complete
        setTimeout(resolve, 100);
      });

      // Verify callback was called with the correct batch count
      expect(mockCallback).toHaveBeenCalledWith(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle callback gracefully when callback is not provided', () => {
      // Create SyncClient without callback
      const syncClientWithoutCallback = new SyncClient();
      
      // Should not throw when trying to call undefined callback
      expect(() => {
        const handleSSEMessage = (syncClientWithoutCallback as any).handleSSEMessage.bind(syncClientWithoutCallback);
        handleSSEMessage(JSON.stringify({
          type: 'sync_event',
          data: {
            id: 'test',
            timestamp: Date.now(),
            eventType: 'CREATE',
            entityType: 'history',
            entityId: 'test',
            data: {}
          }
        }));
      }).not.toThrow();
    });

    it('should handle malformed SSE messages without calling callback', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        syncConfig: {
          serverUrl: 'http://localhost:5165',
          deviceName: 'Test Device',
          sharedSecret: 'secret',
          token: 'test-token',
        },
        deviceInfo: {
          deviceId: 'device-123',
          deviceName: 'Test Device',
          token: 'test-token',
          expiresIn: 3600,
          registeredAt: Date.now(),
        },
        lastDownloadTimestamp: 0,
      });

      await syncClient.loadConfig();

      // Send malformed SSE message
      const handleSSEMessage = (syncClient as any).handleSSEMessage.bind(syncClient);
      
      expect(() => {
        handleSSEMessage('invalid json');
      }).not.toThrow();

      // Callback should not have been called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
