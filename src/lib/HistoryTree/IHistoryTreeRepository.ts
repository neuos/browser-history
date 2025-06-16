import { HistoryNode, HistoryNodeId } from "./HistoryNode";

export interface IHistoryTreeRepository {
  addOrUpdateNode(node: HistoryNode): Promise<void>;
  getNode(id: HistoryNodeId): Promise<HistoryNode | undefined>;
  getAllNodes(): Promise<HistoryNode[]>;
}