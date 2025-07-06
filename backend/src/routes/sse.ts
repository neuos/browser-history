import { Hono } from "hono";
import { streamSSE } from "jsr:@hono/hono/streaming";
import "../types/hono.d.ts";
import type { Database } from "../database/database.ts";
import { authMiddleware, verifySimpleJWT } from "./auth.ts";
import { EnvironmentConfig } from "../config/environment.ts";

interface SSEConnection {
  deviceId: string;
  stream: any; // The SSE stream object
  lastPing: number;
  closePromiseResolve?: () => void; // Function to resolve the promise and close the stream
}

export class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private pingInterval: number;

  constructor() {
    // Ping connected clients every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingAllConnections();
    }, 30000);
  }

  addConnection(deviceId: string, stream: any) {
    // Remove any existing connection for this device
    this.removeConnection(deviceId);
    
    this.connections.set(deviceId, {
      deviceId,
      stream,
      lastPing: Date.now(),
    });
    
    console.log(`SSE connection added for device: ${deviceId}`);
    
    // Don't send initial message immediately - let the stream establish first
    // The connection confirmation will be sent via the first ping
  }

  removeConnection(deviceId: string) {
    const connection = this.connections.get(deviceId);
    if (connection) {
      try {
        // Close the stream if it has a close method
        if (connection.stream && typeof connection.stream.close === 'function') {
          connection.stream.close();
        }
        // Resolve the promise to end the stream function
        if (connection.closePromiseResolve) {
          connection.closePromiseResolve();
        }
      } catch (error) {
        // Connection might already be closed
        console.log(`Error closing SSE connection for ${deviceId}:`, error);
      }
      this.connections.delete(deviceId);
      console.log(`SSE connection removed for device: ${deviceId}`);
    }
  }

  broadcastToOthers(excludeDeviceId: string, message: any) {
    for (const [deviceId, connection] of this.connections) {
      if (deviceId !== excludeDeviceId) {
        try {
          connection.stream.writeSSE({
            data: JSON.stringify(message)
          });
          connection.lastPing = Date.now();
        } catch (error) {
          console.error(`Failed to send SSE message to device ${deviceId}:`, error);
          this.removeConnection(deviceId);
        }
      }
    }
  }

  sendToDevice(deviceId: string, message: any) {
    const connection = this.connections.get(deviceId);
    if (connection) {
      try {
        connection.stream.writeSSE({
          data: JSON.stringify(message)
        });
        connection.lastPing = Date.now();
        return true;
      } catch (error) {
        console.error(`Failed to send SSE message to device ${deviceId}:`, error);
        this.removeConnection(deviceId);
        return false;
      }
    }
    return false;
  }

  private pingAllConnections() {
    const now = Date.now();
    const staleThreshold = 2 * 60 * 1000; // 2 minutes

    for (const [deviceId, connection] of this.connections) {
      try {
        // Send ping
        connection.stream.writeSSE({
          data: JSON.stringify({
            type: "ping",
            timestamp: now
          })
        });
        
        // Check if connection is stale
        if (now - connection.lastPing > staleThreshold) {
          console.log(`Removing stale SSE connection for device: ${deviceId}`);
          this.removeConnection(deviceId);
        }
      } catch (error) {
        console.error(`Failed to ping SSE device ${deviceId}:`, error);
        this.removeConnection(deviceId);
      }
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys());
  }

  cleanup() {
    clearInterval(this.pingInterval);
    for (const deviceId of this.connections.keys()) {
      this.removeConnection(deviceId);
    }
  }
}

export function sseRoutes(db: Database, sseManager: SSEManager) {
  const app = new Hono();

  // SSE endpoint with authentication - supports both header and query param auth
  app.get("/events", async (c, next) => {
    // Try auth header first
    const authHeader = c.req.header("Authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    // If no auth header, try query parameter (for EventSource compatibility)
    if (!token) {
      token = c.req.query("token") || null;
    }
    
    if (!token) {
      return c.json(
        { error: "Missing authorization token" },
        401,
      );
    }

    // Verify token manually since we can't use authMiddleware with query params
    try {
      const payload = await verifySimpleJWT(token, EnvironmentConfig.get("JWT_SECRET"));
      
      if (!payload || !payload.deviceId) {
        return c.json({ error: "Authentication failed" }, 401);
      }

      // Add device info to context
      c.set("deviceId", payload.deviceId as string);
      c.set("authPayload", payload as { deviceId: string; exp: number; iat: number; });
      
      await next();
    } catch (error) {
      console.error("SSE Authentication failed:", error);
      return c.json({ error: "Authentication failed" }, 401);
    }
  }, (c) => {
    const deviceId = c.get("deviceId") as string;
    
    return streamSSE(c, async (stream) => {
      console.log(`SSE stream started for device: ${deviceId}`);
      
      // Add this connection to the manager
      sseManager.addConnection(deviceId, stream);
      
      // Send initial connection confirmation
      try {
        stream.writeSSE({
          data: JSON.stringify({
            type: "connected",
            data: { deviceId, timestamp: Date.now() }
          })
        });
      } catch (error) {
        console.error(`Failed to send initial SSE message to device ${deviceId}:`, error);
      }
      
      // Set up cleanup when connection closes
      c.req.raw.signal?.addEventListener("abort", () => {
        console.log(`SSE stream aborted for device: ${deviceId}`);
        sseManager.removeConnection(deviceId);
      });
      
      // Keep the stream open by waiting indefinitely
      // The connection will be managed by the SSEManager
      await new Promise<void>((resolve) => {
        // Store the resolve function so we can call it when we want to close
        const connection = sseManager.connections.get(deviceId);
        if (connection) {
          (connection as any).closePromiseResolve = resolve;
        }
      });
    });
  });

  return app;
}
