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
    this.registerSchema(createHistorySchema);
  }

  protected prepareForStorage(node: HistoryNode): any {
    return {
      ...node,
      timestamp: node.timestamp.toISOString(), // Convert Date to ISO string for storage
    };
  }

  protected processFromStorage(storedItem: any): HistoryNode {
    return {
      ...storedItem,
      timestamp: new Date(storedItem.timestamp), // Convert ISO string back to Date
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
  if (!db.objectStoreNames.contains(HistoryRepositoryIndexedDB.STORE_NAME)) {
    const historyStore = db.createObjectStore(HistoryRepositoryIndexedDB.STORE_NAME, { keyPath: 'id' });
    historyStore.createIndex('navigationSourceID', 'navigationSourceID', { unique: false });
    historyStore.createIndex('url', 'url', { unique: false });
    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
  }
}