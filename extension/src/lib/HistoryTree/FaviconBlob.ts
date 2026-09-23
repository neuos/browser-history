/**
 * A favicon image stored by content hash (hex-encoded SHA-256), shared across every Page that
 * references it. Favicons are per-domain, not per-page - this is the local half of the same
 * dedup the server does: many pages on one site never store the icon more than once here either.
 */
export interface FaviconBlob {
    hash: string;
    contentType: string;
    data: ArrayBuffer;
    sizeBytes: number;
}
