var background = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  let deviceID;
  async function initializeDeviceID() {
    if (deviceID) {
      return deviceID;
    }
    const data = await browser.storage.local.get("deviceId");
    if (data.deviceId) {
      deviceID = data.deviceId;
      return deviceID;
    }
    deviceID = crypto.randomUUID();
    await browser.storage.local.set({ deviceID });
    return deviceID;
  }
  function getDeviceId() {
    if (deviceID) {
      return deviceID;
    }
    throw new Error("Device ID not initialized. Call initializeDeviceID first.");
  }
  background;
  const _DatabaseSingleton = class _DatabaseSingleton {
    constructor() {
      __publicField(this, "db");
      __publicField(this, "DB_NAME", "browser-history-db");
      __publicField(this, "DB_VERSION", 1);
      __publicField(this, "schemaBuilders", []);
    }
    static getInstance() {
      if (!_DatabaseSingleton.instance) {
        _DatabaseSingleton.instance = new _DatabaseSingleton();
      }
      return _DatabaseSingleton.instance;
    }
    registerSchema(createSchema) {
      this.schemaBuilders.push(createSchema);
    }
    async getDB() {
      console.debug("Getting IndexedDB instance for:", this.DB_NAME);
      if (this.db) {
        console.debug("Returning existing IndexedDB instance.");
        return this.db;
      }
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onerror = () => {
          console.error("Error opening IndexedDB:", request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          this.db = request.result;
          console.debug("IndexedDB opened successfully:", this.DB_NAME);
          resolve(this.db);
        };
        request.onupgradeneeded = (event) => {
          const db = request.result;
          console.debug("onupgradeneeded for:", this.DB_NAME);
          this.createSchema(db);
        };
      });
    }
    createSchema(db) {
      console.debug("Creating schema for database:", this.DB_NAME);
      console.debug("Schema builders count:", this.schemaBuilders.length);
      for (const builder of this.schemaBuilders) {
        console.debug("Applying schema builder:", builder.name);
        builder(db);
      }
    }
  };
  __publicField(_DatabaseSingleton, "instance");
  let DatabaseSingleton = _DatabaseSingleton;
  background;
  class BaseIndexedDBRepository {
    constructor() {
      __publicField(this, "DB_NAME", "browser-history-db");
      __publicField(this, "DB_VERSION", 1);
      __publicField(this, "db");
    }
    // must be called in the constructor of subclasses
    registerSchema(builder) {
      console.log("Registering schema for store:", this.STORE_NAME);
      const dbInstance = DatabaseSingleton.getInstance();
      dbInstance.registerSchema(builder);
    }
    /**
     * Gets or initializes the IndexedDB database
     */
    async getDB() {
      const dbInstance = DatabaseSingleton.getInstance();
      return dbInstance.getDB();
    }
    /**
     * Adds or updates an entity in the store
     */
    async saveItem(entity) {
      const db = await this.getDB();
      let itemToStore = this.prepareForStorage(entity);
      const existingKey = this.getEntityKey(entity);
      const existingItem = await this.getItem(existingKey);
      if (existingItem) {
        itemToStore = this.update(existingItem, itemToStore);
      }
      console.log("Saving item to store:", this.STORE_NAME, itemToStore);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readwrite");
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(itemToStore);
        request.onerror = () => {
          reject(request.error);
        };
        transaction.oncomplete = () => {
          resolve();
        };
      });
    }
    /**
     * Updates an existing item with new properties
     * Only properties that are not undefined in newItem will be updated
     * Existing properties will remain unchanged if not specified in newItem
     *
     * @param existingItem The item to update
     * @param newItem The new item with properties to update
     * @returns The updated item
     */
    update(existingItem, newItem) {
      const updatedItem = { ...existingItem };
      for (const key in newItem) {
        if (newItem[key] !== void 0) {
          updatedItem[key] = newItem[key];
        }
      }
      return updatedItem;
    }
    /**
     * Gets an entity by its key
     */
    async getItem(key) {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readonly");
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(key);
        request.onerror = () => {
          reject(request.error);
        };
        request.onsuccess = () => {
          if (!request.result) {
            resolve(void 0);
            return;
          }
          resolve(this.processFromStorage(request.result));
        };
      });
    }
    /**
     * Gets all entities from the store
     */
    async getAllItems() {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readonly");
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();
        request.onerror = () => {
          reject(request.error);
        };
        request.onsuccess = () => {
          const items = request.result.map((item) => this.processFromStorage(item));
          resolve(items);
        };
      });
    }
    /**
     * Gets items by an index value
     */
    async getItemsByIndex(indexName, value) {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], "readonly");
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onerror = () => {
          reject(request.error);
        };
        request.onsuccess = () => {
          const items = request.result.map((item) => this.processFromStorage(item));
          resolve(items);
        };
      });
    }
  }
  background;
  const _HistoryRepositoryIndexedDB = class _HistoryRepositoryIndexedDB extends BaseIndexedDBRepository {
    constructor() {
      super();
      __publicField(this, "STORE_NAME", _HistoryRepositoryIndexedDB.STORE_NAME);
      this.registerSchema(createHistorySchema);
    }
    prepareForStorage(node) {
      return {
        ...node,
        timestamp: node.timestamp.toISOString()
        // Convert Date to ISO string for storage
      };
    }
    processFromStorage(storedItem) {
      return {
        ...storedItem,
        timestamp: new Date(storedItem.timestamp)
        // Convert ISO string back to Date
      };
    }
    getEntityKey(node) {
      return node.id;
    }
    // Interface implementations
    async add(node) {
      return this.saveItem(node);
    }
    async get(id) {
      return this.getItem(id);
    }
    async getAll() {
      return this.getAllItems();
    }
    // Additional useful methods for tree navigation
    async getChildNodes(parentId) {
      return this.getItemsByIndex("navigationSourceID", parentId);
    }
  };
  __publicField(_HistoryRepositoryIndexedDB, "STORE_NAME", "history");
  let HistoryRepositoryIndexedDB = _HistoryRepositoryIndexedDB;
  function createHistorySchema(db) {
    if (!db.objectStoreNames.contains(HistoryRepositoryIndexedDB.STORE_NAME)) {
      const historyStore = db.createObjectStore(HistoryRepositoryIndexedDB.STORE_NAME, { keyPath: "id" });
      historyStore.createIndex("navigationSourceID", "navigationSourceID", { unique: false });
      historyStore.createIndex("url", "url", { unique: false });
      historyStore.createIndex("timestamp", "timestamp", { unique: false });
    }
  }
  background;
  const _PageRepositoryIndexedDB = class _PageRepositoryIndexedDB extends BaseIndexedDBRepository {
    constructor() {
      super();
      __publicField(this, "STORE_NAME", _PageRepositoryIndexedDB.STORE_NAME);
      this.registerSchema(createPageSchema);
    }
    prepareForStorage(page) {
      return {
        ...page
      };
    }
    processFromStorage(storedItem) {
      const page = {
        ...storedItem
      };
      return page;
    }
    getEntityKey(page) {
      return page.url;
    }
    // Interface implementations
    async addOrUpdate(page) {
      return this.saveItem(page);
    }
    async get(url) {
      return this.getItem(url);
    }
    // Additional helper method
    async getAll() {
      return this.getAllItems();
    }
  };
  __publicField(_PageRepositoryIndexedDB, "STORE_NAME", "pages");
  let PageRepositoryIndexedDB = _PageRepositoryIndexedDB;
  function createPageSchema(db) {
    if (!db.objectStoreNames.contains(PageRepositoryIndexedDB.STORE_NAME)) {
      const pageStore = db.createObjectStore(PageRepositoryIndexedDB.STORE_NAME, { keyPath: "url" });
      pageStore.createIndex("title", "title", { unique: false });
      pageStore.createIndex("lastVisited", "lastVisited", { unique: false });
      pageStore.createIndex("visitCount", "visitCount", { unique: false });
    }
  }
  background;
  class Page {
    constructor(url, favicon = void 0, title = void 0, metadata = {}) {
      __publicField(this, "lastUpdate", /* @__PURE__ */ new Date());
      this.url = url;
      this.favicon = favicon;
      this.title = title;
      this.metadata = metadata;
    }
  }
  class HistoryNode {
    // Unique identifier for the history node
    constructor(tabId, url, navigationSourceID = null) {
      __publicField(this, "timestamp", /* @__PURE__ */ new Date());
      __publicField(this, "deviceId", getDeviceId());
      // Device ID for multi-device support
      __publicField(this, "id");
      this.tabId = tabId;
      this.url = url;
      this.navigationSourceID = navigationSourceID;
      this.id = crypto.randomUUID();
    }
  }
  background;
  class HistoryService {
    constructor(historyRepo, pageRepo) {
      __publicField(this, "historyRepo");
      __publicField(this, "pageRepo");
      // Track the last node ID for each tab
      __publicField(this, "tabNodeMap", {});
      this.historyRepo = historyRepo;
      this.pageRepo = pageRepo;
    }
    async onTabUpdated(changeInfo, tab) {
      if (!tab.url || this.isInternalUrl(tab.url)) {
        console.debug(`Ignoring tab update for internal URL: ${tab.url}`);
        return;
      }
      console.log(`Tab updated: ${tab.id} - ${tab.url}`, changeInfo);
      const favicon = changeInfo.favIconUrl;
      if (favicon) {
        this.updateFavicon(tab.url, favicon);
      }
      const title = changeInfo.title;
      if (title) {
        console.warn(`Updating title for tab ${tab.id}: ${title}`);
        this.updateTitle(tab.url, title);
      }
    }
    updateTitle(url, title) {
      this.pageRepo.addOrUpdate(new Page(url, void 0, title)).catch((error) => console.error("Error updating page title:", error));
    }
    updateFavicon(url, favicon) {
      this.pageRepo.addOrUpdate(new Page(url, favicon)).catch((error) => console.error("Error updating page favicon:", error));
    }
    async onNavigationCommitted(details) {
      if (details.frameId !== 0) return;
      const tab = await browser.tabs.get(details.tabId);
      this.handleNavigation({
        url: details.url,
        tabId: details.tabId,
        timestamp: Date.now(),
        transitionType: details.transitionType,
        title: tab == null ? void 0 : tab.title
      }).catch((error) => console.error("Error handling navigation:", error));
    }
    /**
     * Handle a browser navigation event and record in history
     */
    async handleNavigation(details) {
      const { url, tabId, timestamp, transitionType, title } = details;
      if (this.isInternalUrl(url)) {
        return void 0;
      }
      try {
        if (this.tabNodeMap[tabId]) {
          const currentNode = await this.historyRepo.get(this.tabNodeMap[tabId]);
          if (currentNode && currentNode.url.toString() === url) {
            console.log(`Skipping duplicate navigation to: ${url}`);
          }
        }
        if (transitionType === "back_forward" && this.tabNodeMap[tabId]) {
          const currentNode = await this.historyRepo.get(this.tabNodeMap[tabId]);
          if (currentNode && currentNode.navigationSourceID) {
            this.tabNodeMap[tabId] = currentNode.navigationSourceID;
            console.log(`Back navigation to: ${currentNode.navigationSourceID} for ${url}`);
          }
        }
        let parentId = null;
        if (this.tabNodeMap[tabId] && transitionType && !["typed", "auto_bookmark", "generated", "start_page", "reload", "back_forward"].includes(transitionType)) {
          parentId = this.tabNodeMap[tabId];
        }
        const node = new HistoryNode(tabId, url, parentId ?? void 0);
        await this.historyRepo.add(node);
        await this.updatePageMetadata(url, title, timestamp);
        this.tabNodeMap[tabId] = node.id;
        console.log(`Added navigation node: ${node.id} for ${url} (parent: ${parentId})`);
      } catch (error) {
        console.error("Error processing navigation:", error);
        return void 0;
      }
    }
    isInternalUrl(url) {
      const internalProtocols = ["chrome:", "chrome-extension:", "about:", "moz-extension:"];
      return internalProtocols.some((p) => url.startsWith(p));
    }
    /**
     * Handle SPA navigation that occurs within a page
     */
    async handleSpaNavigation(details) {
      await this.handleNavigation({
        ...details,
        timestamp: Date.now(),
        transitionType: "link"
        // Treat SPA navigation as link navigation
      });
    }
    /**
     * Clean up tab tracking when a tab is closed
     */
    onTabClosed(tabId) {
      delete this.tabNodeMap[tabId];
    }
    /**
     * Helper method to update page metadata
     */
    async updatePageMetadata(url, title, timestamp) {
      try {
        let page = await this.pageRepo.get(url);
        if (page) {
          page.metadata.lastVisited = timestamp;
          page.metadata.visitCount = (page.metadata.visitCount || 0) + 1;
          if (title && !page.title) {
            page.title = title;
          }
        } else {
          page = new Page(url, void 0, title || void 0, {
            lastVisited: timestamp,
            visitCount: 1
          });
        }
        await this.pageRepo.addOrUpdate(page);
      } catch (e) {
        console.error(`Error updating page metadata for ${url}:`, e);
      }
    }
    async getHistoryEntries(options = {}) {
      var history = await this.historyRepo.getAll();
      var pages = await this.pageRepo.getAll();
      const entries = history.map((node) => {
        const page = pages.find((p) => p.url === node.url);
        return {
          id: node.id,
          url: node.url,
          title: (page == null ? void 0 : page.title) || null,
          favicon: (page == null ? void 0 : page.favicon) || null,
          timestamp: node.timestamp,
          parentId: node.navigationSourceID || null,
          metadata: (page == null ? void 0 : page.metadata) || {},
          children: []
          // Populate children if needed
        };
      });
      return entries.filter((entry) => {
        if (options.query && !entry.url.includes(options.query) && !(entry.title && entry.title.includes(options.query))) {
          return false;
        }
        if (options.startDate && entry.timestamp < options.startDate) {
          return false;
        }
        if (options.endDate && entry.timestamp > options.endDate) {
          return false;
        }
        return true;
      }).slice(
        options.offset || 0,
        options.limit ? (options.offset || 0) + options.limit : void 0
      ).sort((a, b) => {
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    }
  }
  background;
  const SPA_URL_CHANGE = "spa-url-change";
  const PAGE_METADATA_EXTRACTED = "PAGE_METADATA_EXTRACTED";
  background;
  const definition = defineBackground(() => {
    (async () => {
      await initializeDeviceID();
      console.log("browser history extension started");
      const pageRepository = new PageRepositoryIndexedDB();
      const historyRepository = new HistoryRepositoryIndexedDB();
      const pages = await pageRepository.getAll();
      console.log(`Found ${pages.length} pages in the repository.`);
      const histories = await historyRepository.getAll();
      console.log(`Found ${histories.length} history nodes in the repository.`);
      const historyService = new HistoryService(historyRepository, pageRepository);
      browser.tabs.onRemoved.addListener((tabId) => {
        historyService.onTabClosed(tabId);
      });
      browser.webNavigation.onCommitted.addListener(async (details) => {
        if (details.frameId !== 0) return;
        await historyService.onNavigationCommitted(details);
      });
      browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        await historyService.onTabUpdated(changeInfo, tab);
      });
      browser.runtime.onMessage.addListener(async (message, sender) => {
        var _a2;
        if (message.type === SPA_URL_CHANGE && ((_a2 = sender.tab) == null ? void 0 : _a2.id)) {
          await historyService.handleSpaNavigation({
            url: message.url,
            tabId: sender.tab.id,
            title: sender.tab.title
          });
        }
        if (message.type === PAGE_METADATA_EXTRACTED) {
          const { url, title, metadata, timestamp } = message.payload;
          console.log("Received metadata for", url, metadata);
          try {
            let page = await pageRepository.get(url);
            if (page) {
              page.metadata = { ...page.metadata, ...metadata };
              if (title && !page.title) {
                page.title = title;
              }
              page.lastUpdate = new Date(timestamp);
            } else {
              page = new Page(url, void 0, title, {
                ...metadata,
                metadataExtracted: timestamp,
                lastVisited: timestamp
              });
            }
            await pageRepository.addOrUpdate(page);
            console.log("Updated page metadata for", url);
          } catch (error) {
            console.error("Error updating page metadata:", error);
          }
        }
      });
    })();
  });
  background;
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
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
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9zcmMvbGliL0hpc3RvcnlUcmVlL0RldmljZUlELnRzIiwiLi4vLi4vc3JjL2xpYi9IaXN0b3J5VHJlZS9EYXRhYmFzZVNpbmdsZXRvbi50cyIsIi4uLy4uL3NyYy9saWIvSGlzdG9yeVRyZWUvQmFzZUluZGV4ZWREQlJlcG9zaXRvcnkudHMiLCIuLi8uLi9zcmMvbGliL0hpc3RvcnlUcmVlL0hpc3RvcnlSZXBvc2l0b3J5SW5kZXhlZERCLnRzIiwiLi4vLi4vc3JjL2xpYi9IaXN0b3J5VHJlZS9QYWdlUmVwb3NpdG9yeUluZGV4ZWREQi50cyIsIi4uLy4uL3NyYy9saWIvSGlzdG9yeVRyZWUvSGlzdG9yeU5vZGUudHMiLCIuLi8uLi9zcmMvbGliL0hpc3RvcnlUcmVlL0hpc3RvcnlTZXJ2aWNlLnRzIiwiLi4vLi4vc3JjL21lc3NhZ2UudHMiLCIuLi8uLi9zcmMvZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsImltcG9ydCB7IGd1aWQgfSBmcm9tIFwiLi4vZ3VpZFwiO1xuXG4vLyBHZW5lcmF0ZSBvbiBmaXJzdCBleHRlbnNpb24gcnVuIGFuZCBzdG9yZSBpbiBwZXJzaXN0ZW50IHN0b3JhZ2VcbmxldCBkZXZpY2VJRDogZ3VpZCB8IHVuZGVmaW5lZDtcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplRGV2aWNlSUQoKSB7XG4gIGlmKGRldmljZUlEKSB7XG4gICAgcmV0dXJuIGRldmljZUlEO1xuICB9XG5cbiAgY29uc3QgZGF0YSA9IGF3YWl0IGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5nZXQoJ2RldmljZUlkJyk7XG4gIGlmIChkYXRhLmRldmljZUlkKSB7XG4gICAgZGV2aWNlSUQgPSBkYXRhLmRldmljZUlkO1xuICAgIHJldHVybiBkZXZpY2VJRDtcbiAgfVxuICBcbiAgLy8gR2VuZXJhdGUgYSBuZXcgVVVJRCB2NFxuICBkZXZpY2VJRCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gIGF3YWl0IGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5zZXQoeyBkZXZpY2VJRCB9KTtcbiAgcmV0dXJuIGRldmljZUlEO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGV2aWNlSWQoKSB7XG4gIGlmIChkZXZpY2VJRCkge1xuICAgIHJldHVybiBkZXZpY2VJRDtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ0RldmljZSBJRCBub3QgaW5pdGlhbGl6ZWQuIENhbGwgaW5pdGlhbGl6ZURldmljZUlEIGZpcnN0LicpO1xufVxuIiwiZXhwb3J0IGNsYXNzIERhdGFiYXNlU2luZ2xldG9uIHtcbiAgICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogRGF0YWJhc2VTaW5nbGV0b247XG4gICAgcHJpdmF0ZSBkYjogSURCRGF0YWJhc2UgfCB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBEQl9OQU1FID0gJ2Jyb3dzZXItaGlzdG9yeS1kYic7XG4gICAgcHJpdmF0ZSByZWFkb25seSBEQl9WRVJTSU9OID0gMTtcbiAgICBwcml2YXRlIHNjaGVtYUJ1aWxkZXJzOiBBcnJheTwoZGI6IElEQkRhdGFiYXNlKSA9PiB2b2lkPiA9IFtdO1xuXG5cbiAgICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlU2luZ2xldG9uIHtcbiAgICAgICAgaWYgKCFEYXRhYmFzZVNpbmdsZXRvbi5pbnN0YW5jZSkge1xuICAgICAgICAgICAgRGF0YWJhc2VTaW5nbGV0b24uaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2VTaW5nbGV0b24oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRGF0YWJhc2VTaW5nbGV0b24uaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJTY2hlbWEoY3JlYXRlU2NoZW1hOiAoZGI6IElEQkRhdGFiYXNlKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2NoZW1hQnVpbGRlcnMucHVzaChjcmVhdGVTY2hlbWEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBnZXREQigpOiBQcm9taXNlPElEQkRhdGFiYXNlPiB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ0dldHRpbmcgSW5kZXhlZERCIGluc3RhbmNlIGZvcjonLCB0aGlzLkRCX05BTUUpO1xuXG4gICAgICAgIGlmICh0aGlzLmRiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZXR1cm5pbmcgZXhpc3RpbmcgSW5kZXhlZERCIGluc3RhbmNlLicpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHRoaXMuREJfTkFNRSwgdGhpcy5EQl9WRVJTSU9OKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG9wZW5pbmcgSW5kZXhlZERCOicsIHJlcXVlc3QuZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGIgPSByZXF1ZXN0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdJbmRleGVkREIgb3BlbmVkIHN1Y2Nlc3NmdWxseTonLCB0aGlzLkRCX05BTUUpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5kYik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRiID0gcmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1Zygnb251cGdyYWRlbmVlZGVkIGZvcjonLCB0aGlzLkRCX05BTUUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlU2NoZW1hKGRiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRlU2NoZW1hKGRiOiBJREJEYXRhYmFzZSk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmRlYnVnKCdDcmVhdGluZyBzY2hlbWEgZm9yIGRhdGFiYXNlOicsIHRoaXMuREJfTkFNRSk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ1NjaGVtYSBidWlsZGVycyBjb3VudDonLCB0aGlzLnNjaGVtYUJ1aWxkZXJzLmxlbmd0aCk7XG4gICAgICAgIC8vIENhbGwgYWxsIHJlZ2lzdGVyZWQgc2NoZW1hIGJ1aWxkZXJzXG4gICAgICAgIGZvciAoY29uc3QgYnVpbGRlciBvZiB0aGlzLnNjaGVtYUJ1aWxkZXJzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdBcHBseWluZyBzY2hlbWEgYnVpbGRlcjonLCBidWlsZGVyLm5hbWUpO1xuICAgICAgICAgICAgYnVpbGRlcihkYik7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBEYXRhYmFzZVNpbmdsZXRvbiB9IGZyb20gJy4vRGF0YWJhc2VTaW5nbGV0b24nO1xuXG4vKipcbiAqIEFic3RyYWN0IGJhc2UgY2xhc3MgZm9yIEluZGV4ZWREQiByZXBvc2l0b3JpZXNcbiAqIEhhbmRsZXMgY29tbW9uIGRhdGFiYXNlIG9wZXJhdGlvbnMgYW5kIGNvbm5lY3Rpb24gbWFuYWdlbWVudFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZUluZGV4ZWREQlJlcG9zaXRvcnk8VCwgSyBleHRlbmRzIElEQlZhbGlkS2V5IHwgSURCS2V5UmFuZ2UgPSBJREJWYWxpZEtleT4ge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgREJfTkFNRSA9ICdicm93c2VyLWhpc3RvcnktZGInO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgREJfVkVSU0lPTiA9IDE7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZWFkb25seSBTVE9SRV9OQU1FOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBkYjogSURCRGF0YWJhc2UgfCB1bmRlZmluZWQ7XG5cbiAgLy8gbXVzdCBiZSBjYWxsZWQgaW4gdGhlIGNvbnN0cnVjdG9yIG9mIHN1YmNsYXNzZXNcbiAgcHJvdGVjdGVkIHJlZ2lzdGVyU2NoZW1hKGJ1aWxkZXI6IChkYjogSURCRGF0YWJhc2UpID0+IHZvaWQpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnUmVnaXN0ZXJpbmcgc2NoZW1hIGZvciBzdG9yZTonLCB0aGlzLlNUT1JFX05BTUUpO1xuICAgIGNvbnN0IGRiSW5zdGFuY2UgPSBEYXRhYmFzZVNpbmdsZXRvbi5nZXRJbnN0YW5jZSgpO1xuICAgIGRiSW5zdGFuY2UucmVnaXN0ZXJTY2hlbWEoYnVpbGRlcik7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBvciBpbml0aWFsaXplcyB0aGUgSW5kZXhlZERCIGRhdGFiYXNlXG4gICAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0REIoKTogUHJvbWlzZTxJREJEYXRhYmFzZT4ge1xuICAgIGNvbnN0IGRiSW5zdGFuY2UgPSBEYXRhYmFzZVNpbmdsZXRvbi5nZXRJbnN0YW5jZSgpO1xuICAgIHJldHVybiBkYkluc3RhbmNlLmdldERCKCk7XG4gIH1cblxuICAvKipcbiAgICogQWJzdHJhY3QgbWV0aG9kIHRvIHByZXBhcmUgZW50aXR5IGZvciBzdG9yYWdlXG4gICAqIEFsbG93cyBzdWJjbGFzc2VzIHRvIHRyYW5zZm9ybSBlbnRpdGllcyBiZWZvcmUgc3RvcmluZ1xuICAgKi9cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHByZXBhcmVGb3JTdG9yYWdlKGVudGl0eTogVCk6IGFueTtcblxuICAvKipcbiAgICogQWJzdHJhY3QgbWV0aG9kIHRvIHByb2Nlc3MgZW50aXR5IGFmdGVyIHJldHJpZXZhbFxuICAgKiBBbGxvd3Mgc3ViY2xhc3NlcyB0byB0cmFuc2Zvcm0gc3RvcmVkIGRhdGEgYmFjayBpbnRvIGVudGl0aWVzXG4gICAqL1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcHJvY2Vzc0Zyb21TdG9yYWdlKHN0b3JlZEl0ZW06IGFueSk6IFQ7XG5cbiAgLyoqXG4gICAqIEFic3RyYWN0IG1ldGhvZCB0byBleHRyYWN0IHRoZSBrZXkgZnJvbSBhbiBlbnRpdHlcbiAgICovXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBnZXRFbnRpdHlLZXkoZW50aXR5OiBUKTogSztcblxuICAvKipcbiAgICogQWRkcyBvciB1cGRhdGVzIGFuIGVudGl0eSBpbiB0aGUgc3RvcmVcbiAgICovXG4gIHByb3RlY3RlZCBhc3luYyBzYXZlSXRlbShlbnRpdHk6IFQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMuZ2V0REIoKTtcbiAgICBsZXQgaXRlbVRvU3RvcmUgPSB0aGlzLnByZXBhcmVGb3JTdG9yYWdlKGVudGl0eSk7XG5cbiAgICBjb25zdCBleGlzdGluZ0tleSA9IHRoaXMuZ2V0RW50aXR5S2V5KGVudGl0eSk7XG4gICAgY29uc3QgZXhpc3RpbmdJdGVtID0gYXdhaXQgdGhpcy5nZXRJdGVtKGV4aXN0aW5nS2V5KTtcbiAgICBpZiAoZXhpc3RpbmdJdGVtKSB7XG4gICAgICBpdGVtVG9TdG9yZSA9IHRoaXMudXBkYXRlKGV4aXN0aW5nSXRlbSwgaXRlbVRvU3RvcmUpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnU2F2aW5nIGl0ZW0gdG8gc3RvcmU6JywgdGhpcy5TVE9SRV9OQU1FLCBpdGVtVG9TdG9yZSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBkYi50cmFuc2FjdGlvbihbdGhpcy5TVE9SRV9OQU1FXSwgJ3JlYWR3cml0ZScpO1xuICAgICAgY29uc3Qgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZSh0aGlzLlNUT1JFX05BTUUpO1xuXG4gICAgICBjb25zdCByZXF1ZXN0ID0gc3RvcmUucHV0KGl0ZW1Ub1N0b3JlKTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuXG4gICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG4gIFxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBpdGVtIHdpdGggbmV3IHByb3BlcnRpZXNcbiAgICogT25seSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCB1bmRlZmluZWQgaW4gbmV3SXRlbSB3aWxsIGJlIHVwZGF0ZWRcbiAgICogRXhpc3RpbmcgcHJvcGVydGllcyB3aWxsIHJlbWFpbiB1bmNoYW5nZWQgaWYgbm90IHNwZWNpZmllZCBpbiBuZXdJdGVtXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ0l0ZW0gVGhlIGl0ZW0gdG8gdXBkYXRlXG4gICAqIEBwYXJhbSBuZXdJdGVtIFRoZSBuZXcgaXRlbSB3aXRoIHByb3BlcnRpZXMgdG8gdXBkYXRlXG4gICAqIEByZXR1cm5zIFRoZSB1cGRhdGVkIGl0ZW1cbiAgICovXG4gIHVwZGF0ZShleGlzdGluZ0l0ZW06IFQsIG5ld0l0ZW06IFQpOiBUIHtcbiAgICBjb25zdCB1cGRhdGVkSXRlbSA9IHsgLi4uZXhpc3RpbmdJdGVtIH07XG4gICAgZm9yIChjb25zdCBrZXkgaW4gbmV3SXRlbSkge1xuICAgICAgaWYgKG5ld0l0ZW1ba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZWRJdGVtW2tleV0gPSBuZXdJdGVtW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cGRhdGVkSXRlbTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIGVudGl0eSBieSBpdHMga2V5XG4gICAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0SXRlbShrZXk6IEspOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMuZ2V0REIoKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IGRiLnRyYW5zYWN0aW9uKFt0aGlzLlNUT1JFX05BTUVdLCAncmVhZG9ubHknKTtcbiAgICAgIGNvbnN0IHN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUodGhpcy5TVE9SRV9OQU1FKTtcblxuICAgICAgY29uc3QgcmVxdWVzdCA9IHN0b3JlLmdldChrZXkpO1xuXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICBpZiAoIXJlcXVlc3QucmVzdWx0KSB7XG4gICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc29sdmUodGhpcy5wcm9jZXNzRnJvbVN0b3JhZ2UocmVxdWVzdC5yZXN1bHQpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhbGwgZW50aXRpZXMgZnJvbSB0aGUgc3RvcmVcbiAgICovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRBbGxJdGVtcygpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5nZXREQigpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gZGIudHJhbnNhY3Rpb24oW3RoaXMuU1RPUkVfTkFNRV0sICdyZWFkb25seScpO1xuICAgICAgY29uc3Qgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZSh0aGlzLlNUT1JFX05BTUUpO1xuXG4gICAgICBjb25zdCByZXF1ZXN0ID0gc3RvcmUuZ2V0QWxsKCk7XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gcmVxdWVzdC5yZXN1bHQubWFwKGl0ZW0gPT4gdGhpcy5wcm9jZXNzRnJvbVN0b3JhZ2UoaXRlbSkpO1xuICAgICAgICByZXNvbHZlKGl0ZW1zKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpdGVtcyBieSBhbiBpbmRleCB2YWx1ZVxuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEl0ZW1zQnlJbmRleChpbmRleE5hbWU6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLmdldERCKCk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBkYi50cmFuc2FjdGlvbihbdGhpcy5TVE9SRV9OQU1FXSwgJ3JlYWRvbmx5Jyk7XG4gICAgICBjb25zdCBzdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHRoaXMuU1RPUkVfTkFNRSk7XG4gICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4KGluZGV4TmFtZSk7XG5cbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBpbmRleC5nZXRBbGwodmFsdWUpO1xuXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IHJlcXVlc3QucmVzdWx0Lm1hcChpdGVtID0+IHRoaXMucHJvY2Vzc0Zyb21TdG9yYWdlKGl0ZW0pKTtcbiAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG59IiwiaW1wb3J0IHsgSGlzdG9yeU5vZGUsIEhpc3RvcnlOb2RlSWQgfSBmcm9tICcuL0hpc3RvcnlOb2RlJztcbmltcG9ydCB7IElIaXN0b3J5UmVwb3NpdG9yeSB9IGZyb20gJy4vSUhpc3RvcnlSZXBvc2l0b3J5JztcbmltcG9ydCB7IEJhc2VJbmRleGVkREJSZXBvc2l0b3J5IH0gZnJvbSAnLi9CYXNlSW5kZXhlZERCUmVwb3NpdG9yeSc7XG5cbmV4cG9ydCBjbGFzcyBIaXN0b3J5UmVwb3NpdG9yeUluZGV4ZWREQlxuICBleHRlbmRzIEJhc2VJbmRleGVkREJSZXBvc2l0b3J5PEhpc3RvcnlOb2RlLCBIaXN0b3J5Tm9kZUlkPlxuICBpbXBsZW1lbnRzIElIaXN0b3J5UmVwb3NpdG9yeSB7XG4gIHN0YXRpYyByZWFkb25seSBTVE9SRV9OQU1FID0gJ2hpc3RvcnknO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgU1RPUkVfTkFNRSA9IEhpc3RvcnlSZXBvc2l0b3J5SW5kZXhlZERCLlNUT1JFX05BTUU7XG4gIFxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucmVnaXN0ZXJTY2hlbWEoY3JlYXRlSGlzdG9yeVNjaGVtYSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcHJlcGFyZUZvclN0b3JhZ2Uobm9kZTogSGlzdG9yeU5vZGUpOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5ub2RlLFxuICAgICAgdGltZXN0YW1wOiBub2RlLnRpbWVzdGFtcC50b0lTT1N0cmluZygpLCAvLyBDb252ZXJ0IERhdGUgdG8gSVNPIHN0cmluZyBmb3Igc3RvcmFnZVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcHJvY2Vzc0Zyb21TdG9yYWdlKHN0b3JlZEl0ZW06IGFueSk6IEhpc3RvcnlOb2RlIHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uc3RvcmVkSXRlbSxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoc3RvcmVkSXRlbS50aW1lc3RhbXApLCAvLyBDb252ZXJ0IElTTyBzdHJpbmcgYmFjayB0byBEYXRlXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRFbnRpdHlLZXkobm9kZTogSGlzdG9yeU5vZGUpOiBIaXN0b3J5Tm9kZUlkIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbiAgfVxuXG4gIC8vIEludGVyZmFjZSBpbXBsZW1lbnRhdGlvbnNcbiAgYXN5bmMgYWRkKG5vZGU6IEhpc3RvcnlOb2RlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuc2F2ZUl0ZW0obm9kZSk7XG4gIH1cblxuICBhc3luYyBnZXQoaWQ6IEhpc3RvcnlOb2RlSWQpOiBQcm9taXNlPEhpc3RvcnlOb2RlIHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0SXRlbShpZCk7XG4gIH1cblxuICBhc3luYyBnZXRBbGwoKTogUHJvbWlzZTxIaXN0b3J5Tm9kZVtdPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QWxsSXRlbXMoKTtcbiAgfVxuXG4gIC8vIEFkZGl0aW9uYWwgdXNlZnVsIG1ldGhvZHMgZm9yIHRyZWUgbmF2aWdhdGlvblxuICBhc3luYyBnZXRDaGlsZE5vZGVzKHBhcmVudElkOiBIaXN0b3J5Tm9kZUlkKTogUHJvbWlzZTxIaXN0b3J5Tm9kZVtdPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0SXRlbXNCeUluZGV4KCduYXZpZ2F0aW9uU291cmNlSUQnLCBwYXJlbnRJZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlSGlzdG9yeVNjaGVtYShkYjogSURCRGF0YWJhc2UpOiB2b2lkIHtcbiAgaWYgKCFkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKEhpc3RvcnlSZXBvc2l0b3J5SW5kZXhlZERCLlNUT1JFX05BTUUpKSB7XG4gICAgY29uc3QgaGlzdG9yeVN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoSGlzdG9yeVJlcG9zaXRvcnlJbmRleGVkREIuU1RPUkVfTkFNRSwgeyBrZXlQYXRoOiAnaWQnIH0pO1xuICAgIGhpc3RvcnlTdG9yZS5jcmVhdGVJbmRleCgnbmF2aWdhdGlvblNvdXJjZUlEJywgJ25hdmlnYXRpb25Tb3VyY2VJRCcsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICBoaXN0b3J5U3RvcmUuY3JlYXRlSW5kZXgoJ3VybCcsICd1cmwnLCB7IHVuaXF1ZTogZmFsc2UgfSk7XG4gICAgaGlzdG9yeVN0b3JlLmNyZWF0ZUluZGV4KCd0aW1lc3RhbXAnLCAndGltZXN0YW1wJywgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICB9XG59IiwiaW1wb3J0IHsgUGFnZSB9IGZyb20gJ0AvbGliL0hpc3RvcnlUcmVlL0hpc3RvcnlOb2RlJztcbmltcG9ydCB7IElQYWdlUmVwb3NpdG9yeSB9IGZyb20gJy4vSVBhZ2VSZXBvc2l0b3J5JztcbmltcG9ydCB7IEJhc2VJbmRleGVkREJSZXBvc2l0b3J5IH0gZnJvbSAnLi9CYXNlSW5kZXhlZERCUmVwb3NpdG9yeSc7XG5cbmV4cG9ydCBjbGFzcyBQYWdlUmVwb3NpdG9yeUluZGV4ZWREQlxuICBleHRlbmRzIEJhc2VJbmRleGVkREJSZXBvc2l0b3J5PFBhZ2UsIHN0cmluZz5cbiAgaW1wbGVtZW50cyBJUGFnZVJlcG9zaXRvcnkge1xuXG4gIHN0YXRpYyByZWFkb25seSBTVE9SRV9OQU1FID0gJ3BhZ2VzJztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IFNUT1JFX05BTUUgPSBQYWdlUmVwb3NpdG9yeUluZGV4ZWREQi5TVE9SRV9OQU1FO1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucmVnaXN0ZXJTY2hlbWEoY3JlYXRlUGFnZVNjaGVtYSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcHJlcGFyZUZvclN0b3JhZ2UocGFnZTogUGFnZSk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnBhZ2UsXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcm9jZXNzRnJvbVN0b3JhZ2Uoc3RvcmVkSXRlbTogYW55KTogUGFnZSB7XG4gICAgY29uc3QgcGFnZTogUGFnZSA9IHtcbiAgICAgIC4uLnN0b3JlZEl0ZW0sXG4gICAgfTtcblxuICAgIHJldHVybiBwYWdlO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldEVudGl0eUtleShwYWdlOiBQYWdlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGFnZS51cmw7XG4gIH1cblxuICAvLyBJbnRlcmZhY2UgaW1wbGVtZW50YXRpb25zXG4gIGFzeW5jIGFkZE9yVXBkYXRlKHBhZ2U6IFBhZ2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5zYXZlSXRlbShwYWdlKTtcbiAgfVxuXG4gIGFzeW5jIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8UGFnZSB8IHVuZGVmaW5lZD4ge1xuICAgIHJldHVybiB0aGlzLmdldEl0ZW0odXJsKTtcbiAgfVxuXG4gIC8vIEFkZGl0aW9uYWwgaGVscGVyIG1ldGhvZFxuICBhc3luYyBnZXRBbGwoKTogUHJvbWlzZTxQYWdlW10+IHtcbiAgICByZXR1cm4gdGhpcy5nZXRBbGxJdGVtcygpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhZ2VTY2hlbWEoZGI6IElEQkRhdGFiYXNlKTogdm9pZCB7XG4gIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhQYWdlUmVwb3NpdG9yeUluZGV4ZWREQi5TVE9SRV9OQU1FKSkge1xuICAgIGNvbnN0IHBhZ2VTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFBhZ2VSZXBvc2l0b3J5SW5kZXhlZERCLlNUT1JFX05BTUUsIHsga2V5UGF0aDogJ3VybCcgfSk7XG4gICAgcGFnZVN0b3JlLmNyZWF0ZUluZGV4KCd0aXRsZScsICd0aXRsZScsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICBwYWdlU3RvcmUuY3JlYXRlSW5kZXgoJ2xhc3RWaXNpdGVkJywgJ2xhc3RWaXNpdGVkJywgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgIHBhZ2VTdG9yZS5jcmVhdGVJbmRleCgndmlzaXRDb3VudCcsICd2aXNpdENvdW50JywgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBndWlkIH0gZnJvbSBcIi4uL2d1aWRcIjtcbmltcG9ydCB7IGdldERldmljZUlkIH0gZnJvbSBcIi4vRGV2aWNlSURcIjtcblxuZXhwb3J0IHR5cGUgUGFnZU1ldGFkYXRhID0ge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBEYXRlO1xufTtcblxuZXhwb3J0IGNsYXNzIFBhZ2Uge1xuICAgIHB1YmxpYyBsYXN0VXBkYXRlOiBEYXRlID0gbmV3IERhdGUoKTtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHVibGljIHVybDogc3RyaW5nLFxuICAgICAgICBwdWJsaWMgZmF2aWNvbjogRmF2aWNvbiB8IHVuZGVmaW5lZCAgPSB1bmRlZmluZWQsXG4gICAgICAgIHB1YmxpYyB0aXRsZTogc3RyaW5nIHwgdW5kZWZpbmVkICA9IHVuZGVmaW5lZCxcbiAgICAgICAgcHVibGljIG1ldGFkYXRhOiBQYWdlTWV0YWRhdGEgPSB7fSxcbiAgICApIHtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIaXN0b3J5Tm9kZSB7XG4gICAgcHVibGljIHRpbWVzdGFtcDogRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgcHVibGljIGRldmljZUlkOiBndWlkID0gZ2V0RGV2aWNlSWQoKTsgLy8gRGV2aWNlIElEIGZvciBtdWx0aS1kZXZpY2Ugc3VwcG9ydFxuICAgIHB1YmxpYyBpZDogZ3VpZDsgLy8gVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBoaXN0b3J5IG5vZGVcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwdWJsaWMgdGFiSWQ6IG51bWJlcixcbiAgICAgICAgcHVibGljIHVybDpzdHJpbmcsXG4gICAgICAgIHB1YmxpYyBuYXZpZ2F0aW9uU291cmNlSUQ6IEhpc3RvcnlOb2RlSWQgfCBudWxsID0gbnVsbCwgLy8gSUQgb2YgdGhlIG5vZGUgdGhhdCBsZWQgdG8gdGhpcyBuYXZpZ2F0aW9uXG4gICAgKSB7XG4gICAgICAgIHRoaXMuaWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpOyAvLyBFYWNoIG5vZGUgaGFzIGEgdW5pcXVlIElEXG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBIaXN0b3J5Tm9kZUlkID0gZ3VpZDtcblxuZXhwb3J0IHR5cGUgRmF2aWNvbiA9IHN0cmluZzsgLy8gVVJMIG9mIHRoZSBmYXZpY29uIGltYWdlIiwiaW1wb3J0IHsgSGlzdG9yeUVudHJ5IH0gZnJvbSAnLi9IaXN0b3J5RW50cnknO1xuaW1wb3J0IHsgSGlzdG9yeU5vZGUsIEhpc3RvcnlOb2RlSWQsIFBhZ2UgfSBmcm9tICcuL0hpc3RvcnlOb2RlJztcbmltcG9ydCB7IEhpc3RvcnlTZWFyY2hPcHRpb25zIH0gZnJvbSAnLi9IaXN0b3J5U2VhcmNoT3B0aW9ucyc7XG5pbXBvcnQgeyBJSGlzdG9yeVJlcG9zaXRvcnkgfSBmcm9tICcuL0lIaXN0b3J5UmVwb3NpdG9yeSc7XG5pbXBvcnQgeyBJUGFnZVJlcG9zaXRvcnkgfSBmcm9tICcuL0lQYWdlUmVwb3NpdG9yeSc7XG5cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U2VydmljZSB7XG4gICAgcHJpdmF0ZSBoaXN0b3J5UmVwbzogSUhpc3RvcnlSZXBvc2l0b3J5O1xuICAgIHByaXZhdGUgcGFnZVJlcG86IElQYWdlUmVwb3NpdG9yeTtcblxuICAgIC8vIFRyYWNrIHRoZSBsYXN0IG5vZGUgSUQgZm9yIGVhY2ggdGFiXG4gICAgcHJpdmF0ZSB0YWJOb2RlTWFwOiBSZWNvcmQ8bnVtYmVyLCBIaXN0b3J5Tm9kZUlkPiA9IHt9O1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGhpc3RvcnlSZXBvOiBJSGlzdG9yeVJlcG9zaXRvcnksXG4gICAgICAgIHBhZ2VSZXBvOiBJUGFnZVJlcG9zaXRvcnksXG4gICAgKSB7XG4gICAgICAgIHRoaXMuaGlzdG9yeVJlcG8gPSBoaXN0b3J5UmVwbztcbiAgICAgICAgdGhpcy5wYWdlUmVwbyA9IHBhZ2VSZXBvO1xuICAgIH1cblxuXG4gICAgYXN5bmMgb25UYWJVcGRhdGVkKGNoYW5nZUluZm86IGdsb2JhbFRoaXMuQnJvd3Nlci50YWJzLlRhYkNoYW5nZUluZm8sIHRhYjogZ2xvYmFsVGhpcy5Ccm93c2VyLnRhYnMuVGFiKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSB0YWIgaGFzIGEgVVJMIGFuZCBpcyBub3QgYSBzeXN0ZW0vaW50ZXJuYWwgcGFnZVxuICAgICAgICBpZiAoIXRhYi51cmwgfHwgdGhpcy5pc0ludGVybmFsVXJsKHRhYi51cmwpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKGBJZ25vcmluZyB0YWIgdXBkYXRlIGZvciBpbnRlcm5hbCBVUkw6ICR7dGFiLnVybH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhgVGFiIHVwZGF0ZWQ6ICR7dGFiLmlkfSAtICR7dGFiLnVybH1gLCBjaGFuZ2VJbmZvKTtcblxuICAgICAgICAvLyBHZXQgdGhlIGxhdGVzdCBmYXZpY29uIGFuZCB0aXRsZVxuICAgICAgICBjb25zdCBmYXZpY29uID0gY2hhbmdlSW5mby5mYXZJY29uVXJsO1xuXG4gICAgICAgIGlmIChmYXZpY29uKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUZhdmljb24odGFiLnVybCwgZmF2aWNvbik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0aXRsZSA9IGNoYW5nZUluZm8udGl0bGVcbiAgICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFVwZGF0aW5nIHRpdGxlIGZvciB0YWIgJHt0YWIuaWR9OiAke3RpdGxlfWApO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUaXRsZSh0YWIudXJsLCB0aXRsZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVUaXRsZSh1cmw6IHN0cmluZywgdGl0bGU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnBhZ2VSZXBvLmFkZE9yVXBkYXRlKG5ldyBQYWdlKHVybCwgdW5kZWZpbmVkLCB0aXRsZSkpXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgcGFnZSB0aXRsZTonLCBlcnJvcikpO1xuICAgIH1cblxuICAgIHVwZGF0ZUZhdmljb24odXJsOiBzdHJpbmcsIGZhdmljb246IHN0cmluZykge1xuICAgICAgICB0aGlzLnBhZ2VSZXBvLmFkZE9yVXBkYXRlKG5ldyBQYWdlKHVybCwgZmF2aWNvbikpXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgcGFnZSBmYXZpY29uOicsIGVycm9yKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgb25OYXZpZ2F0aW9uQ29tbWl0dGVkKGRldGFpbHM6IGdsb2JhbFRoaXMuQnJvd3Nlci53ZWJOYXZpZ2F0aW9uLldlYk5hdmlnYXRpb25UcmFuc2l0aW9uQ2FsbGJhY2tEZXRhaWxzKSB7XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIG1haW4gZnJhbWUgbmF2aWdhdGlvbnNcbiAgICAgICAgaWYgKGRldGFpbHMuZnJhbWVJZCAhPT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHRhYiA9IGF3YWl0IGJyb3dzZXIudGFicy5nZXQoZGV0YWlscy50YWJJZClcbiAgICAgICAgLy8gSGFuZGxlIHRoZSBuYXZpZ2F0aW9uIGV2ZW50XG4gICAgICAgIHRoaXMuaGFuZGxlTmF2aWdhdGlvbih7XG4gICAgICAgICAgICB1cmw6IGRldGFpbHMudXJsLFxuICAgICAgICAgICAgdGFiSWQ6IGRldGFpbHMudGFiSWQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICB0cmFuc2l0aW9uVHlwZTogZGV0YWlscy50cmFuc2l0aW9uVHlwZSxcbiAgICAgICAgICAgIHRpdGxlOiB0YWI/LnRpdGxlXG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIG5hdmlnYXRpb246JywgZXJyb3IpKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhIGJyb3dzZXIgbmF2aWdhdGlvbiBldmVudCBhbmQgcmVjb3JkIGluIGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyBoYW5kbGVOYXZpZ2F0aW9uKGRldGFpbHM6IHtcbiAgICAgICAgdXJsOiBzdHJpbmc7XG4gICAgICAgIHRhYklkOiBudW1iZXI7XG4gICAgICAgIHRpbWVzdGFtcDogbnVtYmVyO1xuICAgICAgICB0cmFuc2l0aW9uVHlwZT86IHN0cmluZztcbiAgICAgICAgdGl0bGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgdXJsLCB0YWJJZCwgdGltZXN0YW1wLCB0cmFuc2l0aW9uVHlwZSwgdGl0bGUgfSA9IGRldGFpbHM7XG4gICAgICAgIGlmICh0aGlzLmlzSW50ZXJuYWxVcmwodXJsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGFiTm9kZU1hcFt0YWJJZF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZSA9IGF3YWl0IHRoaXMuaGlzdG9yeVJlcG8uZ2V0KHRoaXMudGFiTm9kZU1hcFt0YWJJZF0pO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Tm9kZSAmJiBjdXJyZW50Tm9kZS51cmwudG9TdHJpbmcoKSA9PT0gdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTa2lwcGluZyBkdXBsaWNhdGUgbmF2aWdhdGlvbiB0bzogJHt1cmx9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHJhbnNpdGlvblR5cGUgPT09ICdiYWNrX2ZvcndhcmQnICYmIHRoaXMudGFiTm9kZU1hcFt0YWJJZF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZSA9IGF3YWl0IHRoaXMuaGlzdG9yeVJlcG8uZ2V0KHRoaXMudGFiTm9kZU1hcFt0YWJJZF0pO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Tm9kZSAmJiBjdXJyZW50Tm9kZS5uYXZpZ2F0aW9uU291cmNlSUQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWJOb2RlTWFwW3RhYklkXSA9IGN1cnJlbnROb2RlLm5hdmlnYXRpb25Tb3VyY2VJRDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEJhY2sgbmF2aWdhdGlvbiB0bzogJHtjdXJyZW50Tm9kZS5uYXZpZ2F0aW9uU291cmNlSUR9IGZvciAke3VybH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcGFyZW50SWQ6IEhpc3RvcnlOb2RlSWQgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnRhYk5vZGVNYXBbdGFiSWRdICYmXG4gICAgICAgICAgICAgICAgdHJhbnNpdGlvblR5cGUgJiZcbiAgICAgICAgICAgICAgICAhW1widHlwZWRcIiwgXCJhdXRvX2Jvb2ttYXJrXCIsIFwiZ2VuZXJhdGVkXCIsIFwic3RhcnRfcGFnZVwiLCBcInJlbG9hZFwiLCBcImJhY2tfZm9yd2FyZFwiXS5pbmNsdWRlcyh0cmFuc2l0aW9uVHlwZSkpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnRJZCA9IHRoaXMudGFiTm9kZU1hcFt0YWJJZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBuZXcgaGlzdG9yeSBub2RlXG4gICAgICAgICAgICBjb25zdCBub2RlID0gbmV3IEhpc3RvcnlOb2RlKHRhYklkLCB1cmwsIHBhcmVudElkID8/IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhpc3RvcnlSZXBvLmFkZChub2RlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlUGFnZU1ldGFkYXRhKHVybCwgdGl0bGUsIHRpbWVzdGFtcCk7XG4gICAgICAgICAgICB0aGlzLnRhYk5vZGVNYXBbdGFiSWRdID0gbm9kZS5pZDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBBZGRlZCBuYXZpZ2F0aW9uIG5vZGU6ICR7bm9kZS5pZH0gZm9yICR7dXJsfSAocGFyZW50OiAke3BhcmVudElkfSlgKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHByb2Nlc3NpbmcgbmF2aWdhdGlvbjonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaXNJbnRlcm5hbFVybCh1cmw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBpbnRlcm5hbFByb3RvY29scyA9IFsnY2hyb21lOicsICdjaHJvbWUtZXh0ZW5zaW9uOicsICdhYm91dDonLCAnbW96LWV4dGVuc2lvbjonXTtcbiAgICAgICAgcmV0dXJuIGludGVybmFsUHJvdG9jb2xzLnNvbWUocCA9PiB1cmwuc3RhcnRzV2l0aChwKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIFNQQSBuYXZpZ2F0aW9uIHRoYXQgb2NjdXJzIHdpdGhpbiBhIHBhZ2VcbiAgICAgKi9cbiAgICBhc3luYyBoYW5kbGVTcGFOYXZpZ2F0aW9uKGRldGFpbHM6IHtcbiAgICAgICAgdXJsOiBzdHJpbmc7XG4gICAgICAgIHRhYklkOiBudW1iZXI7XG4gICAgICAgIHRpdGxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU5hdmlnYXRpb24oe1xuICAgICAgICAgICAgLi4uZGV0YWlscyxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIHRyYW5zaXRpb25UeXBlOiAnbGluaycgLy8gVHJlYXQgU1BBIG5hdmlnYXRpb24gYXMgbGluayBuYXZpZ2F0aW9uXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRhYiB0cmFja2luZyB3aGVuIGEgdGFiIGlzIGNsb3NlZFxuICAgICAqL1xuICAgIG9uVGFiQ2xvc2VkKHRhYklkOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgZGVsZXRlIHRoaXMudGFiTm9kZU1hcFt0YWJJZF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGVscGVyIG1ldGhvZCB0byB1cGRhdGUgcGFnZSBtZXRhZGF0YVxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlUGFnZU1ldGFkYXRhKHVybDogc3RyaW5nLCB0aXRsZTogc3RyaW5nIHwgdW5kZWZpbmVkLCB0aW1lc3RhbXA6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHBhZ2UgPSBhd2FpdCB0aGlzLnBhZ2VSZXBvLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKHBhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgcGFnZVxuICAgICAgICAgICAgICAgIHBhZ2UubWV0YWRhdGEubGFzdFZpc2l0ZWQgPSB0aW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgcGFnZS5tZXRhZGF0YS52aXNpdENvdW50ID0gKHBhZ2UubWV0YWRhdGEudmlzaXRDb3VudCBhcyBudW1iZXIgfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgIGlmICh0aXRsZSAmJiAhcGFnZS50aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBwYWdlLnRpdGxlID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IHBhZ2VcbiAgICAgICAgICAgICAgICBwYWdlID0gbmV3IFBhZ2UodXJsLCB1bmRlZmluZWQsIHRpdGxlIHx8IHVuZGVmaW5lZCwge1xuICAgICAgICAgICAgICAgICAgICBsYXN0VmlzaXRlZDogdGltZXN0YW1wLFxuICAgICAgICAgICAgICAgICAgICB2aXNpdENvdW50OiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBhZ2VSZXBvLmFkZE9yVXBkYXRlKHBhZ2UpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciB1cGRhdGluZyBwYWdlIG1ldGFkYXRhIGZvciAke3VybH06YCwgZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZXRIaXN0b3J5RW50cmllcyhvcHRpb25zOiBIaXN0b3J5U2VhcmNoT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxIaXN0b3J5RW50cnlbXT4ge1xuICAgICAgICB2YXIgaGlzdG9yeSA9IGF3YWl0IHRoaXMuaGlzdG9yeVJlcG8uZ2V0QWxsKCk7XG4gICAgICAgIHZhciBwYWdlcyA9IGF3YWl0IHRoaXMucGFnZVJlcG8uZ2V0QWxsKCk7XG5cbiAgICAgICAgY29uc3QgZW50cmllczogSGlzdG9yeUVudHJ5W10gPSBoaXN0b3J5Lm1hcChub2RlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSBwYWdlcy5maW5kKHAgPT4gcC51cmwgPT09IG5vZGUudXJsKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgdXJsOiBub2RlLnVybCxcbiAgICAgICAgICAgICAgICB0aXRsZTogcGFnZT8udGl0bGUgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBmYXZpY29uOiBwYWdlPy5mYXZpY29uIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBub2RlLnRpbWVzdGFtcCxcbiAgICAgICAgICAgICAgICBwYXJlbnRJZDogbm9kZS5uYXZpZ2F0aW9uU291cmNlSUQgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBtZXRhZGF0YTogcGFnZT8ubWV0YWRhdGEgfHwge30sXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdIC8vIFBvcHVsYXRlIGNoaWxkcmVuIGlmIG5lZWRlZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlbnRyaWVzLmZpbHRlcihlbnRyeSA9PiB7XG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkgcXVlcnlcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnF1ZXJ5ICYmICFlbnRyeS51cmwuaW5jbHVkZXMob3B0aW9ucy5xdWVyeSkgJiYgIShlbnRyeS50aXRsZSAmJiBlbnRyeS50aXRsZS5pbmNsdWRlcyhvcHRpb25zLnF1ZXJ5KSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkgZGF0ZSByYW5nZVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc3RhcnREYXRlICYmIGVudHJ5LnRpbWVzdGFtcCA8IG9wdGlvbnMuc3RhcnREYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5kRGF0ZSAmJiBlbnRyeS50aW1lc3RhbXAgPiBvcHRpb25zLmVuZERhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSkuc2xpY2UoXG4gICAgICAgICAgICBvcHRpb25zLm9mZnNldCB8fCAwLFxuICAgICAgICAgICAgb3B0aW9ucy5saW1pdCA/IChvcHRpb25zLm9mZnNldCB8fCAwKSArIG9wdGlvbnMubGltaXQgOiB1bmRlZmluZWRcbiAgICAgICAgKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAvLyBTb3J0IGJ5IHRpbWVzdGFtcCBkZXNjZW5kaW5nXG4gICAgICAgICAgICByZXR1cm4gYi50aW1lc3RhbXAuZ2V0VGltZSgpIC0gYS50aW1lc3RhbXAuZ2V0VGltZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0iLCJleHBvcnQgY29uc3QgU1BBX1VSTF9DSEFOR0UgPSAnc3BhLXVybC1jaGFuZ2UnO1xuZXhwb3J0IGNvbnN0IFBBR0VfTUVUQURBVEFfRVhUUkFDVEVEID0gJ1BBR0VfTUVUQURBVEFfRVhUUkFDVEVEJzsiLCJpbXBvcnQgeyBpbml0aWFsaXplRGV2aWNlSUQgfSBmcm9tIFwiQC9saWIvSGlzdG9yeVRyZWUvRGV2aWNlSURcIjtcbmltcG9ydCB7IEhpc3RvcnlSZXBvc2l0b3J5SW5kZXhlZERCIH0gZnJvbSBcIkAvbGliL0hpc3RvcnlUcmVlL0hpc3RvcnlSZXBvc2l0b3J5SW5kZXhlZERCXCI7XG5pbXBvcnQgeyBQYWdlUmVwb3NpdG9yeUluZGV4ZWREQiB9IGZyb20gXCJAL2xpYi9IaXN0b3J5VHJlZS9QYWdlUmVwb3NpdG9yeUluZGV4ZWREQlwiO1xuaW1wb3J0IHsgSGlzdG9yeVNlcnZpY2UgfSBmcm9tIFwiQC9saWIvSGlzdG9yeVRyZWUvSGlzdG9yeVNlcnZpY2VcIjtcbmltcG9ydCB7IFNQQV9VUkxfQ0hBTkdFLCBQQUdFX01FVEFEQVRBX0VYVFJBQ1RFRCB9IGZyb20gXCJAL21lc3NhZ2VcIjtcbmltcG9ydCB7IFBhZ2UgfSBmcm9tIFwiQC9saWIvSGlzdG9yeVRyZWUvSGlzdG9yeU5vZGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCgoKSA9PiB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgaW5pdGlhbGl6ZURldmljZUlEKCk7XG4gICAgY29uc29sZS5sb2coJ2Jyb3dzZXIgaGlzdG9yeSBleHRlbnNpb24gc3RhcnRlZCcpO1xuXG4gICAgY29uc3QgcGFnZVJlcG9zaXRvcnkgPSBuZXcgUGFnZVJlcG9zaXRvcnlJbmRleGVkREIoKTtcbiAgICBjb25zdCBoaXN0b3J5UmVwb3NpdG9yeSA9IG5ldyBIaXN0b3J5UmVwb3NpdG9yeUluZGV4ZWREQigpO1xuICAgIFxuICAgIGNvbnN0IHBhZ2VzID0gYXdhaXQgcGFnZVJlcG9zaXRvcnkuZ2V0QWxsKCk7XG4gICAgY29uc29sZS5sb2coYEZvdW5kICR7cGFnZXMubGVuZ3RofSBwYWdlcyBpbiB0aGUgcmVwb3NpdG9yeS5gKTtcblxuICAgIGNvbnN0IGhpc3RvcmllcyA9IGF3YWl0IGhpc3RvcnlSZXBvc2l0b3J5LmdldEFsbCgpO1xuICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2hpc3Rvcmllcy5sZW5ndGh9IGhpc3Rvcnkgbm9kZXMgaW4gdGhlIHJlcG9zaXRvcnkuYCk7XG5cblxuICAgIC8vIENyZWF0ZSB0aGUgaGlzdG9yeSBzZXJ2aWNlXG4gICAgY29uc3QgaGlzdG9yeVNlcnZpY2UgPSBuZXcgSGlzdG9yeVNlcnZpY2UoaGlzdG9yeVJlcG9zaXRvcnksIHBhZ2VSZXBvc2l0b3J5KTtcblxuICAgIC8vIENsZWFuIHVwIHdoZW4gdGFicyBhcmUgY2xvc2VkXG4gICAgYnJvd3Nlci50YWJzLm9uUmVtb3ZlZC5hZGRMaXN0ZW5lcigodGFiSWQpID0+IHtcbiAgICAgIGhpc3RvcnlTZXJ2aWNlLm9uVGFiQ2xvc2VkKHRhYklkKTtcbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSBzdGFuZGFyZCBuYXZpZ2F0aW9uIGV2ZW50c1xuICAgIGJyb3dzZXIud2ViTmF2aWdhdGlvbi5vbkNvbW1pdHRlZC5hZGRMaXN0ZW5lcihhc3luYyAoZGV0YWlscykgPT4ge1xuICAgICAgLy8gT25seSBoYW5kbGUgbWFpbiBmcmFtZSBuYXZpZ2F0aW9uc1xuICAgICAgaWYgKGRldGFpbHMuZnJhbWVJZCAhPT0gMCkgcmV0dXJuO1xuICAgICAgYXdhaXQgaGlzdG9yeVNlcnZpY2Uub25OYXZpZ2F0aW9uQ29tbWl0dGVkKGRldGFpbHMpO1xuICAgIH0pO1xuXG4gICAgYnJvd3Nlci50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcihhc3luYyAodGFiSWQsIGNoYW5nZUluZm8sIHRhYikgPT4ge1xuICAgICAgYXdhaXQgaGlzdG9yeVNlcnZpY2Uub25UYWJVcGRhdGVkKGNoYW5nZUluZm8sIHRhYik7XG4gICAgfSk7XG5cblxuICAgIC8vIEhhbmRsZSBTUEEgbmF2aWdhdGlvbiBldmVudHMgZnJvbSBjb250ZW50IHNjcmlwdFxuICAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoYXN5bmMgKG1lc3NhZ2UsIHNlbmRlcikgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gU1BBX1VSTF9DSEFOR0UgJiYgc2VuZGVyLnRhYj8uaWQpIHtcbiAgICAgICAgYXdhaXQgaGlzdG9yeVNlcnZpY2UuaGFuZGxlU3BhTmF2aWdhdGlvbih7XG4gICAgICAgICAgdXJsOiBtZXNzYWdlLnVybCxcbiAgICAgICAgICB0YWJJZDogc2VuZGVyLnRhYi5pZCxcbiAgICAgICAgICB0aXRsZTogc2VuZGVyLnRhYi50aXRsZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSGFuZGxlIG1ldGFkYXRhIGV4dHJhY3Rpb24gZnJvbSBjb250ZW50IHNjcmlwdFxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gUEFHRV9NRVRBREFUQV9FWFRSQUNURUQpIHtcbiAgICAgICAgY29uc3QgeyB1cmwsIHRpdGxlLCBtZXRhZGF0YSwgdGltZXN0YW1wIH0gPSBtZXNzYWdlLnBheWxvYWQ7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBtZXRhZGF0YSBmb3InLCB1cmwsIG1ldGFkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gR2V0IGV4aXN0aW5nIHBhZ2Ugb3IgY3JlYXRlIG5ldyBvbmVcbiAgICAgICAgICBsZXQgcGFnZSA9IGF3YWl0IHBhZ2VSZXBvc2l0b3J5LmdldCh1cmwpO1xuICAgICAgICAgIGlmIChwYWdlKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgcGFnZSB3aXRoIG5ldyBtZXRhZGF0YVxuICAgICAgICAgICAgcGFnZS5tZXRhZGF0YSA9IHsgLi4ucGFnZS5tZXRhZGF0YSwgLi4ubWV0YWRhdGEgfTtcbiAgICAgICAgICAgIGlmICh0aXRsZSAmJiAhcGFnZS50aXRsZSkge1xuICAgICAgICAgICAgICBwYWdlLnRpdGxlID0gdGl0bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYWdlLmxhc3RVcGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IHBhZ2Ugd2l0aCBtZXRhZGF0YVxuICAgICAgICAgICAgcGFnZSA9IG5ldyBQYWdlKHVybCwgdW5kZWZpbmVkLCB0aXRsZSwge1xuICAgICAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICAgICAgbWV0YWRhdGFFeHRyYWN0ZWQ6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgICAgbGFzdFZpc2l0ZWQ6IHRpbWVzdGFtcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGF3YWl0IHBhZ2VSZXBvc2l0b3J5LmFkZE9yVXBkYXRlKHBhZ2UpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdVcGRhdGVkIHBhZ2UgbWV0YWRhdGEgZm9yJywgdXJsKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBwYWdlIG1ldGFkYXRhOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9KSgpO1xufSk7XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJfYnJvd3NlciIsIl9hIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8s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SUFDRSxZQUFZLEtBQUs7QUFDZixZQUFNLE1BQU0scUVBQXFFO0FBQUEsSUFDckY7QUFBQSxJQUNFLFdBQVcsS0FBSztBQUNkLFlBQU0sTUFBTSxvRUFBb0U7QUFBQSxJQUNwRjtBQUFBLElBQ0UsV0FBVyxLQUFLO0FBQ2QsWUFBTSxNQUFNLG9FQUFvRTtBQUFBLElBQ3BGO0FBQUEsSUFDRSxzQkFBc0IsU0FBUztBQUM3QixZQUFNLFVBQVUsS0FBSyxlQUFlLE9BQU87QUFDM0MsWUFBTSxnQkFBZ0IsUUFBUSxRQUFRLFNBQVMsSUFBSTtBQUNuRCxhQUFPLE9BQU8sSUFBSSxhQUFhLEdBQUc7QUFBQSxJQUN0QztBQUFBLElBQ0UsZUFBZSxRQUFRO0FBQ3JCLGFBQU8sT0FBTyxRQUFRLHVCQUF1QixNQUFNO0FBQUEsSUFDdkQ7QUFBQSxFQUNBO0FBQ0EsTUFBSSxlQUFlO0FBQ25CLGVBQWEsWUFBWSxDQUFDLFFBQVEsU0FBUyxRQUFRLE9BQU8sS0FBSztBQUMvRCxNQUFJLHNCQUFzQixjQUFjLE1BQU07QUFBQSxJQUM1QyxZQUFZLGNBQWMsUUFBUTtBQUNoQyxZQUFNLDBCQUEwQixZQUFZLE1BQU0sTUFBTSxFQUFFO0FBQUEsSUFDOUQ7QUFBQSxFQUNBO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksQ0FBQyxhQUFhLFVBQVUsU0FBUyxRQUFRLEtBQUssYUFBYTtBQUM3RCxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQSxHQUFHLFFBQVEsMEJBQTBCLGFBQWEsVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLE1BQzVFO0FBQUEsRUFDQTtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLFNBQVMsU0FBUyxHQUFHO0FBQ3ZCLFlBQU0sSUFBSSxvQkFBb0IsY0FBYyxnQ0FBZ0M7QUFDOUUsUUFBSSxTQUFTLFNBQVMsR0FBRyxLQUFLLFNBQVMsU0FBUyxLQUFLLENBQUMsU0FBUyxXQUFXLElBQUk7QUFDNUUsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxNQUNOO0FBQUEsRUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMTJdfQ==
