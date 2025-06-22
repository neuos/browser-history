export class DatabaseSingleton {
    private static instance: DatabaseSingleton;
    private db: IDBDatabase | undefined;
    private readonly DB_NAME = 'browser-history-db';
    private readonly DB_VERSION = 1;
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
        console.debug('Getting IndexedDB instance for:', this.DB_NAME);

        if (this.db) {
            console.debug('Returning existing IndexedDB instance.');
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Error opening IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.debug('IndexedDB opened successfully:', this.DB_NAME);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = request.result;
                console.debug('onupgradeneeded for:', this.DB_NAME);
                this.createSchema(db);
            };
        });
    }

    private createSchema(db: IDBDatabase): void {
        console.debug('Creating schema for database:', this.DB_NAME);
        console.debug('Schema builders count:', this.schemaBuilders.length);
        // Call all registered schema builders
        for (const builder of this.schemaBuilders) {
            console.debug('Applying schema builder:', builder.name);
            builder(db);
        }
    }
}
