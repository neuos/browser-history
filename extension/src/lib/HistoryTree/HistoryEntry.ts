import { HistoryNodeId, PageMetadata } from './HistoryNode';

interface HistoryEntry {
    id: HistoryNodeId;
    url: string;
    title: string | null;
    timestamp: Date;
    parentId: HistoryNodeId | null;
    favicon: string | null;
    deviceId: string;
    metadata?: PageMetadata;
    children?: HistoryEntry[];
}
export type { HistoryEntry };