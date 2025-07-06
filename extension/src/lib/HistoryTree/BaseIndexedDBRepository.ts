import { DatabaseSingleton } from './DatabaseSingleton';

/**
 * Abstract base class for IndexedDB repositories
 * Handles common database operations and connection management
 */
export abstract class BaseIndexedDBRepository<T, K extends IDBValidKey | IDBKeyRange = IDBValidKey> {
  protected readonly DB_NAME = 'browser-history-db';
  protected readonly DB_VERSION = 2; // Bumped from 1 to force schema recreation
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
    let itemToStore = this.prepareForStorage(entity);

    const existingKey = this.getEntityKey(entity);
    const existingItem = await this.getItem(existingKey);
    if (existingItem) {
      itemToStore = this.update(existingItem, itemToStore);
    }
    console.log('Saving item to store:', this.STORE_NAME, itemToStore);

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
   * Updates an existing item with new properties
   * Only properties that are not undefined in newItem will be updated
   * Existing properties will remain unchanged if not specified in newItem
   *
   * @param existingItem The item to update
   * @param newItem The new item with properties to update
   * @returns The updated item
   */
  update(existingItem: T, newItem: T): T {
    const updatedItem = { ...existingItem };
    for (const key in newItem) {
      if (newItem[key] !== undefined) {
        updatedItem[key] = newItem[key];
      }
    }
    return updatedItem;
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