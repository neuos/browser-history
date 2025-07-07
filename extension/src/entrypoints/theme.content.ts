// Universal content script for theme detection
// This will run on ALL web pages to detect system theme

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    // Throttle theme detection to avoid spam
    let lastDetection = 0;
    const DETECTION_THROTTLE = 1000; // 1 second
    
    const detectAndSendTheme = async () => {
      const now = Date.now();
      if (now - lastDetection < DETECTION_THROTTLE) return;
      lastDetection = now;
      
      try {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Get stored theme to avoid unnecessary updates
        const stored = await browser.storage.local.get(['currentTheme']);
        const storedTheme = stored.currentTheme;
        
        // Only send if theme has changed
        if (storedTheme !== (isDark ? 'dark' : 'light')) {
          console.log('Content script: Theme changed to:', isDark ? 'dark' : 'light');
          
          // Store the new theme
          await browser.storage.local.set({ currentTheme: isDark ? 'dark' : 'light' });
          
          // Send to background
          browser.runtime.sendMessage({
            type: 'THEME_DETECTED',
            payload: { isDark }
          }).catch(() => {
            // Extension context might be invalidated, ignore error
          });
        }
      } catch (error) {
        console.warn('Content script: Failed to detect theme:', error);
      }
    };
    
    // Detect theme immediately if document is ready
    if (document.readyState !== 'loading') {
      detectAndSendTheme();
    } else {
      document.addEventListener('DOMContentLoaded', detectAndSendTheme);
    }
    
    // Listen for theme changes
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', detectAndSendTheme);
    } catch (error) {
      console.warn('Content script: Failed to set up theme change listener:', error);
    }
  }
});
