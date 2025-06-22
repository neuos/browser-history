import { HistoryNodeId } from './HistoryNode';

interface HistoryEntry {
    id: HistoryNodeId;
    url: string;
    title: string | null;
    timestamp: Date;
    parentId: HistoryNodeId | null;
    favicon: string | null;
    children?: HistoryEntry[];
}
export type { HistoryEntry };