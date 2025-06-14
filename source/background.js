// eslint-disable-next-line import/no-unassigned-import
import './options-storage.js';

console.log('Background script loaded at ', new Date().toLocaleTimeString());

// Use the browser namespace for cross-browser compatibility
const browserApi = typeof browser !== 'undefined' ? browser : chrome;

// In-memory tree structure (replace with persistent storage as needed)
const historyTree = {};

browserApi.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    const { tabId, url, transitionType, referrerUrl } = details;

    // Find parent node (by referrerUrl if available)
    let parentUrl = referrerUrl || null;

    // Store the navigation as a node in the tree
    historyTree[url] = {
      parent: parentUrl,
      children: []
    };

    // Link child to parent
    if (parentUrl && historyTree[parentUrl]) {
      historyTree[parentUrl].children.push(url);
    }

    console.log('Tree:', historyTree);
  }
  else {
	console.log('Ignoring frame navigation:', details);
  }
});

