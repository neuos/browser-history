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
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      )
    `)

    // Current state: History nodes
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
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      )
    `)

    // Current state: Pages
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

    // Sync state tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_state (
        device_id TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER NOT NULL,
        sync_vector TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      )
    `)

    // Indexes for performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON sync_events(timestamp)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_sync_events_device ON sync_events(device_id)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_nodes(timestamp)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_history_device ON history_nodes(device_id)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_history_url ON history_nodes(url)')
  }

  // Device operations
  registerDevice(device: Device): void {
    this.db.exec(`
      INSERT OR REPLACE INTO devices (device_id, device_name, public_key, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `, device.deviceId, device.deviceName, device.publicKey, device.createdAt, device.lastSeen)
  }

  getDevice(deviceId: string): Device | undefined {
    const rows = this.db.prepare(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices WHERE device_id = ?
    `).all(deviceId)
    
    if (rows.length === 0) return undefined
    
    const row = rows[0] as any
    return {
      deviceId: row.device_id,
      deviceName: row.device_name,
      publicKey: row.public_key,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
    }
  }

  getAllDevices(): Device[] {
    const rows = this.db.prepare(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices ORDER BY last_seen DESC
    `).all()
    
    return rows.map((row: any) => ({
      deviceId: row.device_id,
      deviceName: row.device_name,
      publicKey: row.public_key,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
    }))
  }

  updateDeviceLastSeen(deviceId: string): void {
    this.db.sql`
      UPDATE devices SET last_seen = ${Date.now()} WHERE device_id = ${deviceId}
    `
  }

  deleteDevice(deviceId: string): void {
    this.db.sql`DELETE FROM devices WHERE device_id = ${deviceId}`
    this.db.sql`DELETE FROM sync_state WHERE device_id = ${deviceId}`
  }

  // Sync events operations
  addSyncEvent(event: SyncEvent): void {
    this.db.sql`
      INSERT INTO sync_events (id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum)
      VALUES (${event.id}, ${event.deviceId}, ${event.timestamp}, ${event.eventType}, ${event.entityType}, ${event.entityId}, ${JSON.stringify(event.data)}, ${event.checksum})
    `
  }

  getSyncEvents(since: number, deviceId?: string): SyncEvent[] {
    let query: any[]
    
    if (deviceId) {
      query = this.db.sql`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ${since} AND device_id != ${deviceId}
        ORDER BY timestamp ASC
      `
    } else {
      query = this.db.sql`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ${since}
        ORDER BY timestamp ASC
      `
    }
    
    return query.map((row: any) => ({
      id: row.id as string,
      deviceId: row.device_id as string,
      timestamp: row.timestamp as number,
      eventType: row.event_type as 'CREATE' | 'UPDATE' | 'DELETE',
      entityType: row.entity_type as 'history' | 'page',
      entityId: row.entity_id as string,
      data: JSON.parse(row.data as string),
      checksum: row.checksum as string,
    }))
  }

  // History operations
  upsertHistoryNode(node: HistoryNode): void {
    this.db.query(`
      INSERT OR REPLACE INTO history_nodes 
      (id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    let rows: any[]
    
    if (deviceId) {
      rows = this.db.sql`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL AND device_id = ${deviceId}
        ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = this.db.sql`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL
        ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
      `
    }
    
    return rows.map((row: any) => ({
      id: row.id as string,
      deviceId: row.device_id as string,
      url: row.url as string,
      tabId: row.tab_id as number,
      timestamp: row.timestamp as number,
      navigationSourceId: row.navigation_source_id as string | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      deletedAt: row.deleted_at as number | undefined,
    }))
  }

  // Page operations
  upsertPage(page: Page): void {
    this.db.sql`
      INSERT OR REPLACE INTO pages (url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at)
      VALUES (${page.url}, ${page.title || null}, ${page.favicon || null}, ${JSON.stringify(page.metadata)}, ${page.lastUpdate}, ${page.createdAt}, ${page.updatedAt}, ${page.deletedAt || null})
    `
  }

  getPage(url: string): Page | undefined {
    const rows = this.db.sql`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url = ${url} AND deleted_at IS NULL
    `
    
    if (rows.length === 0) return undefined
    
    const row = rows[0]
    return {
      url: row.url as string,
      title: row.title as string | undefined,
      favicon: row.favicon as string | undefined,
      metadata: JSON.parse(row.metadata as string),
      lastUpdate: row.last_update as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      deletedAt: row.deleted_at as number | undefined,
    }
  }

  getPages(urls: string[]): Page[] {
    if (urls.length === 0) return []
    
    // For SQLite3, we need to handle multiple parameters differently
    const rows = this.db.sql`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url IN (${urls.join(',')}) AND deleted_at IS NULL
    `
    
    return rows.map((row: any) => ({
      url: row.url as string,
      title: row.title as string | undefined,
      favicon: row.favicon as string | undefined,
      metadata: JSON.parse(row.metadata as string),
      lastUpdate: row.last_update as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      deletedAt: row.deleted_at as number | undefined,
    }))
  }
      FROM pages WHERE url IN (${placeholders}) AND deleted_at IS NULL
    `, urls)
    
    return rows.map(row => ({
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
    this.db.query(`
      INSERT OR REPLACE INTO sync_state (device_id, last_sync_timestamp, sync_vector)
      VALUES (?, ?, ?)
    `, [state.deviceId, state.lastSyncTimestamp, JSON.stringify(state.syncVector)])
  }

  getSyncState(deviceId: string): SyncState | undefined {
    const rows = this.db.query(`
      SELECT device_id, last_sync_timestamp, sync_vector
      FROM sync_state WHERE device_id = ?
    `, [deviceId])
    
    if (rows.length === 0) return undefined
    
    const row = rows[0]
    return {
      deviceId: row[0] as string,
      lastSyncTimestamp: row[1] as number,
      syncVector: JSON.parse(row[2] as string),
    }
  }

  close() {
    this.db.close()
  }
}
