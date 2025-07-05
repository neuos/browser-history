/**
 * Environment variable definitions with types, defaults, examples, and grouping.
 * This file centralizes all environment variable configuration.
 */

import type { EnvVar } from './env-types.ts';

/**
 * Central definition of all environment variables with their configuration.
 * Each variable must specify:
 * - group: Category for documentation grouping
 * - For required vars: example (no default allowed)
 * - For optional vars: default (example is optional)
 * - isSecret: Optional, defaults to false
 */
export const ENV_DEFINITIONS: Record<string, EnvVar> = {
  // Required secrets (no defaults for security)
  SHARED_SECRET: { 
    group: "Security",
    example: "your-super-secret-key-for-device-registration",
    isSecret: true
  },
  JWT_SECRET: { 
    group: "Security",
    example: "your-jwt-signing-secret-key",
    isSecret: true
  },
  
  // Server configuration with defaults
  PORT: { 
    group: "Server",
    default: "8000"
  },
  HOST: { 
    group: "Server",
    default: "0.0.0.0"
  },
  CORS_ORIGIN: { 
    group: "Server",
    default: "*",
    example: "https://yourdomain.com"
  },
  
  // Database configuration
  DATABASE_PATH: { 
    group: "Database",
    default: "./data/history.db"
  },
  
  // Logging configuration
  LOG_LEVEL: {
    group: "Logging",
    default: "info",
    example: "debug"
  },
};
