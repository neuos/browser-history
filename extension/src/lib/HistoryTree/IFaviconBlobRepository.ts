import { FaviconBlob } from "@/lib/HistoryTree/FaviconBlob";

export interface IFaviconBlobRepository {
    /**
     * Stores a favicon blob, keyed by its content hash. A put with the same hash is a safe
     * no-op overwrite (the content is identical by definition), never a real update.
     */
    put(blob: FaviconBlob): Promise<void>;

    /**
     * Retrieves a favicon blob by its content hash.
     */
    get(hash: string): Promise<FaviconBlob | undefined>;

    /**
     * Checks whether a favicon blob is already stored locally, without reading its bytes.
     */
    has(hash: string): Promise<boolean>;
}
