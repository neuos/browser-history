/**
 * Environment configuration class with dynamic approach.
 * Uses runtime property access with proper type safety at the interface level.
 */

import { ENV_DEFINITIONS } from './env-definitions.ts';
import type { TypeMap } from './env-types.ts';

// Create mapped type for return types
type EnvVarReturnTypes = {
  [K in keyof typeof ENV_DEFINITIONS]: 
    typeof ENV_DEFINITIONS[K]['type'] extends keyof TypeMap 
      ? TypeMap[typeof ENV_DEFINITIONS[K]['type']]
      : string;
};

export class EnvironmentConfig {
  private static _instance: EnvironmentConfig | null = null;
  private readonly _config: Record<string, string>;

  private constructor() {
    this._config = this.loadAndValidateEnvironment();
  }

  /**
   * Initialize and get the singleton instance of EnvironmentConfig
   */
  public static initialize(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      EnvironmentConfig._instance = new EnvironmentConfig();
    }
    return EnvironmentConfig._instance;
  }

  /**
   * Get the singleton instance of EnvironmentConfig
   */
  private static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      throw new Error("EnvironmentConfig not initialized. Call EnvironmentConfig.initialize() first.");
    }
    return EnvironmentConfig._instance;
  }

  /**
   * Type-safe environment variable access with automatic type conversion
   */
  public static get<K extends keyof typeof ENV_DEFINITIONS>(key: K): EnvVarReturnTypes[K] {
    const instance = EnvironmentConfig.getInstance();
    const value = instance._config[key as string];
    if (value === undefined) {
      throw new Error(`Environment variable ${String(key)} is not available`);
    }

    const definition = ENV_DEFINITIONS[key] as Record<string, unknown>;
    const expectedType = (definition.type as string);

    if (expectedType === 'number') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error(`Environment variable ${String(key)} must be a valid number, got: ${value}`);
      }
      return parsed as unknown as EnvVarReturnTypes[K];
    } else if (expectedType === 'boolean') {
      const lowerValue = value.toLowerCase();
      return (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") as unknown as EnvVarReturnTypes[K];
    } else { // Default to string
        return value as EnvVarReturnTypes[K];
    }
  }

  /**
   * Get all configuration as a read-only object
   */
  public static getAllConfig(): Readonly<Record<string, string>> {
    const instance = EnvironmentConfig.getInstance();
    return Object.freeze({ ...instance._config });
  }

  /**
   * Log the current configuration (excluding secrets)
   */
  public static logConfiguration(): void {
    const instance = EnvironmentConfig.getInstance();
    console.log("📋 Environment Configuration:");
    
    for (const [key, value] of Object.entries(instance._config)) {
      // Use bracket notation for dynamic property access
      const definition = (ENV_DEFINITIONS as Record<string, Record<string, unknown>>)[key];
      if (definition && definition.isSecret === true) {
        console.log(`   ${key}: ${"*".repeat(8)} (hidden)`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    }
  }

  /**
   * Load and validate all environment variables
   */
  private loadAndValidateEnvironment(): Record<string, string> {
    const config: Record<string, string> = {};
    const missing: string[] = [];

    // Convert ENV_DEFINITIONS to entries for dynamic access
    const envEntries = Object.entries(ENV_DEFINITIONS as Record<string, Record<string, unknown>>);
    
    for (const [key, definition] of envEntries) {
      const value = Deno.env.get(key);
      
      if (value !== undefined) {
        config[key] = value;
      } else if ('default' in definition && typeof definition.default === 'string') {
        config[key] = definition.default;
      } else {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      this.logMissingVariables(missing);
      Deno.exit(1);
    }

    console.log("✅ All required environment variables are loaded");
    return config;
  }

  /**
   * Log detailed information about missing environment variables
   */
  private logMissingVariables(missing: string[]): void {
    console.error("❌ Missing required environment variables:");
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    
    console.error("\nPlease ensure these variables are set in your .env file");
    console.error("Example .env file content:");
    
    const envEntries = Object.entries(ENV_DEFINITIONS as Record<string, Record<string, unknown>>);
    const requiredVars = envEntries.filter(([_, def]) => !('default' in def));
    
    requiredVars.forEach(([key, definition]) => {
      const example = 'example' in definition ? definition.example : 'CHANGE_ME';
      console.error(`${key}=${example}`);
    });
  }

  /**
   * Generate a complete example .env file content
   */
  public static generateExampleEnvFile(): string {
    const lines: string[] = [
      "# Environment Configuration",
      "# Copy this to .env and modify the values as needed",
      ""
    ];

    // Group variables by their group property
    const groupedVars: Record<string, string[]> = {};
    const envEntries = Object.entries(ENV_DEFINITIONS as Record<string, Record<string, unknown>>);
    
    for (const [key, def] of envEntries) {
      const group = (def.group as string) || 'Other';
      if (!groupedVars[group]) {
        groupedVars[group] = [];
      }
      groupedVars[group].push(key);
    }

    for (const [group, keys] of Object.entries(groupedVars)) {
      lines.push(`# ${group}`);

      keys.forEach(key => {
        const def = (ENV_DEFINITIONS as Record<string, Record<string, unknown>>)[key];
        if (def) {
          let comment = "";
          let exampleValue = "";
          const isOptional = 'default' in def;
          if (!isOptional) {
            // Required variables
            exampleValue = def.example as string;
            comment = " # Required";
            if ('isSecret' in def && def.isSecret) {
              comment += " - Keep this secret!";
            }
          } else {
            // Optional variables
            exampleValue = ('example' in def ? def.example : def.default) as string;
            comment = ` # Optional (default: ${def.default})`;
          }
          
          lines.push(`${isOptional?'# ':''}${key}=${exampleValue}${comment}`);
        }
      });
      
      lines.push("");
    }

    return lines.join("\n");
  }
}
