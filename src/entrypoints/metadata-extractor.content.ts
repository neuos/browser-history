// Content script for extracting page metadata, especially Open Graph tags
import { PAGE_METADATA_EXTRACTED } from "@/message";

export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
    console.log('Metadata Extractor Content Script Loaded');

    // Function to extract metadata from page head
    const extractMetadata = (): Record<string, string> => {
      const metadata: Record<string, string> = {};
      
      // Extract Open Graph tags
      const ogTags = document.querySelectorAll('meta[property^="og:"]');
      ogTags.forEach((tag) => {
        const property = tag.getAttribute('property');
        const content = tag.getAttribute('content');
        if (property && content) {
          metadata[property] = content;
        }
      });

      // Extract Twitter Card tags  
      const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
      twitterTags.forEach((tag) => {
        const name = tag.getAttribute('name');
        const content = tag.getAttribute('content');
        if (name && content) {
          metadata[name] = content;
        }
      });

      // Extract other important meta tags
      const metaTags = [
        'description',
        'keywords', 
        'author',
        'theme-color',
        'application-name'
      ];
      
      metaTags.forEach((tagName) => {
        const tag = document.querySelector(`meta[name="${tagName}"]`);
        const content = tag?.getAttribute('content');
        if (content) {
          metadata[`meta:${tagName}`] = content;
        }
      });

      // Extract canonical URL
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        const href = canonicalLink.getAttribute('href');
        if (href) {
          metadata['link:canonical'] = href;
        }
      }

      // Extract page language
      const htmlLang = document.documentElement.lang;
      if (htmlLang) {
        metadata['html:lang'] = htmlLang;
      }

      return metadata;
    };

    // Function to send metadata to background script
    const sendMetadata = () => {
      const url = window.location.href;
      const title = document.title;
      const metadata = extractMetadata();
      
      // Only send if we have meaningful metadata
      if (Object.keys(metadata).length > 0) {
        browser.runtime.sendMessage({
          type: PAGE_METADATA_EXTRACTED,
          payload: {
            url,
            title,
            metadata,
            timestamp: Date.now()
          }
        });
      }
    };

    // Wait for DOM to be fully loaded before extracting metadata
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit more for dynamic meta tags to be added
        setTimeout(sendMetadata, 500);
      });
    } else {
      // Document already loaded
      setTimeout(sendMetadata, 500);
    }

    // Also listen for changes to meta tags (for SPAs that update metadata)
    const observer = new MutationObserver((mutations) => {
      let metaChanged = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'META' || node.nodeName === 'LINK') {
              metaChanged = true;
            }
          });
        } else if (mutation.type === 'attributes' && 
                   (mutation.target.nodeName === 'META' || mutation.target.nodeName === 'LINK')) {
          metaChanged = true;
        }
      });
      
      if (metaChanged) {
        // Debounce metadata extraction
        setTimeout(sendMetadata, 200);
      }
    });

    // Observe changes to head element
    const headElement = document.head;
    if (headElement) {
      observer.observe(headElement, {
        childList: true,
        attributes: true,
        subtree: true
      });
    }

    // Cleanup observer when content script is destroyed
    ctx.onInvalidated(() => {
      observer.disconnect();
    });
  },
});
