import { FaviconBlob } from '@/lib/HistoryTree/FaviconBlob';
import { IFaviconBlobRepository } from './IFaviconBlobRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class FaviconBlobRepositoryIndexedDB
  extends BaseIndexedDBRepository<FaviconBlob, string>
  implements IFaviconBlobRepository {

  static readonly STORE_NAME = 'faviconBlobs';
  protected readonly STORE_NAME = FaviconBlobRepositoryIndexedDB.STORE_NAME;

  constructor() {
    super();
    this.registerSchema(createFaviconBlobSchema);
  }

  protected prepareForStorage(blob: FaviconBlob): any {
    return { ...blob };
  }

  protected processFromStorage(storedItem: any): FaviconBlob {
    return { ...storedItem };
  }

  protected getEntityKey(blob: FaviconBlob): string {
    return blob.hash;
  }

  async put(blob: FaviconBlob): Promise<void> {
    return this.saveItem(blob);
  }

  async get(hash: string): Promise<FaviconBlob | undefined> {
    return this.getItem(hash);
  }

  async has(hash: string): Promise<boolean> {
    return (await this.getItem(hash)) !== undefined;
  }
}

function createFaviconBlobSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(FaviconBlobRepositoryIndexedDB.STORE_NAME)) {
    db.createObjectStore(FaviconBlobRepositoryIndexedDB.STORE_NAME, { keyPath: 'hash' });
  }
}
