import { Database as SqliteDb } from 'sqlite3'
import type { Device, SyncEvent, HistoryNode, Page, SyncState } from '../types/index.ts'

export class Database {
  private db: SqliteDb

  constructor(path?: string) {
    const dbPath = path || Deno.env.get('DATABASE_PATH') || './data/history.db'
    
    // Ensure data directory exists
    try {
      Deno.mkdirSync('./data', { recursive: true })
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error
      }
    }
    
    this.db = new SqliteDb(dbPath)
    console.log(`📁 Database initialized: ${dbPath}`)
  }

  async init() {
    this.createTables()
    console.log('✅ Database tables created/verified')
  }

  private createTables() {
    // Devices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        public_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      )
    `)

    // Sync events table (event sourcing)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_events (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        checksum TEXT NOT NULL,
        FOREIGN KEY (device_id) REFERENCES devices (device_id)
      )
    `)

    // History nodes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history_nodes (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        url TEXT NOT NULL,
        tab_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        navigation_source_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (device_id) REFERENCES devices (device_id)
      )
    `)

    // Pages table (for SEO metadata)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        url TEXT PRIMARY KEY,
        title TEXT,
        favicon TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        last_update INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `)

    // Sync state table (for conflict resolution)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_state (
        device_id TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER NOT NULL,
        sync_vector TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (device_id) REFERENCES devices (device_id)
      )
    `)

    // Create indexes for better performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON sync_events (timestamp)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_events_device ON sync_events (device_id)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_history_nodes_device ON history_nodes (device_id)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_history_nodes_timestamp ON history_nodes (timestamp)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_history_nodes_url ON history_nodes (url)`)
  }

  // Device operations
  registerDevice(device: Device): void {
    const stmt = this.db.prepare(`
      INSERT INTO devices (device_id, device_name, public_key, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run([
      device.deviceId,
      device.deviceName,
      device.publicKey,
      device.createdAt,
      device.lastSeen
    ])
  }

  getDevice(deviceId: string): Device | undefined {
    const stmt = this.db.prepare(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices WHERE device_id = ?
    `)
    const row = stmt.get([deviceId])
    
    if (!row) return undefined
    
    return {
      deviceId: row[0] as string,
      deviceName: row[1] as string,
      publicKey: row[2] as string,
      createdAt: row[3] as number,
      lastSeen: row[4] as number,
    }
  }

  getAllDevices(): Device[] {
    const stmt = this.db.prepare(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices ORDER BY created_at DESC
    `)
    const rows = stmt.all()
    
    return rows.map((row: unknown[]) => ({
      deviceId: row[0] as string,
      deviceName: row[1] as string,
      publicKey: row[2] as string,
      createdAt: row[3] as number,
      lastSeen: row[4] as number,
    }))
  }

  updateDeviceLastSeen(deviceId: string): void {
    const stmt = this.db.prepare(`
      UPDATE devices SET last_seen = ? WHERE device_id = ?
    `)
    stmt.run([Date.now(), deviceId])
  }

  deleteDevice(deviceId: string): void {
    const deleteDeviceStmt = this.db.prepare('DELETE FROM devices WHERE device_id = ?')
    const deleteSyncStateStmt = this.db.prepare('DELETE FROM sync_state WHERE device_id = ?')
    
    deleteDeviceStmt.run([deviceId])
    deleteSyncStateStmt.run([deviceId])
  }

  // Sync events operations
  addSyncEvent(event: SyncEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO sync_events (id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run([
      event.id,
      event.deviceId,
      event.timestamp,
      event.eventType,
      event.entityType,
      event.entityId,
      JSON.stringify(event.data),
      event.checksum
    ])
  }

  getSyncEvents(since: number, deviceId?: string): SyncEvent[] {
    let stmt
    let params: unknown[]
    
    if (deviceId) {
      stmt = this.db.prepare(`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ? AND device_id != ?
        ORDER BY timestamp ASC
      `)
      params = [since, deviceId]
    } else {
      stmt = this.db.prepare(`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ?
        ORDER BY timestamp ASC
      `)
      params = [since]
    }
    
    const rows = stmt.all(params)
    
    return rows.map((row: unknown[]) => ({
      id: row[0] as string,
      deviceId: row[1] as string,
      timestamp: row[2] as number,
      eventType: row[3] as 'CREATE' | 'UPDATE' | 'DELETE',
      entityType: row[4] as 'history' | 'page',
      entityId: row[5] as string,
      data: JSON.parse(row[6] as string),
      checksum: row[7] as string,
    }))
  }

  // History operations
  addHistoryNode(node: HistoryNode): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO history_nodes (id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run([
      node.id,
      node.deviceId,
      node.url,
      node.tabId,
      node.timestamp,
      node.navigationSourceId || null,
      node.createdAt,
      node.updatedAt,
      node.deletedAt || null
    ])
  }

  getHistoryNodes(deviceId?: string, limit = 100, offset = 0): HistoryNode[] {
    let stmt
    let params: unknown[]
    
    if (deviceId) {
      stmt = this.db.prepare(`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL AND device_id = ?
        ORDER BY timestamp DESC LIMIT ? OFFSET ?
      `)
      params = [deviceId, limit, offset]
    } else {
      stmt = this.db.prepare(`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL
        ORDER BY timestamp DESC LIMIT ? OFFSET ?
      `)
      params = [limit, offset]
    }
    
    const rows = stmt.all(params)
    
    return rows.map((row: unknown[]) => ({
      id: row[0] as string,
      deviceId: row[1] as string,
      url: row[2] as string,
      tabId: row[3] as number,
      timestamp: row[4] as number,
      navigationSourceId: row[5] as string | undefined,
      createdAt: row[6] as number,
      updatedAt: row[7] as number,
      deletedAt: row[8] as number | undefined,
    }))
  }

  // Page operations
  upsertPage(page: Page): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pages (url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run([
      page.url,
      page.title || null,
      page.favicon || null,
      JSON.stringify(page.metadata),
      page.lastUpdate,
      page.createdAt,
      page.updatedAt,
      page.deletedAt || null
    ])
  }

  getPage(url: string): Page | undefined {
    const stmt = this.db.prepare(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url = ? AND deleted_at IS NULL
    `)
    const row = stmt.get([url])
    
    if (!row) return undefined
    
    return {
      url: (row as unknown[])[0] as string,
      title: (row as unknown[])[1] as string | undefined,
      favicon: (row as unknown[])[2] as string | undefined,
      metadata: JSON.parse((row as unknown[])[3] as string),
      lastUpdate: (row as unknown[])[4] as number,
      createdAt: (row as unknown[])[5] as number,
      updatedAt: (row as unknown[])[6] as number,
      deletedAt: (row as unknown[])[7] as number | undefined,
    }
  }

  getPages(urls: string[]): Page[] {
    if (urls.length === 0) return []
    
    const placeholders = urls.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url IN (${placeholders}) AND deleted_at IS NULL
    `)
    const rows = stmt.all(urls)
    
    return rows.map((row: unknown[]) => ({
      url: row[0] as string,
      title: row[1] as string | undefined,
      favicon: row[2] as string | undefined,
      metadata: JSON.parse(row[3] as string),
      lastUpdate: row[4] as number,
      createdAt: row[5] as number,
      updatedAt: row[6] as number,
      deletedAt: row[7] as number | undefined,
    }))
  }

  // Sync state operations
  updateSyncState(state: SyncState): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sync_state (device_id, last_sync_timestamp, sync_vector)
      VALUES (?, ?, ?)
    `)
    stmt.run([state.deviceId, state.lastSyncTimestamp, JSON.stringify(state.syncVector)])
  }

  getSyncState(deviceId: string): SyncState | undefined {
    const stmt = this.db.prepare(`
      SELECT device_id, last_sync_timestamp, sync_vector
      FROM sync_state WHERE device_id = ?
    `)
    const row = stmt.get([deviceId])
    
    if (!row) return undefined
    
    return {
      deviceId: (row as unknown[])[0] as string,
      lastSyncTimestamp: (row as unknown[])[1] as number,
      syncVector: JSON.parse((row as unknown[])[2] as string),
    }
  }

  close() {
    this.db.close()
  }
}
