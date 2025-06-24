import { HistoryNodeId, PageMetadata } from './HistoryNode';

interface HistoryEntry {
    id: HistoryNodeId;
    url: string;
    title: string | null;
    timestamp: Date;
    parentId: HistoryNodeId | null;
    favicon: string | null;
    metadata?: PageMetadata;
    children?: HistoryEntry[];
}
export type { HistoryEntry };