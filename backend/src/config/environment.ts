/**
 * Environment configuration class that centralizes all environment variable
 * definitions, defaults, and validation logic.
 */
export class EnvironmentConfig {
  // Define all environment variables with their types and defaults
  private static readonly ENV_DEFINITIONS = {
    // Required secrets (no defaults for security)
    SHARED_SECRET: { required: true, default: undefined as string | undefined },
    JWT_SECRET: { required: true, default: undefined as string | undefined },
    
    // Server configuration with defaults
    PORT: { required: false, default: "8000" },
    HOST: { required: false, default: "0.0.0.0" },
    
    // CORS configuration
    CORS_ORIGIN: { required: false, default: "*" },
    
    // Database configuration
    DATABASE_PATH: { required: false, default: "./data/history.db" },
  } as const;

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
  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      throw new Error("EnvironmentConfig not initialized. Call EnvironmentConfig.initialize() first.");
    }
    return EnvironmentConfig._instance;
  }

  /**
   * Static convenience methods to access configuration directly
   * These delegate to the singleton instance
   */
  public static get(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): string {
    return EnvironmentConfig.getInstance().get(key);
  }

  public static getOptional(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS, fallback: string): string {
    return EnvironmentConfig.getInstance().getOptional(key, fallback);
  }

  public static getNumber(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): number {
    return EnvironmentConfig.getInstance().getNumber(key);
  }

  public static getBoolean(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): boolean {
    return EnvironmentConfig.getInstance().getBoolean(key);
  }

  /**
   * Load and validate all environment variables
   */
  private loadAndValidateEnvironment(): Record<string, string> {
    const config: Record<string, string> = {};
    const missing: string[] = [];

    // Process each environment variable definition
    for (const [key, definition] of Object.entries(EnvironmentConfig.ENV_DEFINITIONS)) {
      const value = Deno.env.get(key);
      
      if (value !== undefined) {
        // Environment variable is set
        config[key] = value;
      } else if (definition.default !== undefined) {
        // Use default value
        config[key] = definition.default;
      } else if (definition.required) {
        // Required but not set
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
    const requiredVars = Object.entries(EnvironmentConfig.ENV_DEFINITIONS)
      .filter(([_, def]) => def.required);
    
    requiredVars.forEach(([key]) => {
      switch (key) {
        case "SHARED_SECRET":
          console.error("SHARED_SECRET=your-super-secret-key-here");
          break;
        case "JWT_SECRET":
          console.error("JWT_SECRET=your-jwt-secret-here");
          break;
        default:
          console.error(`${key}=your-${key.toLowerCase().replace('_', '-')}-here`);
      }
    });
  }

  /**
   * Get a required environment variable value
   */
  public get(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): string {
    const value = this._config[key];
    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not available`);
    }
    return value;
  }

  /**
   * Get an optional environment variable with fallback
   */
  public getOptional(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS, fallback: string): string {
    return this._config[key] ?? fallback;
  }

  /**
   * Get a numeric environment variable
   */
  public getNumber(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): number {
    const value = this.get(key);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
    }
    return parsed;
  }

  /**
   * Get a boolean environment variable
   */
  public getBoolean(key: keyof typeof EnvironmentConfig.ENV_DEFINITIONS): boolean {
    const value = this.get(key).toLowerCase();
    return value === "true" || value === "1" || value === "yes";
  }

  /**
   * Get all configuration as a read-only object
   */
  public getAllConfig(): Readonly<Record<string, string>> {
    return Object.freeze({ ...this._config });
  }

  /**
   * Log the current configuration (excluding secrets)
   */
  public logConfiguration(): void {
    console.log("📋 Environment Configuration:");
    
    const secretKeys = ["SHARED_SECRET", "JWT_SECRET"];
    
    for (const [key, value] of Object.entries(this._config)) {
      if (secretKeys.includes(key)) {
        console.log(`   ${key}: ${"*".repeat(8)} (hidden)`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    }
  }
}
