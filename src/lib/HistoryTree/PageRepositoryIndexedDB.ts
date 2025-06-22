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
    return {
      ...page,
    };
  }

  protected processFromStorage(storedItem: any): Page {
    const page: Page = {
      ...storedItem,
    };

    return page;
  }

  protected getEntityKey(page: Page): string {
    return page.url;
  }

  // Interface implementations
  async addOrUpdate(page: Page): Promise<void> {
    return this.saveItem(page);
  }

  async get(url: string): Promise<Page | undefined> {
    return this.getItem(url);
  }

  // Additional helper method
  async getAll(): Promise<Page[]> {
    return this.getAllItems();
  }
}

function createPageSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(PageRepositoryIndexedDB.STORE_NAME)) {
    const pageStore = db.createObjectStore(PageRepositoryIndexedDB.STORE_NAME, { keyPath: 'url' });
    pageStore.createIndex('title', 'title', { unique: false });
    pageStore.createIndex('lastVisited', 'lastVisited', { unique: false });
    pageStore.createIndex('visitCount', 'visitCount', { unique: false });
  }
}
