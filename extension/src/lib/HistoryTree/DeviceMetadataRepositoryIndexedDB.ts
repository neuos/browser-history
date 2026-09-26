import { DeviceMetadata } from '@/lib/HistoryTree/DeviceMetadata';
import { IDeviceMetadataRepository } from './IDeviceMetadataRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';
import { normalizeGuid } from '@/lib/guid';

export class DeviceMetadataRepositoryIndexedDB
  extends BaseIndexedDBRepository<DeviceMetadata, string>
  implements IDeviceMetadataRepository {

  static readonly STORE_NAME = 'deviceMetadata';
  protected readonly STORE_NAME = DeviceMetadataRepositoryIndexedDB.STORE_NAME;

  constructor() {
    super();
    this.registerSchema(createDeviceMetadataSchema);
  }

  // Normalized here (not left to callers) so the store's own key is always canonical - any two
  // textual spellings of the same GUID (e.g. differing only in letter case) land on the same
  // IndexedDB key instead of silently becoming two different entries.
  protected prepareForStorage(metadata: DeviceMetadata): any {
    return { ...metadata, deviceId: normalizeGuid(metadata.deviceId) };
  }

  protected processFromStorage(storedItem: any): DeviceMetadata {
    return { ...storedItem };
  }

  protected getEntityKey(metadata: DeviceMetadata): string {
    return normalizeGuid(metadata.deviceId);
  }

  async put(metadata: DeviceMetadata): Promise<void> {
    return this.saveItem(metadata);
  }

  async get(deviceId: string): Promise<DeviceMetadata | undefined> {
    return this.getItem(normalizeGuid(deviceId));
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
