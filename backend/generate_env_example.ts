import { EnvironmentConfig } from "./src/config/environment.ts";

console.log("Example .env file content:");
console.log("=".repeat(50));
console.log(EnvironmentConfig.generateExampleEnvFile());
