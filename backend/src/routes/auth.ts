import { Hono, type Context } from "hono";
import "../types/hono.d.ts";
import type { Database } from "../database/database.ts";
import type { Device } from "../types/index.ts";
import { EnvironmentConfig } from "../config/environment.ts";

// Simple JWT creation and verification using Web Crypto API
async function createSimpleJWT(
  payload: Record<string, string | number>,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encoder = new TextEncoder();

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/[+/]/g, (c) => c === "+" ? "-" : "_")
    .replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/[+/]/g, (c) => c === "+" ? "-" : "_")
    .replace(/=/g, "");

  const message = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  const signatureB64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/[+/]/g, (c) => c === "+" ? "-" : "_")
    .replace(/=/g, "");

  return `${message}.${signatureB64}`;
}

async function verifySimpleJWT(
  token: string,
  secret: string,
): Promise<Record<string, string | number> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signature = Uint8Array.from(
      atob(signatureB64.replace(/[-_]/g, (c) => c === "-" ? "+" : "/")),
      (c) => c.charCodeAt(0),
    );
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(message),
    );

    if (!isValid) return null;

    // Decode payload
    const payload = JSON.parse(
      atob(payloadB64.replace(/[-_]/g, (c) => c === "-" ? "+" : "/")),
    );

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function authRoutes(db: Database) {
  const app = new Hono();

  // Register a new device
  app.post("/register-device", async (c) => {
    try {
      const body = await c.req.json();
      const { deviceName, publicKey, secret } = body;

      // Verify shared secret
      const sharedSecret = EnvironmentConfig.get("SHARED_SECRET");
      if (secret !== sharedSecret) {
        console.debug("Got ", secret, " expected ", sharedSecret);
        return c.json({ error: "Invalid shared secret" }, 401);
      }

      if (!deviceName || !publicKey) {
        return c.json(
          { error: "Device name and public key are required" },
          400,
        );
      }

      // Generate device ID
      const deviceId = crypto.randomUUID();
      const now = Date.now();

      const device: Device = {
        deviceId,
        deviceName,
        publicKey,
        createdAt: now,
        lastSeen: now,
      };

      // Register device in database
      console.log("Registering device:", device);
      db.registerDevice(device);
      console.log("Device registered successfully");

      // Generate JWT token
      console.log("Creating JWT token for device:", deviceId);
      const token = await createSimpleJWT({
        deviceId,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iat: Math.floor(Date.now() / 1000),
      }, EnvironmentConfig.get("JWT_SECRET"));
      console.log("JWT token created successfully");

      return c.json({
        deviceId,
        token,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      });
    } catch (error) {
      console.error("Device registration error:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
        console.error("Error message:", error.message);
        return c.json({
          error: "Registration failed",
          details: error.message,
          type: error.constructor.name,
        }, 500);
      } else {
        console.error("Unknown error type:", typeof error);
        return c.json({
          error: "Registration failed",
          details: "Unknown error occurred",
          type: "UnknownError",
        }, 500);
      }
    }
  });

  // Refresh token
  app.post("/refresh-token", async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return c.json(
          { error: "Missing or invalid authorization header" },
          401,
        );
      }

      const token = authHeader.slice(7);
      const payload = await verifySimpleJWT(token, EnvironmentConfig.get("JWT_SECRET"));

      if (!payload || !payload.deviceId) {
        return c.json({ error: "Invalid token" }, 401);
      }

      // Verify device exists
      const device = db.getDevice(payload.deviceId as string);
      if (!device) {
        return c.json({ error: "Device not found" }, 404);
      }

      // Update last seen
      db.updateDeviceLastSeen(payload.deviceId as string);

      // Generate new token
      const newToken = await createSimpleJWT({
        deviceId: payload.deviceId as string,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iat: Math.floor(Date.now() / 1000),
      }, EnvironmentConfig.get("JWT_SECRET"));

      return c.json({
        token: newToken,
        expiresIn: 24 * 60 * 60,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      return c.json({ error: "Token refresh failed" }, 401);
    }
  });

  return app;
}

// Middleware to verify JWT tokens
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        { error: "Missing or invalid authorization header" },
        401,
      );
    }

    const token = authHeader.slice(7);
    const payload = await verifySimpleJWT(token, EnvironmentConfig.get("JWT_SECRET"));

    if (!payload || !payload.deviceId) {
      return c.json({ error: "Authentication failed" }, 401);
    }

    // Add device info to context
    c.set("deviceId", payload.deviceId as string);
    c.set("authPayload", payload as { deviceId: string; exp: number; iat: number; });

    await next();
  } catch (error) {
    console.error("Authentication failed:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}
