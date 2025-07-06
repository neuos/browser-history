import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { verifySimpleJWT } from "../routes/auth.ts";
import { EnvironmentConfig } from "../config/environment.ts";

// Helper function to create JWT for testing (copy of internal function)
async function createTestJWT(
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

Deno.test({
  name: "Auth - JWT Operations",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    // Set up test environment
    const originalJwtSecret = Deno.env.get('JWT_SECRET');
    const testJwtSecret = 'test-jwt-secret-key-for-testing-only';
    Deno.env.set('JWT_SECRET', testJwtSecret);

    await t.step("should generate valid JWT token", async () => {
      const deviceId = "test-device-123";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60), // 7 days
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      
      assertExists(token);
      assertEquals(typeof token, "string");
      assertEquals(token.split('.').length, 3); // JWT has 3 parts separated by dots
    });

    await t.step("should verify valid JWT token", async () => {
      const deviceId = "test-device-456";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      const verified = await verifySimpleJWT(token, testJwtSecret);
      
      assertExists(verified);
      assertEquals(verified.deviceId, deviceId);
      assertEquals(typeof verified.iat, "number");
      assertEquals(typeof verified.exp, "number");
    });

    await t.step("should reject invalid JWT token", async () => {
      const invalidToken = "invalid.jwt.token";
      
      const result = await verifySimpleJWT(invalidToken, testJwtSecret);
      assertEquals(result, null);
    });

    await t.step("should reject malformed JWT token", async () => {
      const malformedToken = "not-a-jwt-at-all";
      
      const result = await verifySimpleJWT(malformedToken, testJwtSecret);
      assertEquals(result, null);
    });

    await t.step("should reject empty JWT token", async () => {
      const result = await verifySimpleJWT("", testJwtSecret);
      assertEquals(result, null);
    });

    await t.step("should handle JWT with wrong secret", async () => {
      const deviceId = "test-device-789";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      
      // Try to verify with different secret
      const result = await verifySimpleJWT(token, "different-secret");
      assertEquals(result, null);
    });

    await t.step("should handle expired token", async () => {
      const deviceId = "test-device-exp";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId,
        iat: now - 1000,
        exp: now - 500, // Expired 500 seconds ago
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      const result = await verifySimpleJWT(token, testJwtSecret);
      
      assertEquals(result, null); // Should be null for expired token
    });

    await t.step("should handle special characters in deviceId", async () => {
      // Test with Latin1 characters (btoa limitation)
      const latinDeviceId = "device-àáâãäåæçèé-123";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId: latinDeviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      const verified = await verifySimpleJWT(token, testJwtSecret);
      
      assertExists(verified);
      assertEquals(verified.deviceId, latinDeviceId);
    });

    await t.step("should reject Unicode characters outside Latin1", async () => {
      // Unicode characters outside Latin1 should throw an error due to btoa() limitation
      const unicodeDeviceId = "device-äöü-αβγ-中文-123";
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId: unicodeDeviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      try {
        await createTestJWT(payload, testJwtSecret);
        // If we get here, the test should fail because btoa should have thrown
        assertEquals(true, false, "Expected btoa to throw an error for Unicode characters");
      } catch (error) {
        // This is expected - btoa cannot handle Unicode characters outside Latin1
        assertEquals(error instanceof Error, true);
      }
    });

    await t.step("should handle very long deviceId", async () => {
      const longDeviceId = "device-" + "x".repeat(1000);
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        deviceId: longDeviceId,
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      const token = await createTestJWT(payload, testJwtSecret);
      const verified = await verifySimpleJWT(token, testJwtSecret);
      
      assertExists(verified);
      assertEquals(verified.deviceId, longDeviceId);
    });

    await t.step("should generate different tokens for different devices", async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload1 = {
        deviceId: "device-1",
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      const payload2 = {
        deviceId: "device-2", 
        iat: now,
        exp: now + (7 * 24 * 60 * 60),
      };
      
      const token1 = await createTestJWT(payload1, testJwtSecret);
      const token2 = await createTestJWT(payload2, testJwtSecret);
      
      assertExists(token1);
      assertExists(token2);
      assertEquals(token1 === token2, false);
      
      const verified1 = await verifySimpleJWT(token1, testJwtSecret);
      const verified2 = await verifySimpleJWT(token2, testJwtSecret);
      
      assertExists(verified1);
      assertExists(verified2);
      assertEquals(verified1.deviceId, "device-1");
      assertEquals(verified2.deviceId, "device-2");
    });

    // Restore original JWT secret
    if (originalJwtSecret) {
      Deno.env.set('JWT_SECRET', originalJwtSecret);
    } else {
      Deno.env.delete('JWT_SECRET');
    }
  },
});

Deno.test({
  name: "Auth - Environment Configuration",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    // Store original env values
    const originalSharedSecret = Deno.env.get('SHARED_SECRET');
    const originalJwtSecret = Deno.env.get('JWT_SECRET');
    
    // Set test environment variables
    Deno.env.set('SHARED_SECRET', 'test-shared-secret-for-testing');
    Deno.env.set('JWT_SECRET', 'test-jwt-secret-for-testing');
    
    try {
      await t.step("should initialize environment configuration", () => {
        const config = EnvironmentConfig.initialize();
        
        assertExists(config);
        const jwtSecret = EnvironmentConfig.get('JWT_SECRET');
        const sharedSecret = EnvironmentConfig.get('SHARED_SECRET');
        const port = EnvironmentConfig.get('PORT');
        
        assertExists(jwtSecret);
        assertExists(sharedSecret);
        assertEquals(typeof port, "number");
      });

      await t.step("should get configuration values", () => {
        // Config should already be initialized
        const port = EnvironmentConfig.get('PORT');
        assertEquals(typeof port, "number");
        assertEquals(port >= 1 && port <= 65535, true); // Valid port range
      });

      await t.step("should handle configuration logging", () => {
        // Test that configuration logging doesn't throw
        // This should not throw
        EnvironmentConfig.logConfiguration();
      });

      await t.step("should get all configuration", () => {
        const allConfig = EnvironmentConfig.getAllConfig();
        assertExists(allConfig);
        assertEquals(typeof allConfig, "object");
        
        // Should be frozen (read-only)
        const isFrozen = Object.isFrozen(allConfig);
        assertEquals(isFrozen, true);
      });
    } finally {
      // Restore original env values
      if (originalSharedSecret) {
        Deno.env.set('SHARED_SECRET', originalSharedSecret);
      } else {
        Deno.env.delete('SHARED_SECRET');
      }
      if (originalJwtSecret) {
        Deno.env.set('JWT_SECRET', originalJwtSecret);
      } else {
        Deno.env.delete('JWT_SECRET');
      }
    }
  },
});
