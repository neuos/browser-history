// entrypoints/example.content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
   console.log('SPA Navigation Content Script Loaded');
 
    // Helper function to notify background script
    const notifyUrlChange = () => {
      const url = window.location.href;
      browser.runtime.sendMessage({ type: 'spa-url-change', url });
    };

    // Override pushState
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      notifyUrlChange();
    };

    // Override replaceState
    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      notifyUrlChange();
    };

    // Listen for popstate
    window.addEventListener('popstate', () => {
      notifyUrlChange();
    });
  },
});

