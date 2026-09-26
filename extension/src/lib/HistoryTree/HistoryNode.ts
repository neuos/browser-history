import { UuidString, UuidBytes } from "../guid";
import { getDeviceId } from "./DeviceID";

export type PageMetadata = {
    [key: string]: string | number | boolean | Date;
};

export class Page {
    public lastUpdate: Date = new Date();
    // Content-derived identity (hex SHA-256) of the favicon's actual bytes, set once the icon has
    // been fetched, hashed, and stored locally/uploaded - this, not `favicon`, is what gets
    // synced and what the popup renders from. `favicon` (the URL it came from) stays for
    // debugging/reference only; a raw URL isn't portable across devices/browsers and is never
    // guaranteed to still resolve to the same bytes later.
    public faviconHash: string | undefined = undefined;
    constructor(
        public url: string,
        public favicon: Favicon | undefined  = undefined,
        public title: string | undefined  = undefined,
        public metadata: PageMetadata = {},
    ) {
    }
}

export class HistoryNode {
    public timestamp: Date = new Date();
    // Raw bytes, not text - this is the actual, hard-learned lesson from a same-device GUID in
    // two different letter cases silently comparing unequal everywhere it was a plain string.
    // See guid.ts and DeviceID.ts.
    public deviceId: UuidBytes = getDeviceId();
    public id: HistoryNodeId; // Unique identifier for the history node

    constructor(
        public tabId: number,
        public url:string,
        public navigationSourceID: HistoryNodeId | null = null, // ID of the node that led to this navigation
    ) {
        this.id = crypto.randomUUID() as UuidString; // Each node has a unique ID
    }
}

export type HistoryNodeId = UuidString;

export type Favicon = string; // URL of the favicon image