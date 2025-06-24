import { guid } from "../guid";
import { getDeviceId } from "./DeviceID";

export type PageMetadata = {
    [key: string]: string | number | boolean | Date;
};

export class Page {
    public lastUpdate: Date = new Date();
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
    public deviceId: guid = getDeviceId(); // Device ID for multi-device support
    public id: guid; // Unique identifier for the history node

    constructor(
        public tabId: number,
        public url:string,
        public navigationSourceID: HistoryNodeId | null = null, // ID of the node that led to this navigation
    ) {
        this.id = crypto.randomUUID(); // Each node has a unique ID
    }
}

export type HistoryNodeId = guid;

export type Favicon = string; // URL of the favicon image