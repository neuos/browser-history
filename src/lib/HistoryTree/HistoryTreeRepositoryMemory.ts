
import { HistoryNode, HistoryNodeId } from './HistoryNode';
import { IHistoryTreeRepository } from './IHistoryTreeRepository';

export class HistoryTreeRepositoryMemory implements IHistoryTreeRepository {
    
  private historyMap = new Map<HistoryNodeId, HistoryNode>();

  async addOrUpdateNode(node: HistoryNode): Promise<void> {
    if (this.historyMap.has(node.id)) {
      const existing = this.historyMap.get(node.id)!;
      existing.url = node.url;
      existing.parentId = node.parentId;
      existing.timestamp = node.timestamp;
      existing.title = node.title;
    } else {
      this.historyMap.set(node.id, node);
    }
  }

  async getNode(id: string): Promise<HistoryNode | undefined> {
    return this.historyMap.get(id);
  }

  async getAllNodes(): Promise<HistoryNode[]> {
    return Array.from(this.historyMap.values());
  }

}