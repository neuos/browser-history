import { Hono } from 'hono'
import type { Database } from '../database/database.ts'
import type { SyncEvent } from '../types/index.ts'
import type { WebSocketManager } from '../websocket/manager.ts'
import { authMiddleware } from './auth.ts'

export function syncRoutes(db: Database, wsManager: WebSocketManager) {
  const app = new Hono()

  // Apply auth middleware to all sync routes
  app.use('*', authMiddleware)

  // Get sync events since timestamp
  app.get('/events', async (c) => {
    try {
      const deviceId = c.get('deviceId')
      const since = parseInt(c.req.query('since') || '0')
      const excludeDevice = c.req.query('exclude_device') !== 'false'

      const events = db.getSyncEvents(
        since, 
        excludeDevice ? deviceId : undefined
      )

      return c.json({ events })
    } catch (error) {
      console.error('Get sync events error:', error)
      return c.json({ error: 'Failed to fetch sync events' }, 500)
    }
  })

  // Submit sync events
  app.post('/events', async (c) => {
    try {
      const deviceId = c.get('deviceId')
      const body = await c.req.json()
      const { events } = body

      if (!Array.isArray(events)) {
        return c.json({ error: 'Events must be an array' }, 400)
      }

      // Process each event
      const processedEvents: SyncEvent[] = []
      
      for (const eventData of events) {
        const event: SyncEvent = {
          id: eventData.id || crypto.randomUUID(),
          deviceId,
          timestamp: eventData.timestamp || Date.now(),
          eventType: eventData.eventType,
          entityType: eventData.entityType,
          entityId: eventData.entityId,
          data: eventData.data,
          checksum: eventData.checksum || '',
        }

        // Validate event
        if (!event.eventType || !event.entityType || !event.entityId) {
          return c.json({ 
            error: 'Invalid event: missing required fields',
            event: eventData 
          }, 400)
        }

        // Store event
        db.addSyncEvent(event)
        
        // Apply event to current state
        await applySyncEvent(db, event)
        
        processedEvents.push(event)
      }

      // Broadcast events to other connected devices via WebSocket
      wsManager.broadcastToOthers(deviceId, {
        type: 'sync_batch',
        data: { events: processedEvents },
        timestamp: Date.now()
      })

      // Update device last seen
      db.updateDeviceLastSeen(deviceId)

      return c.json({ 
        success: true, 
        processed: processedEvents.length,
        events: processedEvents.map(e => ({ id: e.id, timestamp: e.timestamp }))
      })
    } catch (error) {
      console.error('Submit sync events error:', error)
      return c.json({ error: 'Failed to process sync events' }, 500)
    }
  })

  // Get sync state for device
  app.get('/state/:deviceId', async (c) => {
    try {
      const deviceId = c.req.param('deviceId')
      const requestingDeviceId = c.get('deviceId')

      // Only allow devices to get their own state (for now)
      if (deviceId !== requestingDeviceId) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const state = db.getSyncState(deviceId)
      if (!state) {
        // Return default state
        return c.json({
          deviceId,
          lastSyncTimestamp: 0,
          syncVector: {}
        })
      }

      return c.json(state)
    } catch (error) {
      console.error('Get sync state error:', error)
      return c.json({ error: 'Failed to get sync state' }, 500)
    }
  })

  return app
}

// Apply a sync event to the current state
async function applySyncEvent(db: Database, event: SyncEvent) {
  const now = Date.now()

  try {
    if (event.entityType === 'history') {
      const historyNode = {
        id: event.entityId,
        deviceId: event.data.deviceId || event.deviceId,
        url: event.data.url,
        tabId: event.data.tabId,
        timestamp: event.data.timestamp,
        navigationSourceId: event.data.navigationSourceId,
        createdAt: event.data.createdAt || now,
        updatedAt: now,
        deletedAt: event.eventType === 'DELETE' ? now : undefined
      }
      db.upsertHistoryNode(historyNode)
    } else if (event.entityType === 'page') {
      const page = {
        url: event.entityId,
        title: event.data.title,
        favicon: event.data.favicon,
        metadata: event.data.metadata || {},
        lastUpdate: event.data.lastUpdate || now,
        createdAt: event.data.createdAt || now,
        updatedAt: now,
        deletedAt: event.eventType === 'DELETE' ? now : undefined
      }
      db.upsertPage(page)
    }
  } catch (error) {
    console.error('Failed to apply sync event:', event, error)
    throw error
  }
}
