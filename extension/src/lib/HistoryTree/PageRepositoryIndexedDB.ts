import { Page } from '@/lib/HistoryTree/HistoryNode';
import { IPageRepository } from './IPageRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class PageRepositoryIndexedDB
  extends BaseIndexedDBRepository<Page, string>
  implements IPageRepository {

  static readonly STORE_NAME = 'pages';
  protected readonly STORE_NAME = PageRepositoryIndexedDB.STORE_NAME;

  constructor() {
    super();
    this.registerSchema(createPageSchema);
  }

  protected prepareForStorage(page: Page): any {
    return { ...page };
  }

  protected processFromStorage(storedItem: any): Page {
    return { ...storedItem };
  }

  protected getEntityKey(page: Page): string {
    return page.url;
  }

  async addOrUpdate(page: Page): Promise<void> {
    return this.saveItem(page);
  }

  async get(url: string): Promise<Page | undefined> {
    return this.getItem(url);
  }

  async getAll(): Promise<Page[]> {
    return this.getAllItems();
  }

  async clear(): Promise<void> {
    return this.clearAllItems();
  }
}

function createPageSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(PageRepositoryIndexedDB.STORE_NAME)) {
    db.createObjectStore(PageRepositoryIndexedDB.STORE_NAME, { keyPath: 'url' });
  }
}
