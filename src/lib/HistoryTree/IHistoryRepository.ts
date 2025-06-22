import { HistoryNode, HistoryNodeId } from "./HistoryNode";

export interface IHistoryRepository {
  add(node: HistoryNode): Promise<void>;
  get(id: HistoryNodeId): Promise<HistoryNode | undefined>;
  getAll(): Promise<HistoryNode[]>;
}