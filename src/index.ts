#!/usr/bin/env node
/**
 * Seed Agent - AI Agent Starter for Seedstr Platform
 *
 * This is the main entry point when running the agent directly.
 * For CLI commands, see src/cli/index.ts
 */

import { getConfig, validateConfig, isRegistered, isVerified } from "./config/index.js";
import { AgentRunner } from "./agent/runner.js";
import { startTUI } from "./tui/index.js";
import { logger } from "./utils/logger.js";
import chalk from "chalk";
import figlet from "figlet";

// ─── GLOBAL ERROR HANDLERS ───────────────────────────────────────────────────
// Prevent unhandled rejections / uncaught exceptions from killing the process.
// On Railway, a crash triggers a restart which burns one of 10 retry attempts.
// We'd rather log the error and keep running than burn retries on transient issues.
process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("[UNHANDLED REJECTION] Caught — process stays alive:"), reason);
});

process.on("uncaughtException", (error) => {
  // Only swallow non-fatal errors. OOM and similar V8 errors will still crash.
  console.error(chalk.red("[UNCAUGHT EXCEPTION] Caught — process stays alive:"), error);
});

async function main() {
  // Display banner
  console.log(
    chalk.cyan(
      figlet.textSync("Seed Agent", {
        font: "Small",
        horizontalLayout: "default",
      })
    )
  );
  console.log(chalk.gray("  AI Agent Starter for Seedstr Platform\n"));

  // Validate configuration
  const config = getConfig();
  const errors = validateConfig(config);

  if (errors.length > 0) {
    console.log(chalk.red("Configuration errors:"));
    for (const error of errors) {
      console.log(chalk.red(`  • ${error}`));
    }
    console.log(chalk.gray("\nPlease check your .env file and try again."));
    process.exit(1);
  }

  // Check registration
  if (!isRegistered()) {
    console.log(chalk.yellow("Agent is not registered."));
    console.log(chalk.gray("Run `npm run register` to register your agent first."));
    process.exit(1);
  }

  // Check verification (warning only)
  if (!isVerified()) {
    console.log(chalk.yellow("⚠ Agent is not verified."));
    console.log(chalk.gray("You won't be able to respond to jobs until verified."));
    console.log(chalk.gray("Run `npm run verify` to verify via Twitter.\n"));
  }

  // Determine if we should use TUI
  const useTUI = process.stdout.isTTY && !process.env.NO_TUI;

  if (useTUI) {
    // Start with TUI
    startTUI();
  } else {
    // Start without TUI
    console.log(chalk.cyan("Starting Seed Agent...\n"));
    console.log(chalk.gray(`  Model: ${config.model}`));
    console.log(chalk.gray(`  Min Budget: $${config.minBudget}`));
    console.log(chalk.gray(`  Poll Interval: ${config.pollInterval}s\n`));

    const runner = new AgentRunner();

    runner.on("event", (event) => {
      switch (event.type) {
        case "startup":
          logger.info("Agent started");
          break;
        case "polling":
          logger.debug(`Polling... (${event.jobCount} active)`);
          break;
        case "job_found":
          logger.job("Found", event.job.id, `$${event.job.budget}`);
          break;
        case "job_processing":
          logger.job("Processing", event.job.id);
          break;
        case "job_skipped":
          logger.job("Skipped", event.job.id, event.reason);
          break;
        case "response_generated":
          logger.job("Generated", event.job.id, event.preview.substring(0, 50) + "...");
          break;
        case "response_submitted":
          logger.success(`Response submitted: ${event.responseId}`);
          break;
        case "error":
          logger.error(event.message);
          break;
        case "shutdown":
          logger.info("Agent stopped");
          break;
      }
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log(chalk.yellow("\nShutting down..."));
      await runner.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Start the agent
    await runner.start();
  }
}

// Retry main() on transient failures instead of crashing and burning Railway restart attempts.
// Config/registration errors call process.exit(1) directly inside main() — those are permanent
// and won't reach this catch block. What CAN reach here: Conf library read errors, constructor
// failures, unexpected throws from start(). Those may be transient (disk hiccup, etc.).
const MAX_MAIN_RETRIES = 5;
const RETRY_DELAY_MS = 10_000; // 10 seconds

(async () => {
  for (let attempt = 1; attempt <= MAX_MAIN_RETRIES; attempt++) {
    try {
      await main();
      return; // main() completed (won't normally return — timers keep process alive)
    } catch (error) {
      console.error(chalk.red(`[STARTUP] Attempt ${attempt}/${MAX_MAIN_RETRIES} failed:`), error);
      if (attempt < MAX_MAIN_RETRIES) {
        console.log(chalk.yellow(`[STARTUP] Retrying in ${RETRY_DELAY_MS / 1000}s...`));
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.error(chalk.red(`[STARTUP] All ${MAX_MAIN_RETRIES} attempts exhausted. Exiting.`));
        process.exit(1);
      }
    }
  }
})();

// Export for programmatic use
export { AgentRunner } from "./agent/runner.js";
export { SeedstrClient } from "./api/client.js";
export { LLMClient, getLLMClient } from "./llm/client.js";
export { getConfig, validateConfig, configStore } from "./config/index.js";
export * from "./types/index.js";
