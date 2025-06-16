import { IHistoryTreeRepository } from './IHistoryTreeRepository';
import { HistoryNode, HistoryNodeId } from './HistoryNode';

function mapFromObject(obj: Record<string, HistoryNode>): Map<string, HistoryNode> {
  return new Map(Object.entries(obj));
}

function objectFromMap(map: Map<HistoryNodeId, HistoryNode>): Record<string, HistoryNode> {
  const output: Record<string, HistoryNode> = {};
  for (const [id, node] of map.entries()) {
    output[id.toString()] = node;
  }
  return output;
}

export class HistoryTreeRepositoryBrowserStorage implements IHistoryTreeRepository {
  private readonly STORAGE_KEY = 'historyTree';

  private async loadMap(): Promise<Map<HistoryNodeId, HistoryNode>> {
    const data = await browser.storage.local.get(this.STORAGE_KEY);
    const obj = data[this.STORAGE_KEY] ?? {};
    return mapFromObject(obj);
  }

  private async saveMap(map: Map<HistoryNodeId, HistoryNode>): Promise<void> {
    await browser.storage.local.set({ [this.STORAGE_KEY]: objectFromMap(map) });
  }

  async addOrUpdateNode(node: HistoryNode): Promise<void> {
    const map = await this.loadMap();

    if (map.has(node.id)) {
      const existing = map.get(node.id)!;
      existing.url = node.url;
      existing.parentId = node.parentId;
      existing.timestamp = node.timestamp;
      existing.title = node.title;
    } else {
      map.set(node.id, node);
    }

    await this.saveMap(map);
  }

  async getNode(id: string): Promise<HistoryNode | undefined> {
    const map = await this.loadMap();
    return map.get(id);
  }
  
  async getAllNodes(): Promise<HistoryNode[]> {
    const map = await this.loadMap();
    return [...map.values()];
  }
}