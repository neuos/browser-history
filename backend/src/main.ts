import { load } from "@std/dotenv";
import { Hono } from "hono";
import { cors } from "jsr:@hono/hono/cors";
import { logger } from "jsr:@hono/hono/logger";

// Load environment variables from .env file FIRST
await load({ export: true });

// Import environment configuration (but don't instantiate yet)
import { EnvironmentConfig } from "./config/environment.ts";

import "./types/hono.d.ts";
import { authRoutes } from "./routes/auth.ts";
import { syncRoutes } from "./routes/sync.ts";
import { historyRoutes } from "./routes/history.ts";
import { devicesRoutes } from "./routes/devices.ts";
import { Database } from "./database/database.ts";
import { WebSocketManager } from "./websocket/manager.ts";

// Now initialize environment configuration after all imports and .env loading
EnvironmentConfig.initialize();

const app = new Hono();
const db = new Database();
const wsManager = new WebSocketManager();

// Initialize database
db.init();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: EnvironmentConfig.get("CORS_ORIGIN"),
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

// Start server with hybrid WebSocket/HTTP handling
const port = EnvironmentConfig.get("PORT");
const host = EnvironmentConfig.get("HOST");

console.log(`🚀 History sync server starting on ${host}:${port}`);
console.log(`📡 WebSocket endpoint available at ws://${host}:${port}/ws`);

// Log the configuration (excluding secrets)
EnvironmentConfig.logConfiguration();

// Create a hybrid handler that handles WebSocket upgrades and delegates HTTP to Hono
// Note: Hono's upgradeWebSocket helper is not compatible with Deno.serve, so we handle
// WebSocket upgrades manually and delegate other requests to Hono for full compatibility
Deno.serve({
  port,
  hostname: host,
}, (req) => {
  const url = new URL(req.url);
  
  // Handle WebSocket upgrade requests directly (bypassing Hono for WebSocket)
  if (url.pathname === "/ws") {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    console.log("✅ WebSocket upgrade successful");
    
    // Let the WebSocketManager handle all events
    wsManager.handleConnection(socket);

    return response;
  }

  // For all other routes, delegate to Hono
  return app.fetch(req);
});

console.log("Server is ready and listening for WebSocket connections");
