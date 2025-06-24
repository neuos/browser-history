import { DB } from 'https://deno.land/x/sqlite@v3.8.0/mod.ts'
import type { Device, SyncEvent, HistoryNode, Page, SyncState } from '../types/index.ts'

export class Database {
  private db: DB

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
    
    this.db = new DB(dbPath)
    console.log(`📁 Database initialized: ${dbPath}`)
  }

  async init() {
    this.createTables()
    console.log('✅ Database tables created/verified')
  }

  private createTables() {
    // Devices table
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        public_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      )
    `)

    // Sync events table (event sourcing)
    this.db.execute(`
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
    this.db.execute(`
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
    this.db.execute(`
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
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS sync_state (
        device_id TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER NOT NULL,
        sync_vector TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      )
    `)

    // Indexes for performance
    this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON sync_events(timestamp)')
    this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_events_device ON sync_events(device_id)')
    this.db.execute('CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_nodes(timestamp)')
    this.db.execute('CREATE INDEX IF NOT EXISTS idx_history_device ON history_nodes(device_id)')
    this.db.execute('CREATE INDEX IF NOT EXISTS idx_history_url ON history_nodes(url)')
  }

  // Device operations
  registerDevice(device: Device): void {
    this.db.query(`
      INSERT OR REPLACE INTO devices (device_id, device_name, public_key, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `, [device.deviceId, device.deviceName, device.publicKey, device.createdAt, device.lastSeen])
  }

  getDevice(deviceId: string): Device | undefined {
    const rows = this.db.query(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices WHERE device_id = ?
    `, [deviceId])
    
    if (rows.length === 0) return undefined
    
    const row = rows[0]
    return {
      deviceId: row[0] as string,
      deviceName: row[1] as string,
      publicKey: row[2] as string,
      createdAt: row[3] as number,
      lastSeen: row[4] as number,
    }
  }

  getAllDevices(): Device[] {
    const rows = this.db.query(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices ORDER BY last_seen DESC
    `)
    
    return rows.map(row => ({
      deviceId: row[0] as string,
      deviceName: row[1] as string,
      publicKey: row[2] as string,
      createdAt: row[3] as number,
      lastSeen: row[4] as number,
    }))
  }

  updateDeviceLastSeen(deviceId: string): void {
    this.db.query(`
      UPDATE devices SET last_seen = ? WHERE device_id = ?
    `, [Date.now(), deviceId])
  }

  deleteDevice(deviceId: string): void {
    this.db.query('DELETE FROM devices WHERE device_id = ?', [deviceId])
    this.db.query('DELETE FROM sync_state WHERE device_id = ?', [deviceId])
  }

  // Sync events operations
  addSyncEvent(event: SyncEvent): void {
    this.db.query(`
      INSERT INTO sync_events (id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    let query = `
      SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
      FROM sync_events WHERE timestamp > ?
    `
    const params: any[] = [since]

    if (deviceId) {
      query += ' AND device_id != ?'
      params.push(deviceId)
    }

    query += ' ORDER BY timestamp ASC'

    const rows = this.db.query(query, params)
    
    return rows.map(row => ({
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
    let query = `
      SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
      FROM history_nodes WHERE deleted_at IS NULL
    `
    const params: any[] = []

    if (deviceId) {
      query += ' AND device_id = ?'
      params.push(deviceId)
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const rows = this.db.query(query, params)
    
    return rows.map(row => ({
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
    this.db.query(`
      INSERT OR REPLACE INTO pages (url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    const rows = this.db.query(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url = ? AND deleted_at IS NULL
    `, [url])
    
    if (rows.length === 0) return undefined
    
    const row = rows[0]
    return {
      url: row[0] as string,
      title: row[1] as string | undefined,
      favicon: row[2] as string | undefined,
      metadata: JSON.parse(row[3] as string),
      lastUpdate: row[4] as number,
      createdAt: row[5] as number,
      updatedAt: row[6] as number,
      deletedAt: row[7] as number | undefined,
    }
  }

  getPages(urls: string[]): Page[] {
    if (urls.length === 0) return []
    
    const placeholders = urls.map(() => '?').join(',')
    const rows = this.db.query(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
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
