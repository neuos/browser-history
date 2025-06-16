import { HistoryNode, HistoryNodeId } from "@/lib/HistoryTree/HistoryNode";
import { HistoryTreeRepositoryBrowserStorage } from "@/lib/HistoryTree/HistoryTreeRepositoryBrowserStorage";
import { IHistoryTreeRepository } from "@/lib/HistoryTree/IHistoryTreeRepository";

export default defineBackground(() => {
  console.log('Navigation tree background started');

  const repo: IHistoryTreeRepository = new HistoryTreeRepositoryBrowserStorage();
  
  // Track the last node ID for each tab
  const tabNodeMap: Record<number, HistoryNodeId> = {};
  
  // Handle standard navigation events
  browser.webNavigation.onCommitted.addListener(async (details) => {
    // convert to json string and back to object for logging
    console.log('Navigation event:', JSON.parse(JSON.stringify(details, null, 2))); 

    // Only handle main frame navigations
    if (details.frameId !== 0) return;
    
    const { url, tabId, timeStamp, transitionType } = details;
    
    // Skip unwanted URLs (like browser internal pages)
    if (url.startsWith('chrome:') || url.startsWith('chrome-extension:') || 
        url.startsWith('about:') || url.startsWith('moz-extension:')) {
      return;
    }
    
    try {
     // Check if this is a duplicate of the current URL
     if (tabNodeMap[tabId]) {
       const currentNode = await repo.getNode(tabNodeMap[tabId]);
       if (currentNode && currentNode.url === url) {
         console.log(`Skipping duplicate navigation to: ${url}`);
         return;
       }
     }

      // Handle back/forward navigation
      if (transitionType === 'reload' && tabNodeMap[tabId]) {
        // Find the current node
        const currentNode = await repo.getNode(tabNodeMap[tabId]);
       
        if (currentNode && currentNode.parentId) {
          // If navigating back, set the parent as the current node
          tabNodeMap[tabId] = currentNode.parentId;
          console.log(`Back navigation to: ${currentNode.parentId} for ${url}`);
          return;
        }
      }

      // Get tab info for the title
      const tab = await browser.tabs.get(tabId);
      
      // Determine parent ID from the tab's history
      let parentId = null;
      if (tabNodeMap[tabId] && 
          transitionType && 
          !["typed", "auto_bookmark", "generated", "start_page", "reload", "back_forward"].includes(transitionType)) {
        // If we have a previous node for this tab and it's not a new navigation,
        // use that as the parent
        parentId = tabNodeMap[tabId];
      }
      
      // Create a new history node
      const node = new HistoryNode(url, tab.title??null, parentId);
      await repo.addOrUpdateNode(node);
      
      // Store this as the most recent node for this tab
      tabNodeMap[tabId] = node.id;
      
      console.log(`Added navigation node: ${node.id} for ${url} (parent: ${parentId})`);
    } catch (error) {
      console.error('Error processing navigation:', error);
    }
  });

  // Handle SPA navigation events from content script
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'spa-url-change' && sender.tab?.id) {
      const { url } = message;
      const tabId = sender.tab.id;
      
      // Skip unwanted URLs
      if (url.startsWith('chrome:') || url.startsWith('chrome-extension:') || 
          url.startsWith('about:') || url.startsWith('moz-extension:')) {
        return;
      }
      
      try {
        // Check if this is a duplicate of the current URL
        if (tabNodeMap[tabId]) {
          const currentNode = await repo.getNode(tabNodeMap[tabId]);
          if (currentNode && currentNode.url === url) {
            console.log(`Skipping duplicate SPA navigation to: ${url}`);
            return;
          }
        }

        // Use the current tab node as parent for SPA navigations
        const parentId = tabNodeMap[tabId] || null;
        
        // Create a new history node
        const node = new HistoryNode(url,sender.tab.title || null, parentId);
        await repo.addOrUpdateNode(node);
        
        // Update the tab's current node
        tabNodeMap[tabId] = node.id;
        
        console.log(`Added SPA navigation node: ${node.id} for ${url} (parent: ${parentId})`);
      } catch (error) {
        console.error('Error processing SPA navigation:', error);
      }
    }
  });
  
  // Clean up when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    delete tabNodeMap[tabId];
  });
});
