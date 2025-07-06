import { HistoryNode, HistoryNodeId } from './HistoryNode';
import { IHistoryRepository } from './IHistoryRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class HistoryRepositoryIndexedDB
  extends BaseIndexedDBRepository<HistoryNode, HistoryNodeId>
  implements IHistoryRepository {
  static readonly STORE_NAME = 'history';
  protected readonly STORE_NAME = HistoryRepositoryIndexedDB.STORE_NAME;
  
  constructor() {
    super();
    console.log('HistoryRepositoryIndexedDB: Constructor called, registering schema...');
    this.registerSchema(createHistorySchema);
    console.log('HistoryRepositoryIndexedDB: Schema registered');
  }

  protected prepareForStorage(node: HistoryNode): any {
    return {
      ...node,
      timestamp: node.timestamp.toISOString(), // Convert Date to ISO string for storage
    };
  }

  protected processFromStorage(storedItem: any): HistoryNode {
    // Validate stored timestamp
    if (!storedItem.timestamp) {
      console.error('HistoryRepositoryIndexedDB: Stored item missing timestamp:', storedItem);
      throw new Error(`Stored history item ${storedItem.id} for ${storedItem.url} has no timestamp`);
    }
    
    const timestamp = new Date(storedItem.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.error('HistoryRepositoryIndexedDB: Stored item has invalid timestamp:', storedItem.timestamp, storedItem);
      throw new Error(`Stored history item ${storedItem.id} for ${storedItem.url} has invalid timestamp: ${storedItem.timestamp}`);
    }
    
    return {
      ...storedItem,
      timestamp, // Use validated timestamp
    };
  }

  protected getEntityKey(node: HistoryNode): HistoryNodeId {
    return node.id;
  }

  // Interface implementations
  async add(node: HistoryNode): Promise<void> {
    return this.saveItem(node);
  }

  async get(id: HistoryNodeId): Promise<HistoryNode | undefined> {
    return this.getItem(id);
  }

  async getAll(): Promise<HistoryNode[]> {
    return this.getAllItems();
  }

  // Additional useful methods for tree navigation
  async getChildNodes(parentId: HistoryNodeId): Promise<HistoryNode[]> {
    return this.getItemsByIndex('navigationSourceID', parentId);
  }
}

function createHistorySchema(db: IDBDatabase): void {
  console.log('createHistorySchema: Starting schema creation for:', HistoryRepositoryIndexedDB.STORE_NAME);
  console.log('createHistorySchema: Existing stores:', Array.from(db.objectStoreNames));
  
  if (!db.objectStoreNames.contains(HistoryRepositoryIndexedDB.STORE_NAME)) {
    console.log('createHistorySchema: Creating history object store...');
    const historyStore = db.createObjectStore(HistoryRepositoryIndexedDB.STORE_NAME, { keyPath: 'id' });
    console.log('createHistorySchema: History store created, adding indexes...');
    
    historyStore.createIndex('navigationSourceID', 'navigationSourceID', { unique: false });
    console.log('createHistorySchema: navigationSourceID index created');
    
    historyStore.createIndex('url', 'url', { unique: false });
    console.log('createHistorySchema: url index created');
    
    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
    console.log('createHistorySchema: timestamp index created');
    
    console.log('createHistorySchema: History schema creation completed');
  } else {
    console.log('createHistorySchema: History store already exists, skipping');
  }
}