import { DeviceMetadata } from "@/lib/HistoryTree/DeviceMetadata";

export interface IDeviceMetadataRepository {
    /**
     * Stores or updates a device's metadata, keyed by deviceId.
     */
    put(metadata: DeviceMetadata): Promise<void>;

    /**
     * Retrieves a single device's metadata by ID.
     */
    get(deviceId: string): Promise<DeviceMetadata | undefined>;

    /**
     * Retrieves all known devices' metadata.
     */
    getAll(): Promise<DeviceMetadata[]>;

    /**
     * Removes every stored device's metadata.
     */
    clear(): Promise<void>;
}
