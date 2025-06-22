import { DatabaseSingleton } from './DatabaseSingleton';

/**
 * Abstract base class for IndexedDB repositories
 * Handles common database operations and connection management
 */
export abstract class BaseIndexedDBRepository<T, K extends IDBValidKey | IDBKeyRange = IDBValidKey> {
  protected readonly DB_NAME = 'browser-history-db';
  protected readonly DB_VERSION = 1;
  protected abstract readonly STORE_NAME: string;
  protected db: IDBDatabase | undefined;

  // must be called in the constructor of subclasses
  protected registerSchema(builder: (db: IDBDatabase) => void): void {
    console.log('Registering schema for store:', this.STORE_NAME);
    const dbInstance = DatabaseSingleton.getInstance();
    dbInstance.registerSchema(builder);
  }

  /**
   * Gets or initializes the IndexedDB database
   */
  protected async getDB(): Promise<IDBDatabase> {
    const dbInstance = DatabaseSingleton.getInstance();
    return dbInstance.getDB();
  }

  /**
   * Abstract method to prepare entity for storage
   * Allows subclasses to transform entities before storing
   */
  protected abstract prepareForStorage(entity: T): any;

  /**
   * Abstract method to process entity after retrieval
   * Allows subclasses to transform stored data back into entities
   */
  protected abstract processFromStorage(storedItem: any): T;

  /**
   * Abstract method to extract the key from an entity
   */
  protected abstract getEntityKey(entity: T): K;

  /**
   * Adds or updates an entity in the store
   */
  protected async saveItem(entity: T): Promise<void> {
    const db = await this.getDB();
    const itemToStore = this.prepareForStorage(entity);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(itemToStore);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  /**
   * Gets an entity by its key
   */
  protected async getItem(key: K): Promise<T | undefined> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.get(key);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        if (!request.result) {
          resolve(undefined);
          return;
        }
        
        resolve(this.processFromStorage(request.result));
      };
    });
  }
  
  /**
   * Gets all entities from the store
   */
  protected async getAllItems(): Promise<T[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.getAll();
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const items = request.result.map(item => this.processFromStorage(item));
        resolve(items);
      };
    });
  }

  /**
   * Gets items by an index value
   */
  protected async getItemsByIndex(indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const items = request.result.map(item => this.processFromStorage(item));
        resolve(items);
      };
    });
  }
}