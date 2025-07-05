import type { EnvVar as _EnvVar } from "./env-types.ts";

/**
 * Central definition of all environment variables with their configuration.
 * Each variable must specify:
 * - group: Category for documentation grouping
 * - type: Expected type ('string' | 'number' | 'boolean'), defaults to 'string'
 * - For required vars: example must be provided
 * - For optional vars: default must be provided, example is optional
 * - isSecret: Optional, defaults to false
 */
export const ENV_DEFINITIONS = {
  // Required secrets (no defaults for security)
  SHARED_SECRET: {
    group: "Security",
    type: "string",
    example: "your-super-secret-key-for-device-registration",
    isSecret: true,
  },
  JWT_SECRET: {
    group: "Security",
    type: "string",
    example: "your-jwt-signing-secret-key",
    isSecret: true,
  },

  // Server configuration with defaults
  HOST: {
    group: "Server",
    type: "string",
    default: "0.0.0.0",
  },
  PORT: {
    group: "Server",
    type: "number",
    default: "8000",
  },
  CORS_ORIGIN: {
    group: "Server",
    type: "string",
    default: "*",
    example: "https://yourdomain.com",
  },

  // Database configuration
  DATABASE_PATH: {
    group: "Database",
    type: "string",
    default: "./data/history.db",
  },
} as const satisfies Record<string, _EnvVar>;
