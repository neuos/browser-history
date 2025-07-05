/**
 * Type definitions for environment variable configuration.
 * This file defines the interfaces and types used for environment variable definitions.
 */

// Base interface for environment definitions
interface BaseEnvVar {
  isSecret?: boolean; // Optional, defaults to false
  group: string; // category for grouping in documentation
}

// Required environment variable (no default, must have example)
interface RequiredEnvVar extends BaseEnvVar {
  default?: undefined;
  example: string;
}

// Optional environment variable (must have default, example is optional)
interface OptionalEnvVar extends BaseEnvVar {
  default: string;
  example?: string;
}

export type EnvVar = RequiredEnvVar | OptionalEnvVar;
