/**
 * Type definitions for environment variable configuration.
 * This file defines the interfaces and types used for environment variable definitions.
 */

// Supported types for environment variables
export type EnvVarType = 'string' | 'number' | 'boolean';

// Base interface for environment definitions
interface BaseEnvVar {
  isSecret?: boolean; // Optional, defaults to false
  group: string; // category for grouping in documentation
  type?: EnvVarType; // Type of the environment variable, defaults to 'string'
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

// Type mapping helper to convert EnvVarType to actual types
export type TypeMap = {
  'string': string;
  'number': number;
  'boolean': boolean;
};

// Helper type to extract the return type based on the environment variable definition
export type GetEnvVarType<T extends EnvVar> = 
  T['type'] extends keyof TypeMap 
    ? TypeMap[T['type']] 
    : string; // Default to string if no type specified
