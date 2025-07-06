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
import { sseRoutes, SSEManager } from "./routes/sse.ts";
import { Database } from "./database/database.ts";

// Now initialize environment configuration after all imports and .env loading
EnvironmentConfig.initialize();

const app = new Hono();
const db = new Database();
const sseManager = new SSEManager();

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
app.route("/sync", syncRoutes(db, sseManager));
app.route("/history", historyRoutes(db));
app.route("/devices", devicesRoutes(db));
app.route("/sse", sseRoutes(db, sseManager));

// Start server
const port = EnvironmentConfig.get("PORT");
const host = EnvironmentConfig.get("HOST");

console.log(`🚀 History sync server starting on ${host}:${port}`);
console.log(`📡 SSE endpoint available at http://${host}:${port}/sse/events`);

// Log the configuration (excluding secrets)
EnvironmentConfig.logConfiguration();

// Simple HTTP server - no WebSocket complexity needed
Deno.serve({
  port,
  hostname: host,
}, app.fetch);

console.log("Server is ready and listening for HTTP requests including SSE");

// Cleanup on shutdown
globalThis.addEventListener("beforeunload", () => {
  sseManager.cleanup();
  db.close();
});
