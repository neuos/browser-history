import { HistoryNode, HistoryNodeId, Page } from './HistoryNode';
import { IHistoryRepository } from './IHistoryRepository';
import { IPageRepository } from './IPageRepository';

export interface HistorySearchOptions {
    query?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export interface HistoryEntry {
    id: HistoryNodeId;
    url: string;
    title: string | null;
    timestamp: number;
    parentId: HistoryNodeId | null;
    children?: HistoryEntry[];
}

export class HistoryService {
    private historyRepo: IHistoryRepository;
    private pageRepo: IPageRepository;

    // Track the last node ID for each tab
    private tabNodeMap: Record<number, HistoryNodeId> = {};

    constructor(
        historyRepo: IHistoryRepository,
        pageRepo: IPageRepository,
    ) {
        this.historyRepo = historyRepo;
        this.pageRepo = pageRepo;
    }


    async onTabUpdated(changeInfo: globalThis.Browser.tabs.TabChangeInfo, tab: globalThis.Browser.tabs.Tab) {
        // Only update if the tab has a URL and is not a system/internal page
        if (!tab.url || this.isInternalUrl(tab.url)) {
            console.debug(`Ignoring tab update for internal URL: ${tab.url}`);
            return;
        }
        console.log(`Tab updated: ${tab.id} - ${tab.url}`, changeInfo);

        // Get the latest favicon and title
        const favicon = changeInfo.favIconUrl;

        if (favicon) {
            this.updateFavicon(tab.url, favicon);
        }

        const title = changeInfo.title
        if (title) {
            this.updateTitle(tab.url, title);
        }
    }

    updateTitle(url: string, title: string) {
        this.pageRepo.addOrUpdate(new Page(url, undefined, title))
            .catch(error => console.error('Error updating page title:', error));
    }

    updateFavicon(url: string, favicon: string) {
        this.pageRepo.addOrUpdate(new Page(url, favicon))
            .catch(error => console.error('Error updating page favicon:', error));
    }

    async onNavigationCommitted(details: globalThis.Browser.webNavigation.WebNavigationTransitionCallbackDetails) {
        // Only handle main frame navigations
        if (details.frameId !== 0) return;

        // Handle the navigation event
        this.handleNavigation({
            url: details.url,
            tabId: details.tabId,
            timestamp: Date.now(),
            transitionType: details.transitionType,
            title: undefined
        }).catch(error => console.error('Error handling navigation:', error));
    }


    /**
     * Handle a browser navigation event and record in history
     */
    async handleNavigation(details: {
        url: string;
        tabId: number;
        timestamp: number;
        transitionType?: string;
        title: string | undefined;
    }): Promise<void> {
        const { url, tabId, timestamp, transitionType, title } = details;
        if (this.isInternalUrl(url)) {
            return undefined;
        }
        try {
            if (this.tabNodeMap[tabId]) {
                const currentNode = await this.historyRepo.get(this.tabNodeMap[tabId]);
                if (currentNode && currentNode.url.toString() === url) {
                    console.log(`Skipping duplicate navigation to: ${url}`);
                }
            }

            if (transitionType === 'back_forward' && this.tabNodeMap[tabId]) {
                const currentNode = await this.historyRepo.get(this.tabNodeMap[tabId]);
                if (currentNode && currentNode.navigationSourceID) {
                    this.tabNodeMap[tabId] = currentNode.navigationSourceID;
                    console.log(`Back navigation to: ${currentNode.navigationSourceID} for ${url}`);
                }
            }
            let parentId: HistoryNodeId | null = null;
            if (this.tabNodeMap[tabId] &&
                transitionType &&
                !["typed", "auto_bookmark", "generated", "start_page", "reload", "back_forward"].includes(transitionType)) {
                parentId = this.tabNodeMap[tabId];
            }
            // Create a new history node
            const node = new HistoryNode(tabId, url, parentId ?? undefined);
            await this.historyRepo.add(node);
            await this.updatePageMetadata(url, title, timestamp);
            this.tabNodeMap[tabId] = node.id;
            console.log(`Added navigation node: ${node.id} for ${url} (parent: ${parentId})`);
        } catch (error) {
            console.error('Error processing navigation:', error);
            return undefined;
        }
    }
    
    isInternalUrl(url: string) :boolean{
        const internalProtocols = ['chrome:', 'chrome-extension:', 'about:', 'moz-extension:'];
        return internalProtocols.some(p => url.startsWith(p));
    }

    /**
     * Handle SPA navigation that occurs within a page
     */
    async handleSpaNavigation(details: {
        url: string;
        tabId: number;
        title: string | undefined;
    }): Promise<void> {
        await this.handleNavigation({
            ...details,
            timestamp: Date.now(),
            transitionType: 'link' // Treat SPA navigation as link navigation
        });
    }

    /**
     * Clean up tab tracking when a tab is closed
     */
    onTabClosed(tabId: number): void {
        delete this.tabNodeMap[tabId];
    }

    /**
     * Helper method to update page metadata
     */
    private async updatePageMetadata(url: string, title: string | undefined, timestamp: number): Promise<void> {
        try {
            let page = await this.pageRepo.get(url);
            if (page) {
                // Update existing page
                page.metadata.lastVisited = timestamp;
                page.metadata.visitCount = (page.metadata.visitCount as number || 0) + 1;
                if (title && !page.title) {
                    page.title = title;
                }
            } else {
                // Create new page
                page = new Page(url, undefined, title || undefined, {
                    lastVisited: timestamp,
                    visitCount: 1
                });
            }
            await this.pageRepo.addOrUpdate(page);
        } catch (e) {
            console.error(`Error updating page metadata for ${url}:`, e);
        }
    }

}