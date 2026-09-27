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
      timestamp: node.timestamp.toISOString(),
    };
  }

  protected processFromStorage(storedItem: any): HistoryNode {
    if (!storedItem.timestamp) {
      throw new Error(`Stored history item ${storedItem.id} for ${storedItem.url} has no timestamp`);
    }

    const timestamp = new Date(storedItem.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error(`Stored history item ${storedItem.id} for ${storedItem.url} has invalid timestamp: ${storedItem.timestamp}`);
    }

    return {
      ...storedItem,
      timestamp,
    };
  }

  protected getEntityKey(node: HistoryNode): HistoryNodeId {
    return node.id;
  }

  async add(node: HistoryNode): Promise<void> {
    return this.saveItem(node);
  }

  async get(id: HistoryNodeId): Promise<HistoryNode | undefined> {
    return this.getItem(id);
  }

  async getAll(): Promise<HistoryNode[]> {
    return this.getAllItems();
  }

  async clear(): Promise<void> {
    return this.clearAllItems();
  }
}

function createHistorySchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(HistoryRepositoryIndexedDB.STORE_NAME)) {
    db.createObjectStore(HistoryRepositoryIndexedDB.STORE_NAME, { keyPath: 'id' });
  }
}
