import { DatabaseSingleton } from './DatabaseSingleton';

export abstract class BaseIndexedDBRepository<T, K extends IDBValidKey | IDBKeyRange = IDBValidKey> {
  protected abstract readonly STORE_NAME: string;
  protected db: IDBDatabase | undefined;

  // must be called in the constructor of subclasses
  protected registerSchema(builder: (db: IDBDatabase) => void): void {
    DatabaseSingleton.getInstance().registerSchema(builder);
  }

  protected async getDB(): Promise<IDBDatabase> {
    return DatabaseSingleton.getInstance().getDB();
  }

  protected abstract prepareForStorage(entity: T): any;
  protected abstract processFromStorage(storedItem: any): T;
  protected abstract getEntityKey(entity: T): K;

  protected async saveItem(entity: T): Promise<void> {
    const db = await this.getDB();
    let itemToStore = this.prepareForStorage(entity);

    const existingKey = this.getEntityKey(entity);
    const existingItem = await this.getItem(existingKey);
    if (existingItem) {
      itemToStore = this.update(existingItem, itemToStore);
    }

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

  /** Merges newItem onto existingItem, keeping existingItem's value for any field newItem leaves undefined. */
  update(existingItem: T, newItem: T): T {
    const updatedItem = { ...existingItem };
    for (const key in newItem) {
      if (newItem[key] !== undefined) {
        updatedItem[key] = newItem[key];
      }
    }
    return updatedItem;
  }

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

  protected async clearAllItems(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const request = store.clear();

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }
}
