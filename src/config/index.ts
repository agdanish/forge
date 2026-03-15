import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Conf from "conf";
import type { AgentConfig, StoredConfig, WalletType } from "../types/index.js";

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the project root (2 levels up from src/config)
dotenvConfig({ path: resolve(__dirname, "../../.env") });

// Also try loading from current working directory as fallback
dotenvConfig();

// Persistent config store for API keys and agent info
export const configStore = new Conf<StoredConfig>({
  projectName: "seed-agent",
  projectVersion: "2.0.0",
  schema: {
    seedstrApiKey: { type: "string" },
    agentId: { type: "string" },
    walletAddress: { type: "string" },
    walletType: { type: "string" },
    isVerified: { type: "boolean" },
    name: { type: "string" },
    bio: { type: "string" },
    profilePicture: { type: "string" },
  },
});

/**
 * Get the full agent configuration from environment variables and stored config
 */
export function getConfig(): AgentConfig {
  const stored = configStore.store;

  // Safe parseInt/parseFloat with NaN fallback to default
  const safeInt = (val: string | undefined, fallback: number): number => {
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };
  const safeFloat = (val: string | undefined, fallback: number): number => {
    if (!val) return fallback;
    const parsed = parseFloat(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  // Validate WALLET_TYPE to known values
  const rawWalletType = process.env.WALLET_TYPE || stored.walletType || "ETH";
  const walletType: WalletType = (rawWalletType === "ETH" || rawWalletType === "SOL") ? rawWalletType : "ETH";

  return {
    // API Keys
    openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
    seedstrApiKey: process.env.SEEDSTR_API_KEY || stored.seedstrApiKey || "",
    tavilyApiKey: process.env.TAVILY_API_KEY || "",

    // Wallet
    walletAddress:
      process.env.WALLET_ADDRESS || process.env.SOLANA_WALLET_ADDRESS || stored.walletAddress || "",
    walletType,

    // Model settings
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6",
    maxTokens: safeInt(process.env.MAX_TOKENS, 32768),
    temperature: safeFloat(process.env.TEMPERATURE, 0.7),

    // Agent behavior
    minBudget: safeFloat(process.env.MIN_BUDGET, 0.01),
    maxConcurrentJobs: safeInt(process.env.MAX_CONCURRENT_JOBS, 1),
    pollInterval: safeInt(process.env.POLL_INTERVAL, 30),

    // Tools
    tools: {
      webSearchEnabled: process.env.TOOL_WEB_SEARCH_ENABLED !== "false",
      calculatorEnabled: process.env.TOOL_CALCULATOR_ENABLED !== "false",
      codeInterpreterEnabled:
        process.env.TOOL_CODE_INTERPRETER_ENABLED !== "false",
    },

    // Platform
    seedstrApiUrl: process.env.SEEDSTR_API_URL || "https://www.seedstr.io/api/v1",
    seedstrApiUrlV2: process.env.SEEDSTR_API_URL_V2 || (process.env.SEEDSTR_API_URL ? process.env.SEEDSTR_API_URL.replace(/\/v1$/, '/v2') : "https://www.seedstr.io/api/v2"),

    // WebSocket (Pusher)
    useWebSocket: process.env.USE_WEBSOCKET !== "false", // enabled by default
    pusherKey: process.env.PUSHER_KEY || "",
    pusherCluster: process.env.PUSHER_CLUSTER || "us2",

    // Logging
    logLevel: (process.env.LOG_LEVEL as AgentConfig["logLevel"]) || "info",
    debug: process.env.DEBUG === "true",

    // LLM retry settings (for recovering from transient tool argument parsing errors)
    llmRetryMaxAttempts: safeInt(process.env.LLM_RETRY_MAX_ATTEMPTS, 3),
    llmRetryBaseDelayMs: safeInt(process.env.LLM_RETRY_BASE_DELAY_MS, 1000),
    llmRetryMaxDelayMs: safeInt(process.env.LLM_RETRY_MAX_DELAY_MS, 10000),
    llmRetryFallbackNoTools: process.env.LLM_RETRY_FALLBACK_NO_TOOLS !== "false",
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: AgentConfig): string[] {
  const errors: string[] = [];

  if (!config.openrouterApiKey) {
    errors.push("OPENROUTER_API_KEY is required");
  }

  if (!config.walletAddress) {
    errors.push("WALLET_ADDRESS is required");
  }

  return errors;
}

/**
 * Check if the agent is registered
 */
export function isRegistered(): boolean {
  return !!(configStore.get("seedstrApiKey") || process.env.SEEDSTR_API_KEY);
}

/**
 * Check if the agent is verified
 */
export function isVerified(): boolean {
  return configStore.get("isVerified") === true || process.env.SEEDSTR_VERIFIED === "true";
}

/**
 * Save registration data
 */
export function saveRegistration(data: {
  apiKey: string;
  agentId: string;
  walletAddress: string;
  walletType: WalletType;
}): void {
  configStore.set("seedstrApiKey", data.apiKey);
  configStore.set("agentId", data.agentId);
  configStore.set("walletAddress", data.walletAddress);
  configStore.set("walletType", data.walletType);
}

/**
 * Save verification status
 */
export function saveVerification(isVerified: boolean): void {
  configStore.set("isVerified", isVerified);
}

/**
 * Save profile data
 */
export function saveProfile(data: {
  name?: string;
  bio?: string;
  profilePicture?: string;
}): void {
  if (data.name) configStore.set("name", data.name);
  if (data.bio) configStore.set("bio", data.bio);
  if (data.profilePicture) configStore.set("profilePicture", data.profilePicture);
}

/**
 * Get stored agent info
 */
export function getStoredAgent(): StoredConfig {
  return configStore.store;
}

/**
 * Clear all stored configuration
 */
export function clearConfig(): void {
  configStore.clear();
}

export default {
  getConfig,
  validateConfig,
  configStore,
  isRegistered,
  isVerified,
  saveRegistration,
  saveVerification,
  saveProfile,
  getStoredAgent,
  clearConfig,
};
