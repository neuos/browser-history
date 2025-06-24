import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import "./types/hono.d.ts";
import { authRoutes } from "./routes/auth.ts";
import { syncRoutes } from "./routes/sync.ts";
import { historyRoutes } from "./routes/history.ts";
import { devicesRoutes } from "./routes/devices.ts";
import { Database } from "./database/database.ts";
import { WebSocketManager } from "./websocket/manager.ts";

const app = new Hono();
const db = new Database();
const wsManager = new WebSocketManager();

// Initialize database
db.init();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: Deno.env.get("CORS_ORIGIN") || "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes
app.route("/auth", authRoutes(db));
app.route("/sync", syncRoutes(db, wsManager));
app.route("/history", historyRoutes(db));
app.route("/devices", devicesRoutes(db));

// WebSocket endpoint
app.get("/ws", (c) => {
  const upgrade = c.req.header("upgrade");
  if (upgrade !== "websocket") {
    return c.text("Expected websocket", 400);
  }

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);
  wsManager.handleConnection(socket);

  return response;
});

// Start server
const port = parseInt(Deno.env.get("PORT") || "8000");
const host = Deno.env.get("HOST") || "0.0.0.0";

console.log(`🚀 History sync server starting on ${host}:${port}`);

Deno.serve({ port, hostname: host }, app.fetch);
