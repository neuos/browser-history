import { Hono } from "hono";
import "../types/hono.d.ts";
import type { Database } from "../database/database.ts";
import { authMiddleware } from "./auth.ts";

export function historyRoutes(db: Database) {
  const app = new Hono();

  // Apply auth middleware
  app.use("*", authMiddleware);

  // Get history entries
  app.get("/", (c) => {
    try {
      const _deviceId = c.get("deviceId") as string;
      const limit = parseInt(c.req.query("limit") || "100");
      const offset = parseInt(c.req.query("offset") || "0");
      const filterDevice = c.req.query("device_id");

      const historyNodes = db.getHistoryNodes(
        filterDevice || undefined,
        Math.min(limit, 1000), // Cap at 1000
        offset,
      );

      // Get page data for each history node
      const urls = [...new Set(historyNodes.map((node) => node.url))];
      const pages = db.getPages(urls);
      const pageMap = new Map(pages.map((page) => [page.url, page]));

      // Combine history and page data
      const entries = historyNodes.map((node) => ({
        id: node.id,
        url: node.url,
        title: pageMap.get(node.url)?.title || null,
        favicon: pageMap.get(node.url)?.favicon || null,
        timestamp: new Date(node.timestamp),
        parentId: node.navigationSourceId || null,
        metadata: pageMap.get(node.url)?.metadata || {},
        deviceId: node.deviceId,
      }));

      return c.json({ entries, total: entries.length });
    } catch (error) {
      console.error("Get history error:", error);
      return c.json({ error: "Failed to fetch history" }, 500);
    }
  });

  return app;
}
