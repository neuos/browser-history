import { DatabaseSync } from 'node:sqlite'
import type { Device, SyncEvent, HistoryNode, Page, SyncState } from '../types/index.ts'
import { EnvironmentConfig } from '../config/environment.ts';

// Database row types
type DeviceRow = {
  device_id: string
  device_name: string
  public_key: string
  created_at: number
  last_seen: number
}

type SyncEventRow = {
  id: string
  device_id: string
  timestamp: number
  event_type: string
  entity_type: string
  entity_id: string
  data: string
  checksum: string
}

type HistoryNodeRow = {
  id: string
  device_id: string
  url: string
  tab_id: number
  timestamp: number
  navigation_source_id: string | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}

type PageRow = {
  url: string
  title: string | null
  favicon: string | null
  metadata: string
  last_update: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

type SyncStateRow = {
  device_id: string
  last_sync_timestamp: number
  sync_vector: string
}

export class Database {
  private db: DatabaseSync

  constructor(path?: string) {
    const dbPath = path || EnvironmentConfig.get('DATABASE_PATH')
    
    // Ensure data directory exists
    try {
      Deno.mkdirSync('./data', { recursive: true })
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error
      }
    }
    
    this.db = new DatabaseSync(dbPath)
    console.log(`📁 Database initialized: ${dbPath}`)
  }

  init() {
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
    this.db.prepare(`
      INSERT OR REPLACE INTO devices (device_id, device_name, public_key, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `).run(device.deviceId, device.deviceName, device.publicKey, device.createdAt, device.lastSeen)
  }

  getDevice(deviceId: string): Device | undefined {
    const row = this.db.prepare(`
      SELECT device_id, device_name, public_key, created_at, last_seen
      FROM devices WHERE device_id = ?
    `).get(deviceId) as DeviceRow | undefined
    
    if (!row) return undefined
    
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
    `).all() as DeviceRow[]
    
    return rows.map((row: DeviceRow) => ({
      deviceId: row.device_id,
      deviceName: row.device_name,
      publicKey: row.public_key,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
    }))
  }

  updateDeviceLastSeen(deviceId: string): void {
    this.db.prepare(`
      UPDATE devices SET last_seen = ? WHERE device_id = ?
    `).run(Date.now(), deviceId)
  }

  deleteDevice(deviceId: string): void {
    this.db.prepare('DELETE FROM devices WHERE device_id = ?').run(deviceId)
    this.db.prepare('DELETE FROM sync_state WHERE device_id = ?').run(deviceId)
  }

  // Sync events operations
  addSyncEvent(event: SyncEvent): void {
    this.db.prepare(`
      INSERT INTO sync_events (id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.deviceId,
      event.timestamp,
      event.eventType,
      event.entityType,
      event.entityId,
      JSON.stringify(event.data),
      event.checksum
    )
  }

  getSyncEvents(since: number, deviceId?: string): SyncEvent[] {
    let stmt
    let rows: SyncEventRow[]
    
    if (deviceId) {
      stmt = this.db.prepare(`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ? AND device_id != ?
        ORDER BY timestamp ASC
      `)
      rows = stmt.all(since, deviceId) as SyncEventRow[]
    } else {
      stmt = this.db.prepare(`
        SELECT id, device_id, timestamp, event_type, entity_type, entity_id, data, checksum
        FROM sync_events WHERE timestamp > ?
        ORDER BY timestamp ASC
      `)
      rows = stmt.all(since) as SyncEventRow[]
    }
    
    return rows.map((row: SyncEventRow) => ({
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
    this.db.prepare(`
      INSERT OR REPLACE INTO history_nodes 
      (id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      node.id,
      node.deviceId,
      node.url,
      node.tabId,
      node.timestamp,
      node.navigationSourceId || null,
      node.createdAt,
      node.updatedAt,
      node.deletedAt || null
    )
  }

  getHistoryNodes(deviceId?: string, limit = 100, offset = 0): HistoryNode[] {
    let stmt
    let rows: HistoryNodeRow[]
    
    if (deviceId) {
      stmt = this.db.prepare(`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL AND device_id = ?
        ORDER BY timestamp DESC LIMIT ? OFFSET ?
      `)
      rows = stmt.all(deviceId, limit, offset) as HistoryNodeRow[]
    } else {
      stmt = this.db.prepare(`
        SELECT id, device_id, url, tab_id, timestamp, navigation_source_id, created_at, updated_at, deleted_at
        FROM history_nodes WHERE deleted_at IS NULL
        ORDER BY timestamp DESC LIMIT ? OFFSET ?
      `)
      rows = stmt.all(limit, offset) as HistoryNodeRow[]
    }
    
    return rows.map((row) => ({
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
    this.db.prepare(`
      INSERT OR REPLACE INTO pages (url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      page.url,
      page.title || null,
      page.favicon || null,
      JSON.stringify(page.metadata),
      page.lastUpdate,
      page.createdAt,
      page.updatedAt,
      page.deletedAt || null
    )
  }

  getPage(url: string): Page | undefined {
    const row = this.db.prepare(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url = ? AND deleted_at IS NULL
    `).get(url) as PageRow | undefined
    
    if (!row) return undefined
    
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
    
    const placeholders = urls.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT url, title, favicon, metadata, last_update, created_at, updated_at, deleted_at
      FROM pages WHERE url IN (${placeholders}) AND deleted_at IS NULL
    `)
    const rows = stmt.all(...urls) as PageRow[]
    
    return rows.map((row) => ({
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

  // Sync state operations
  updateSyncState(state: SyncState): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO sync_state (device_id, last_sync_timestamp, sync_vector)
      VALUES (?, ?, ?)
    `).run(state.deviceId, state.lastSyncTimestamp, JSON.stringify(state.syncVector))
  }

  getSyncState(deviceId: string): SyncState | undefined {
    const row = this.db.prepare(`
      SELECT device_id, last_sync_timestamp, sync_vector
      FROM sync_state WHERE device_id = ?
    `).get(deviceId) as SyncStateRow | undefined
    
    if (!row) return undefined
    
    return {
      deviceId: row.device_id as string,
      lastSyncTimestamp: row.last_sync_timestamp as number,
      syncVector: JSON.parse(row.sync_vector as string),
    }
  }

  close() {
    this.db.close()
  }
}
