/**
 * Environment configuration class that centralizes all environment variable
 * definitions, defaults, and validation logic.
 */

import { ENV_DEFINITIONS } from './env-definitions.ts';

export class EnvironmentConfig {
  private static _instance: EnvironmentConfig | null = null;
  private readonly _config: Record<string, string>;

  private constructor() {
    this._config = this.loadAndValidateEnvironment();
  }

  /**
   * Initialize and get the singleton instance of EnvironmentConfig
   * This should be called after environment variables are loaded
   */
  public static initialize(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      EnvironmentConfig._instance = new EnvironmentConfig();
    }
    return EnvironmentConfig._instance;
  }

  /**
   * Get the singleton instance of EnvironmentConfig
   * Throws an error if not initialized
   */
  private static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      throw new Error("EnvironmentConfig not initialized. Call EnvironmentConfig.initialize() first.");
    }
    return EnvironmentConfig._instance;
  }

  /**
   * Static convenience methods to access configuration directly
   * These implement the logic directly instead of forwarding to instance methods
   */
  public static get(key: keyof typeof ENV_DEFINITIONS): string;
  public static get<T extends 'string' | 'number' | 'boolean'>(
    key: keyof typeof ENV_DEFINITIONS, 
    type: T
  ): T extends 'string' ? string : T extends 'number' ? number : T extends 'boolean' ? boolean : never;
  public static get(key: keyof typeof ENV_DEFINITIONS, type?: 'string' | 'number' | 'boolean'): string | number | boolean {
    const instance = EnvironmentConfig.getInstance();
    
    if (type === 'number') {
      const value = instance._config[key as string];
      if (value === undefined) {
        throw new Error(`Environment variable ${String(key)} is not available`);
      }
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error(`Environment variable ${String(key)} must be a valid number, got: ${value}`);
      }
      return parsed;
    } else if (type === 'boolean') {
      const value = instance._config[key as string];
      if (value === undefined) {
        throw new Error(`Environment variable ${String(key)} is not available`);
      }
      const lowerValue = value.toLowerCase();
      return lowerValue === "true" || lowerValue === "1" || lowerValue === "yes";
    } else if (type === 'string' || type === undefined) {
      const value = instance._config[key as string];
      if (value === undefined) {
        throw new Error(`Environment variable ${String(key)} is not available`);
      }
      return value;
    } else {
      // This should never be reached due to TypeScript constraints, but adding for runtime safety
      throw new Error(`Unsupported type: ${type}. Supported types are 'string', 'number', 'boolean'`);
    }
  }

  public static getNumber(key: keyof typeof ENV_DEFINITIONS): number {
    return EnvironmentConfig.get(key, 'number');
  }

  public static getBoolean(key: keyof typeof ENV_DEFINITIONS): boolean {
    return EnvironmentConfig.get(key, 'boolean');
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
      const definition = ENV_DEFINITIONS[key];
      if (definition?.isSecret === true) {
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

    // Process each environment variable definition
    for (const [key, definition] of Object.entries(ENV_DEFINITIONS)) {
      const value = Deno.env.get(key);
      
      if (value !== undefined) {
        // Environment variable is set
        config[key] = value;
      } else if (definition.default !== undefined) {
        // Use default value
        config[key] = definition.default;
      } else if (definition.default === undefined) {
        // Required but not set (no default means required)
        missing.push(key);
      }
    }

    // Check for missing required variables
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
    
    // Show examples for required variables
    const requiredVars = Object.entries(ENV_DEFINITIONS)
      .filter(([_, def]) => def.default === undefined);
    
    requiredVars.forEach(([key, definition]) => {
      console.error(`${key}=${definition.example}`);
    });
  }

  /**
   * Generate a complete example .env file content
   */
  public static generateExampleEnvFile(): string {
    const lines: string[] = [
      "# Environment Configuration",
      "# Copy this to .env and modify the values as needed",
      "# ⚠️  IMPORTANT: Keep secret values secure and never commit them to version control",
      ""
    ];

    // Group variables by their group property
    const groupedVars: Record<string, string[]> = {};
    
    for (const [key, def] of Object.entries(ENV_DEFINITIONS)) {
      if (!groupedVars[def.group]) {
        groupedVars[def.group] = [];
      }
      groupedVars[def.group].push(key);
    }

    for (const [group, keys] of Object.entries(groupedVars)) {
      lines.push(`# ${group}`);
      
      keys.forEach(key => {
        const def = ENV_DEFINITIONS[key];
        if (def) {
          let comment = "";
          let exampleValue = "";
          
          if (def.default === undefined) {
            // Required variables must have an example
            exampleValue = def.example;
            comment = " # Required";
            if (def.isSecret) {
              comment += " - Keep this secret!";
            }
          } else {
            // Optional variables use example if provided, otherwise use default
            exampleValue = def.example || def.default;
            comment = ` # Optional (default: ${def.default})`;
          }
          
          lines.push(`${key}=${exampleValue}${comment}`);
        }
      });
      
      lines.push("");
    }

    return lines.join("\n");
  }
}
