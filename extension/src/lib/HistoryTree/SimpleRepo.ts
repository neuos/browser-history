import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';
import { UuidString } from '../guid'

export class SimpleEntity {
    constructor(public id: UuidString, public name: string) { }
}

export class SimpleRepo extends BaseIndexedDBRepository<SimpleEntity, UuidString> {
    protected readonly STORE_NAME = 'simple-store';

    protected getEntityKey(entity: SimpleEntity): UuidString {
        return entity.id;
    }

    protected schemaBuilder(db: IDBDatabase): void {
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            console.log(`Created object store: ${this.STORE_NAME}`);
        } else {
            console.log(`Object store already exists: ${this.STORE_NAME}`);
        }
    }

    protected prepareForStorage(entity: SimpleEntity): SimpleEntity {
        // No transformation needed for simple storage
        return entity;
    }

    protected processFromStorage(storedItem: SimpleEntity): SimpleEntity {
        // No transformation needed for simple retrieval
        return storedItem;
    }

    async save(entity: SimpleEntity): Promise<void> {
        await this.saveItem(entity);
    }

    async get(id: UuidString): Promise<SimpleEntity | undefined> {
        return this.getItem(id);
    }
}