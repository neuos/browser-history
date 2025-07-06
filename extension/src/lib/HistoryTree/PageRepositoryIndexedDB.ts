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
    console.log('PageRepositoryIndexedDB: Constructor called, registering schema...');
    this.registerSchema(createPageSchema);
    console.log('PageRepositoryIndexedDB: Schema registered');
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
  console.log('createPageSchema: Starting schema creation for:', PageRepositoryIndexedDB.STORE_NAME);
  console.log('createPageSchema: Existing stores:', Array.from(db.objectStoreNames));
  
  if (!db.objectStoreNames.contains(PageRepositoryIndexedDB.STORE_NAME)) {
    console.log('createPageSchema: Creating pages object store...');
    const pageStore = db.createObjectStore(PageRepositoryIndexedDB.STORE_NAME, { keyPath: 'url' });
    console.log('createPageSchema: Pages store created, adding indexes...');
    
    pageStore.createIndex('title', 'title', { unique: false });
    console.log('createPageSchema: title index created');
    
    pageStore.createIndex('lastVisited', 'lastVisited', { unique: false });
    console.log('createPageSchema: lastVisited index created');
    
    pageStore.createIndex('visitCount', 'visitCount', { unique: false });
    console.log('createPageSchema: visitCount index created');
    
    console.log('createPageSchema: Pages schema creation completed');
  } else {
    console.log('createPageSchema: Pages store already exists, skipping');
  }
}
