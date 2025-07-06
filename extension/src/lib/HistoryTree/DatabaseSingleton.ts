export class DatabaseSingleton {
    private static instance: DatabaseSingleton;
    private db: IDBDatabase | undefined;
    private readonly DB_NAME = 'browser-history-db';
    private readonly DB_VERSION = 2; // Bumped from 1 to force schema recreation
    private schemaBuilders: Array<(db: IDBDatabase) => void> = [];


    public static getInstance(): DatabaseSingleton {
        if (!DatabaseSingleton.instance) {
            DatabaseSingleton.instance = new DatabaseSingleton();
        }
        return DatabaseSingleton.instance;
    }

    registerSchema(createSchema: (db: IDBDatabase) => void): void {
        this.schemaBuilders.push(createSchema);
    }

    public async getDB(): Promise<IDBDatabase> {
        console.log('DatabaseSingleton: Getting IndexedDB instance for:', this.DB_NAME);
        console.log('DatabaseSingleton: Current db instance:', this.db ? 'exists' : 'null');
        console.log('DatabaseSingleton: Registered schema builders:', this.schemaBuilders.length);

        if (this.db) {
            console.log('DatabaseSingleton: Returning existing IndexedDB instance.');
            return this.db;
        }

        return new Promise((resolve, reject) => {
            console.log('DatabaseSingleton: Opening IndexedDB...');
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('DatabaseSingleton: Error opening IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('DatabaseSingleton: IndexedDB opened successfully:', this.DB_NAME);
                console.log('DatabaseSingleton: Object stores in DB:', Array.from(this.db.objectStoreNames));
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = request.result;
                console.log('DatabaseSingleton: onupgradeneeded event triggered for:', this.DB_NAME);
                console.log('DatabaseSingleton: Old version:', event.oldVersion, 'New version:', event.newVersion);
                console.log('DatabaseSingleton: Existing object stores before upgrade:', Array.from(db.objectStoreNames));
                this.createSchema(db);
                console.log('DatabaseSingleton: Object stores after schema creation:', Array.from(db.objectStoreNames));
            };
        });
    }

    private createSchema(db: IDBDatabase): void {
        console.log('DatabaseSingleton: Creating schema for database:', this.DB_NAME);
        console.log('DatabaseSingleton: Schema builders count:', this.schemaBuilders.length);
        // Call all registered schema builders
        for (let i = 0; i < this.schemaBuilders.length; i++) {
            const builder = this.schemaBuilders[i];
            console.log(`DatabaseSingleton: Applying schema builder ${i + 1}/${this.schemaBuilders.length}:`, builder.name || 'anonymous');
            try {
                builder(db);
                console.log(`DatabaseSingleton: Schema builder ${i + 1} completed successfully`);
            } catch (error) {
                console.error(`DatabaseSingleton: Error in schema builder ${i + 1}:`, error);
                throw error;
            }
        }
        console.log('DatabaseSingleton: All schema builders completed. Final object stores:', Array.from(db.objectStoreNames));
    }
}
