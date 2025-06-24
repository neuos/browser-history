var metadataExtractor = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  function defineContentScript(definition2) {
    return definition2;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  const PAGE_METADATA_EXTRACTED = "PAGE_METADATA_EXTRACTED";
  metadataExtractor;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    main(ctx) {
      console.log("Metadata Extractor Content Script Loaded");
      const extractMetadata = () => {
        const metadata = {};
        const ogTags = document.querySelectorAll('meta[property^="og:"]');
        ogTags.forEach((tag) => {
          const property = tag.getAttribute("property");
          const content = tag.getAttribute("content");
          if (property && content) {
            metadata[property] = content;
          }
        });
        const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
        twitterTags.forEach((tag) => {
          const name = tag.getAttribute("name");
          const content = tag.getAttribute("content");
          if (name && content) {
            metadata[name] = content;
          }
        });
        const metaTags = [
          "description",
          "keywords",
          "author",
          "theme-color",
          "application-name"
        ];
        metaTags.forEach((tagName) => {
          const tag = document.querySelector(`meta[name="${tagName}"]`);
          const content = tag == null ? void 0 : tag.getAttribute("content");
          if (content) {
            metadata[`meta:${tagName}`] = content;
          }
        });
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
          const href = canonicalLink.getAttribute("href");
          if (href) {
            metadata["link:canonical"] = href;
          }
        }
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
          metadata["html:lang"] = htmlLang;
        }
        return metadata;
      };
      const sendMetadata = () => {
        const url = window.location.href;
        const title = document.title;
        const metadata = extractMetadata();
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
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(sendMetadata, 500);
        });
      } else {
        setTimeout(sendMetadata, 500);
      }
      const observer = new MutationObserver((mutations) => {
        let metaChanged = false;
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === "META" || node.nodeName === "LINK") {
                metaChanged = true;
              }
            });
          } else if (mutation.type === "attributes" && (mutation.target.nodeName === "META" || mutation.target.nodeName === "LINK")) {
            metaChanged = true;
          }
        });
        if (metaChanged) {
          setTimeout(sendMetadata, 200);
        }
      });
      const headElement = document.head;
      if (headElement) {
        observer.observe(headElement, {
          childList: true,
          attributes: true,
          subtree: true
        });
      }
      ctx.onInvalidated(() => {
        observer.disconnect();
      });
    }
  });
  metadataExtractor;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"metadata-extractor"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("metadata-extractor", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"metadata-extractor"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
metadataExtractor;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEtZXh0cmFjdG9yLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9zcmMvbWVzc2FnZS50cyIsIi4uLy4uLy4uL3NyYy9lbnRyeXBvaW50cy9tZXRhZGF0YS1leHRyYWN0b3IuY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2NvbnRlbnQtc2NyaXB0LWNvbnRleHQubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJleHBvcnQgY29uc3QgU1BBX1VSTF9DSEFOR0UgPSAnc3BhLXVybC1jaGFuZ2UnO1xuZXhwb3J0IGNvbnN0IFBBR0VfTUVUQURBVEFfRVhUUkFDVEVEID0gJ1BBR0VfTUVUQURBVEFfRVhUUkFDVEVEJzsiLCIvLyBDb250ZW50IHNjcmlwdCBmb3IgZXh0cmFjdGluZyBwYWdlIG1ldGFkYXRhLCBlc3BlY2lhbGx5IE9wZW4gR3JhcGggdGFnc1xuaW1wb3J0IHsgUEFHRV9NRVRBREFUQV9FWFRSQUNURUQgfSBmcm9tIFwiQC9tZXNzYWdlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xuICBtYXRjaGVzOiBbJzxhbGxfdXJscz4nXSxcbiAgbWFpbihjdHgpIHtcbiAgICBjb25zb2xlLmxvZygnTWV0YWRhdGEgRXh0cmFjdG9yIENvbnRlbnQgU2NyaXB0IExvYWRlZCcpO1xuXG4gICAgLy8gRnVuY3Rpb24gdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIHBhZ2UgaGVhZFxuICAgIGNvbnN0IGV4dHJhY3RNZXRhZGF0YSA9ICgpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICAgIGNvbnN0IG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgICBcbiAgICAgIC8vIEV4dHJhY3QgT3BlbiBHcmFwaCB0YWdzXG4gICAgICBjb25zdCBvZ1RhZ3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdtZXRhW3Byb3BlcnR5Xj1cIm9nOlwiXScpO1xuICAgICAgb2dUYWdzLmZvckVhY2goKHRhZykgPT4ge1xuICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3Byb3BlcnR5Jyk7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0YWcuZ2V0QXR0cmlidXRlKCdjb250ZW50Jyk7XG4gICAgICAgIGlmIChwcm9wZXJ0eSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgbWV0YWRhdGFbcHJvcGVydHldID0gY29udGVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEV4dHJhY3QgVHdpdHRlciBDYXJkIHRhZ3MgIFxuICAgICAgY29uc3QgdHdpdHRlclRhZ3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdtZXRhW25hbWVePVwidHdpdHRlcjpcIl0nKTtcbiAgICAgIHR3aXR0ZXJUYWdzLmZvckVhY2goKHRhZykgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gdGFnLmdldEF0dHJpYnV0ZSgnY29udGVudCcpO1xuICAgICAgICBpZiAobmFtZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSBjb250ZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gRXh0cmFjdCBvdGhlciBpbXBvcnRhbnQgbWV0YSB0YWdzXG4gICAgICBjb25zdCBtZXRhVGFncyA9IFtcbiAgICAgICAgJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgJ2tleXdvcmRzJywgXG4gICAgICAgICdhdXRob3InLFxuICAgICAgICAndGhlbWUtY29sb3InLFxuICAgICAgICAnYXBwbGljYXRpb24tbmFtZSdcbiAgICAgIF07XG4gICAgICBcbiAgICAgIG1ldGFUYWdzLmZvckVhY2goKHRhZ05hbWUpID0+IHtcbiAgICAgICAgY29uc3QgdGFnID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgbWV0YVtuYW1lPVwiJHt0YWdOYW1lfVwiXWApO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gdGFnPy5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnQnKTtcbiAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICBtZXRhZGF0YVtgbWV0YToke3RhZ05hbWV9YF0gPSBjb250ZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gRXh0cmFjdCBjYW5vbmljYWwgVVJMXG4gICAgICBjb25zdCBjYW5vbmljYWxMaW5rID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbGlua1tyZWw9XCJjYW5vbmljYWxcIl0nKTtcbiAgICAgIGlmIChjYW5vbmljYWxMaW5rKSB7XG4gICAgICAgIGNvbnN0IGhyZWYgPSBjYW5vbmljYWxMaW5rLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgIG1ldGFkYXRhWydsaW5rOmNhbm9uaWNhbCddID0gaHJlZjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IHBhZ2UgbGFuZ3VhZ2VcbiAgICAgIGNvbnN0IGh0bWxMYW5nID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lmxhbmc7XG4gICAgICBpZiAoaHRtbExhbmcpIHtcbiAgICAgICAgbWV0YWRhdGFbJ2h0bWw6bGFuZyddID0gaHRtbExhbmc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtZXRhZGF0YTtcbiAgICB9O1xuXG4gICAgLy8gRnVuY3Rpb24gdG8gc2VuZCBtZXRhZGF0YSB0byBiYWNrZ3JvdW5kIHNjcmlwdFxuICAgIGNvbnN0IHNlbmRNZXRhZGF0YSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC50aXRsZTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gZXh0cmFjdE1ldGFkYXRhKCk7XG4gICAgICBcbiAgICAgIC8vIE9ubHkgc2VuZCBpZiB3ZSBoYXZlIG1lYW5pbmdmdWwgbWV0YWRhdGFcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtZXRhZGF0YSkubGVuZ3RoID4gMCkge1xuICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgIHR5cGU6IFBBR0VfTUVUQURBVEFfRVhUUkFDVEVELFxuICAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHRpdGxlLFxuICAgICAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBXYWl0IGZvciBET00gdG8gYmUgZnVsbHkgbG9hZGVkIGJlZm9yZSBleHRyYWN0aW5nIG1ldGFkYXRhXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgICAgICAgLy8gV2FpdCBhIGJpdCBtb3JlIGZvciBkeW5hbWljIG1ldGEgdGFncyB0byBiZSBhZGRlZFxuICAgICAgICBzZXRUaW1lb3V0KHNlbmRNZXRhZGF0YSwgNTAwKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEb2N1bWVudCBhbHJlYWR5IGxvYWRlZFxuICAgICAgc2V0VGltZW91dChzZW5kTWV0YWRhdGEsIDUwMCk7XG4gICAgfVxuXG4gICAgLy8gQWxzbyBsaXN0ZW4gZm9yIGNoYW5nZXMgdG8gbWV0YSB0YWdzIChmb3IgU1BBcyB0aGF0IHVwZGF0ZSBtZXRhZGF0YSlcbiAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcbiAgICAgIGxldCBtZXRhQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgbXV0YXRpb25zLmZvckVhY2goKG11dGF0aW9uKSA9PiB7XG4gICAgICAgIGlmIChtdXRhdGlvbi50eXBlID09PSAnY2hpbGRMaXN0Jykge1xuICAgICAgICAgIG11dGF0aW9uLmFkZGVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKG5vZGUubm9kZU5hbWUgPT09ICdNRVRBJyB8fCBub2RlLm5vZGVOYW1lID09PSAnTElOSycpIHtcbiAgICAgICAgICAgICAgbWV0YUNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG11dGF0aW9uLnR5cGUgPT09ICdhdHRyaWJ1dGVzJyAmJiBcbiAgICAgICAgICAgICAgICAgICAobXV0YXRpb24udGFyZ2V0Lm5vZGVOYW1lID09PSAnTUVUQScgfHwgbXV0YXRpb24udGFyZ2V0Lm5vZGVOYW1lID09PSAnTElOSycpKSB7XG4gICAgICAgICAgbWV0YUNoYW5nZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKG1ldGFDaGFuZ2VkKSB7XG4gICAgICAgIC8vIERlYm91bmNlIG1ldGFkYXRhIGV4dHJhY3Rpb25cbiAgICAgICAgc2V0VGltZW91dChzZW5kTWV0YWRhdGEsIDIwMCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBPYnNlcnZlIGNoYW5nZXMgdG8gaGVhZCBlbGVtZW50XG4gICAgY29uc3QgaGVhZEVsZW1lbnQgPSBkb2N1bWVudC5oZWFkO1xuICAgIGlmIChoZWFkRWxlbWVudCkge1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoZWFkRWxlbWVudCwge1xuICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgIHN1YnRyZWU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENsZWFudXAgb2JzZXJ2ZXIgd2hlbiBjb250ZW50IHNjcmlwdCBpcyBkZXN0cm95ZWRcbiAgICBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfSk7XG4gIH0sXG59KTtcbiIsImZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuICBpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG4gIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmdzLnNoaWZ0KCk7XG4gICAgbWV0aG9kKGBbd3h0XSAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG4gIH1cbn1cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5leHBvcnQgY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgY29uc3RydWN0b3IobmV3VXJsLCBvbGRVcmwpIHtcbiAgICBzdXBlcihXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LkVWRU5UX05BTUUsIHt9KTtcbiAgICB0aGlzLm5ld1VybCA9IG5ld1VybDtcbiAgICB0aGlzLm9sZFVybCA9IG9sZFVybDtcbiAgfVxuICBzdGF0aWMgRVZFTlRfTkFNRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcInd4dDpsb2NhdGlvbmNoYW5nZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzXCI7XG5pbXBvcnQge1xuICBnZXRVbmlxdWVFdmVudE5hbWVcbn0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhclRpbWVvdXQoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiLCJfYSIsIl9iIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxXQUFTLG9CQUFvQkEsYUFBWTtBQUM5QyxXQUFPQTtBQUFBLEVBQ1Q7QUNETyxRQUFNQyxjQUFVLHNCQUFXLFlBQVgsbUJBQW9CLFlBQXBCLG1CQUE2QixNQUNoRCxXQUFXLFVBQ1gsV0FBVztBQ0ZSLFFBQU0sVUFBVUM7QUNBaEIsUUFBTSwwQkFBMEI7O0FDRXZDLFFBQUEsYUFBQSxvQkFBQTtBQUFBLElBQW1DLFNBQUEsQ0FBQSxZQUFBO0FBQUEsSUFDWCxLQUFBLEtBQUE7QUFFcEIsY0FBQSxJQUFBLDBDQUFBO0FBR0EsWUFBQSxrQkFBQSxNQUFBO0FBQ0UsY0FBQSxXQUFBLENBQUE7QUFHQSxjQUFBLFNBQUEsU0FBQSxpQkFBQSx1QkFBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLFFBQUE7QUFDRSxnQkFBQSxXQUFBLElBQUEsYUFB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TUFBTSxTQUFTLFNBQVM7O0FBQy9DLFVBQUksU0FBUyxzQkFBc0I7QUFDakMsWUFBSSxLQUFLLFFBQVMsTUFBSyxnQkFBZ0IsSUFBRztBQUFBLE1BQ2hEO0FBQ0ksT0FBQUEsTUFBQSxPQUFPLHFCQUFQLGdCQUFBQSxJQUFBO0FBQUE7QUFBQSxRQUNFLEtBQUssV0FBVyxNQUFNLElBQUksbUJBQW1CLElBQUksSUFBSTtBQUFBLFFBQ3JEO0FBQUEsUUFDQTtBQUFBLFVBQ0UsR0FBRztBQUFBLFVBQ0gsUUFBUSxLQUFLO0FBQUEsUUFDckI7QUFBQTtBQUFBLElBRUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBS0Usb0JBQW9CO0FBQ2xCLFdBQUssTUFBTSxvQ0FBb0M7QUFDL0NELGVBQU87QUFBQSxRQUNMLG1CQUFtQixLQUFLLGlCQUFpQjtBQUFBLE1BQy9DO0FBQUEsSUFDQTtBQUFBLElBQ0UsaUJBQWlCO0FBQ2YsYUFBTztBQUFBLFFBQ0w7QUFBQSxVQUNFLE1BQU0sc0JBQXFCO0FBQUEsVUFDM0IsbUJBQW1CLEtBQUs7QUFBQSxVQUN4QixXQUFXLEtBQUssT0FBTSxFQUFHLFNBQVMsRUFBRSxFQUFFLE1BQU0sQ0FBQztBQUFBLFFBQ3JEO0FBQUEsUUFDTTtBQUFBLE1BQ047QUFBQSxJQUNBO0FBQUEsSUFDRSx5QkFBeUIsT0FBTzs7QUFDOUIsWUFBTSx5QkFBdUJDLE1BQUEsTUFBTSxTQUFOLGdCQUFBQSxJQUFZLFVBQVMsc0JBQXFCO0FBQ3ZFLFlBQU0sd0JBQXNCQyxNQUFBLE1BQU0sU0FBTixnQkFBQUEsSUFBWSx1QkFBc0IsS0FBSztBQUNuRSxZQUFNLGlCQUFpQixDQUFDLEtBQUssbUJBQW1CLEtBQUksV0FBTSxTQUFOLG1CQUFZLFNBQVM7QUFDekUsYUFBTyx3QkFBd0IsdUJBQXVCO0FBQUEsSUFDMUQ7QUFBQSxJQUNFLHNCQUFzQixTQUFTO0FBQzdCLFVBQUksVUFBVTtBQUNkLFlBQU0sS0FBSyxDQUFDLFVBQVU7QUFDcEIsWUFBSSxLQUFLLHlCQUF5QixLQUFLLEdBQUc7QUFDeEMsZUFBSyxtQkFBbUIsSUFBSSxNQUFNLEtBQUssU0FBUztBQUNoRCxnQkFBTSxXQUFXO0FBQ2pCLG9CQUFVO0FBQ1YsY0FBSSxhQUFZLG1DQUFTLGtCQUFrQjtBQUMzQyxlQUFLLGtCQUFpQjtBQUFBLFFBQzlCO0FBQUEsTUFDQTtBQUNJLHVCQUFpQixXQUFXLEVBQUU7QUFDOUIsV0FBSyxjQUFjLE1BQU0sb0JBQW9CLFdBQVcsRUFBRSxDQUFDO0FBQUEsSUFDL0Q7QUFBQSxFQUNBO0FBckpFLGdCQVpXLHVCQVlKLCtCQUE4QjtBQUFBLElBQ25DO0FBQUEsRUFDSjtBQWRPLE1BQU0sdUJBQU47Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsNSw2LDcsOF19
