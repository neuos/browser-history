import { DeviceMetadata } from '@/lib/HistoryTree/DeviceMetadata';
import { IDeviceMetadataRepository } from './IDeviceMetadataRepository';
import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';
import { UuidBytes, parseGuid, formatGuid } from '@/lib/guid';

// DeviceMetadata itself (the public type/interface) stays deviceId: string - it's a wire-shaped
// DTO embedded directly into outgoing sync events (JSON has no binary type), so it must remain
// text at that boundary. Only this repository's actual IndexedDB key/stored field are raw bytes,
// converted at the edges below - the real 128-bit value, not a text spelling of it, is what's
// keyed on, so two differently-cased strings for the same device can never end up as two entries.
export class DeviceMetadataRepositoryIndexedDB
  extends BaseIndexedDBRepository<DeviceMetadata, UuidBytes>
  implements IDeviceMetadataRepository {

  static readonly STORE_NAME = 'deviceMetadata';
  protected readonly STORE_NAME = DeviceMetadataRepositoryIndexedDB.STORE_NAME;

  constructor() {
    super();
    this.registerSchema(createDeviceMetadataSchema);
  }

  protected prepareForStorage(metadata: DeviceMetadata): any {
    return { ...metadata, deviceId: parseGuid(metadata.deviceId) };
  }

  protected processFromStorage(storedItem: any): DeviceMetadata {
    return { ...storedItem, deviceId: formatGuid(storedItem.deviceId) };
  }

  async clear(): Promise<void> {
    return this.clearAllItems();
  }

  protected getEntityKey(metadata: DeviceMetadata): UuidBytes {
    return parseGuid(metadata.deviceId);
  }

  async put(metadata: DeviceMetadata): Promise<void> {
    return this.saveItem(metadata);
  }

  async get(deviceId: string): Promise<DeviceMetadata | undefined> {
    return this.getItem(parseGuid(deviceId));
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
