export class HistoryNode {
    public id: HistoryNodeId;
    public timestamp: Date = new Date();

    constructor(
        public url: string,
        public title: string | null,
        public parentId: HistoryNodeId | null,
    ) {
        this.id = crypto.randomUUID(); // Each node has a unique ID
    }
}

export interface HistoryNodeId extends guid{};
export interface guid extends String{};