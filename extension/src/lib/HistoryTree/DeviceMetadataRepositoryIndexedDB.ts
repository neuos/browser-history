import { DeviceMetadata } from '@/lib/HistoryTree/DeviceMetadata';
import { IDeviceMetadataRepository } from './IDeviceMetadataRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class DeviceMetadataRepositoryIndexedDB
  extends BaseIndexedDBRepository<DeviceMetadata, string>
  implements IDeviceMetadataRepository {

  static readonly STORE_NAME = 'deviceMetadata';
  protected readonly STORE_NAME = DeviceMetadataRepositoryIndexedDB.STORE_NAME;

  constructor() {
    super();
    this.registerSchema(createDeviceMetadataSchema);
  }

  protected prepareForStorage(metadata: DeviceMetadata): any {
    return { ...metadata };
  }

  protected processFromStorage(storedItem: any): DeviceMetadata {
    return { ...storedItem };
  }

  protected getEntityKey(metadata: DeviceMetadata): string {
    return metadata.deviceId;
  }

  async put(metadata: DeviceMetadata): Promise<void> {
    return this.saveItem(metadata);
  }

  async get(deviceId: string): Promise<DeviceMetadata | undefined> {
    return this.getItem(deviceId);
  }

  async getAll(): Promise<DeviceMetadata[]> {
    return this.getAllItems();
  }
}

function createDeviceMetadataSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(DeviceMetadataRepositoryIndexedDB.STORE_NAME)) {
    db.createObjectStore(DeviceMetadataRepositoryIndexedDB.STORE_NAME, { keyPath: 'deviceId' });
  }
}
