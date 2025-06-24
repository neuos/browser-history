// Hono context extensions
import "hono";

declare module "hono" {
  interface ContextVariableMap {
    deviceId: string;
    authPayload: {
      deviceId: string;
      exp: number;
      iat: number;
    };
  }
}
