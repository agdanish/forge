import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, tool, CoreTool } from "ai";
import { z } from "zod";
import { getConfig } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { webSearch, type WebSearchResult } from "../tools/webSearch.js";
import { calculator, type CalculatorResult } from "../tools/calculator.js";
import { ProjectBuilder, type ProjectFile, type ProjectBuildResult } from "../tools/projectBuilder.js";
import { getBoilerplateFiles } from "../templates/boilerplate.js";

// Errors that are worth retrying (usually transient LLM output issues)
const RETRYABLE_ERROR_PATTERNS = [
  'InvalidToolArgumentsError',
  'AI_InvalidToolArgumentsError',
  'JSONParseError',
  'AI_JSONParseError',
];

/**
 * Get retry configuration from app config
 */
function getRetryConfig() {
  const config = getConfig();
  return {
    maxRetries: config.llmRetryMaxAttempts,
    baseDelayMs: config.llmRetryBaseDelayMs,
    maxDelayMs: config.llmRetryMaxDelayMs,
    fallbackNoTools: config.llmRetryFallbackNoTools,
  };
}

export interface LLMResponse {
  text: string;
  toolCalls?: {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  // If a project was built during this response
  projectBuild?: ProjectBuildResult;
}

// Active project builder instance (one per generation)
// Using a type assertion to work around TypeScript narrowing issues
let activeProjectBuilder: ProjectBuilder | null = null;

// Helper to get the project builder with correct typing
function getActiveBuilder(): ProjectBuilder | null {
  return activeProjectBuilder;
}

/**
 * Check if an error is retryable (transient LLM output parsing issue)
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const errorName = (error as Error).name || '';
  const errorMessage = (error as Error).message || '';
  
  // Check error name against known retryable errors
  if (RETRYABLE_ERROR_PATTERNS.some(name => errorName.includes(name))) {
    return true;
  }
  
  // Check for JSON parsing errors in the message
  if (errorMessage.includes('JSON parsing failed') || 
      errorMessage.includes('Invalid arguments for tool')) {
    return true;
  }
  
  // Check for cause chain (nested errors)
  const cause = (error as { cause?: unknown }).cause;
  if (cause) {
    return isRetryableError(cause);
  }
  
  return false;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number, retryConfig: ReturnType<typeof getRetryConfig>): number {
  const delay = Math.min(
    retryConfig.baseDelayMs * Math.pow(2, attempt),
    retryConfig.maxDelayMs
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: boolean;
}

/**
 * OpenRouter LLM Client with built-in tool support
 */
export class LLMClient {
  private openrouter: ReturnType<typeof createOpenRouter>;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    const config = getConfig();

    if (!config.openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is required");
    }

    this.openrouter = createOpenRouter({
      apiKey: config.openrouterApiKey,
    });

    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
  }

  /**
   * Get available tools based on configuration
   */
  private getTools(): Record<string, CoreTool> {
    const config = getConfig();
    const tools: Record<string, CoreTool> = {};

    if (config.tools.webSearchEnabled) {
      tools.web_search = tool({
        description:
          "Search the web for current information. Use this when you need up-to-date information, facts, news, prices, or data that might not be in your training data. Returns an array of search results with title, url, and snippet containing the relevant information.",
        parameters: z.object({
          query: z
            .string()
            .describe("The search query to look up on the web"),
        }),
        execute: async ({ query }): Promise<WebSearchResult[]> => {
          logger.tool("web_search", "start", `Query: ${query}`);
          try {
            const results = await webSearch(query);
            logger.tool("web_search", "success", `Found ${results.length} results`);
            // Log result snippets for debugging
            for (const r of results.slice(0, 2)) {
              logger.debug(`Search result: "${r.title}" - ${r.snippet.substring(0, 100)}...`);
            }
            return results;
          } catch (error) {
            logger.tool("web_search", "error", String(error));
            throw error;
          }
        },
      });
    }

    if (config.tools.calculatorEnabled) {
      tools.calculator = tool({
        description:
          "Perform mathematical calculations. Use this for any math operations, equations, or numerical computations.",
        parameters: z.object({
          expression: z
            .string()
            .describe(
              "The mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', 'sin(45)')"
            ),
        }),
        execute: async ({ expression }): Promise<CalculatorResult> => {
          logger.tool("calculator", "start", `Expression: ${expression}`);
          try {
            const result = calculator(expression);
            logger.tool("calculator", "success", `Result: ${result.result}`);
            return result;
          } catch (error) {
            logger.tool("calculator", "error", String(error));
            throw error;
          }
        },
      });
    }

    if (config.tools.codeInterpreterEnabled) {
      tools.code_analysis = tool({
        description:
          "Analyze code snippets, explain code logic, identify bugs, or suggest improvements. This tool helps with code-related questions.",
        parameters: z.object({
          code: z.string().describe("The code snippet to analyze"),
          language: z
            .string()
            .optional()
            .describe("The programming language of the code"),
          task: z
            .enum(["explain", "debug", "improve", "review"])
            .describe("What to do with the code"),
        }),
        execute: async ({ code, language, task }) => {
          logger.tool("code_analysis", "start", `Task: ${task}`);
          // This is a meta-tool - it returns structured data for the LLM to use
          return {
            code,
            language: language || "unknown",
            task,
            note: "Analyze this code and provide the requested information.",
          };
        },
      });

      // Project builder tool - creates files that will be packaged into a zip
      tools.create_file = tool({
        description: `Create a file for the project. IMPORTANT: 9 boilerplate files already exist (package.json, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, index.html, src/main.tsx, src/index.css, README.md). You only need to create src/App.tsx — that's the ONLY file you should create. Then call finalize_project immediately. 2 tool calls total.`,
        parameters: z.object({
          path: z
            .string()
            .describe(
              "The file path — should be 'src/App.tsx' (boilerplate files already exist, do NOT recreate them)"
            ),
          content: z
            .string()
            .describe("The complete content of the file"),
        }),
        execute: async ({ path, content }) => {
          logger.tool("create_file", "start", `Creating: ${path}`);
          try {
            // Block boilerplate files that already exist
            const BOILERPLATE_FILES = [
              'package.json', 'vite.config.ts', 'tailwind.config.js',
              'postcss.config.js', 'tsconfig.json', 'index.html',
              'src/main.tsx', 'src/index.css', 'README.md',
            ];
            if (BOILERPLATE_FILES.includes(path)) {
              logger.tool("create_file", "error", `${path} already exists in boilerplate — skipped`);
              return {
                success: false,
                error: `${path} already exists as a pre-created boilerplate file. Do NOT recreate it. Only create src/App.tsx.`,
                path,
              };
            }

            // Quality gate for App.tsx — enforce Tailwind/lucide/CRUD pattern
            if (path === 'src/App.tsx') {
              const warnings: string[] = [];
              const classNameCount = (content.match(/className/g) || []).length;
              const lucideImport = content.includes('lucide-react');
              const canvasUsage = /useRef.*canvas|<canvas|\.getContext\(/i.test(content);
              const inlineStyleCount = (content.match(/style=\{\{/g) || []).length;
              const useStateCount = (content.match(/useState/g) || []).length;
              const handlerCount = (content.match(/onClick|onChange|onSubmit|onKeyDown/g) || []).length;

              if (canvasUsage) warnings.push('CRITICAL: Canvas detected — remove <canvas> and use Tailwind divs/grids instead. Canvas scores ZERO on design.');
              if (!lucideImport) warnings.push('CRITICAL: No lucide-react imports — add: import { Search, Plus, Edit, Trash2, Settings, Home, Menu, X, Check, Filter } from "lucide-react"');
              if (classNameCount < 25) warnings.push(`CRITICAL: Only ${classNameCount} className attrs (need ≥25) — every div/button/span needs Tailwind classes like bg-gray-900, text-white, p-4, rounded-xl, flex, etc.`);
              if (inlineStyleCount > 3) warnings.push(`WARNING: ${inlineStyleCount} inline styles detected — replace with Tailwind className equivalents.`);
              if (useStateCount < 4) warnings.push(`WARNING: Only ${useStateCount} useState (need ≥4) — add search, filter, modal, selectedItem states.`);
              if (handlerCount < 5) warnings.push(`WARNING: Only ${handlerCount} event handlers (need ≥5) — add onClick, onChange, onSubmit handlers.`);

              if (warnings.some(w => w.startsWith('CRITICAL'))) {
                logger.tool("create_file", "error", `App.tsx failed quality gate: ${warnings.join('; ')}`);
                return {
                  success: false,
                  error: `App.tsx REJECTED — fix these issues and resubmit:\n${warnings.join('\n')}\n\nREWRITE App.tsx as a Tailwind CRUD app with sidebar navigation, data cards/table, search, filters, modals, KPI stats, and lucide-react icons. NO canvas, NO inline styles.`,
                  path,
                };
              }
            }

            // Initialize project builder if not exists
            if (!activeProjectBuilder) {
              activeProjectBuilder = new ProjectBuilder();
            }

            activeProjectBuilder.addFile(path, content);

            const files = activeProjectBuilder.getFiles();
            logger.tool("create_file", "success", `Created ${path}, total files: ${files.length}`);

            return {
              success: true,
              path,
              size: content.length,
              totalFiles: files.length,
              allFiles: files,
            };
          } catch (error) {
            logger.tool("create_file", "error", String(error));
            throw error;
          }
        },
      });

      tools.finalize_project = tool({
        description: `Package the project into a downloadable zip. Call this immediately after creating src/App.tsx. The zip will include all 9 pre-existing boilerplate files plus your App.tsx. Do NOT create extra files before calling this.`,
        parameters: z.object({
          projectName: z
            .string()
            .describe("A descriptive name for the project (e.g., 'business-website', 'react-todo-app')"),
        }),
        execute: async ({ projectName }) => {
          logger.tool("finalize_project", "start", `Finalizing: ${projectName}`);
          try {
            if (!activeProjectBuilder) {
              throw new Error("No files have been created. Use create_file first.");
            }
            
            const result = await activeProjectBuilder.createZip(`${projectName}.zip`);
            logger.tool("finalize_project", "success", `Created ${result.zipPath} (${result.totalSize} bytes)`);
            
            return {
              success: result.success,
              projectName,
              zipPath: result.zipPath,
              files: result.files,
              totalSize: result.totalSize,
              error: result.error,
            };
          } catch (error) {
            logger.tool("finalize_project", "error", String(error));
            throw error;
          }
        },
      });
    }

    return tools;
  }

  /**
   * Generate a response using the LLM with optional tool calling
   */
  async generate(options: GenerateOptions): Promise<LLMResponse> {
    const {
      prompt,
      systemPrompt,
      maxTokens = this.maxTokens,
      temperature = this.temperature,
      tools: enableTools = true,
    } = options;

    logger.debug(`Generating response with model: ${this.model}`);

    // Reset project builder for each generation
    activeProjectBuilder = null;

    // Pre-inject boilerplate files — saves 8 tool calls, LLM only creates App.tsx + README.md
    if (enableTools) {
      activeProjectBuilder = new ProjectBuilder();
      const boilerplate = getBoilerplateFiles();
      for (const file of boilerplate) {
        activeProjectBuilder.addFile(file.path, file.content);
      }
      logger.debug(`Pre-injected ${boilerplate.length} boilerplate files (package.json, vite, tailwind, etc.)`);
    }

    const tools = enableTools ? this.getTools() : undefined;
    const hasTools = tools && Object.keys(tools).length > 0;

    let lastError: unknown;
    let attempt = 0;
    const retryConfig = getRetryConfig();

    // Retry loop for recoverable errors
    while (attempt <= retryConfig.maxRetries) {
      try {
        const result = await this.executeGeneration({
          prompt,
          systemPrompt,
          maxTokens,
          temperature,
          tools: hasTools ? tools : undefined,
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (isRetryableError(error) && attempt < retryConfig.maxRetries) {
          const delay = getRetryDelay(attempt, retryConfig);
          logger.warn(
            `LLM generation failed with retryable error (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), ` +
            `retrying in ${delay}ms: ${(error as Error).message?.substring(0, 100)}`
          );
          
          // Reset project builder and re-inject boilerplate before retry
          activeProjectBuilder = new ProjectBuilder();
          const retryBoilerplate = getBoilerplateFiles();
          for (const file of retryBoilerplate) {
            activeProjectBuilder.addFile(file.path, file.content);
          }
          logger.debug(`Re-injected ${retryBoilerplate.length} boilerplate files for retry`);

          await sleep(delay);
          attempt++;
          continue;
        }
        
        // Not retryable or exhausted retries — throw immediately.
        // Caller (runner.ts) handles fallback to emergency ZIP.
        // The old fallback-without-tools path was broken: it returned text-only
        // (no project build) which was useless for hackathon submissions.
        throw error;
      }
    }

    // Should not reach here, but just in case
    throw lastError;
  }

  /**
   * Execute the actual LLM generation (separated for retry logic)
   */
  private async executeGeneration(params: {
    prompt: string;
    systemPrompt?: string;
    maxTokens: number;
    temperature: number;
    tools?: Record<string, CoreTool>;
  }): Promise<LLMResponse> {
    const { prompt, systemPrompt, maxTokens, temperature, tools } = params;
    const hasTools = tools && Object.keys(tools).length > 0;

    try {
      const result = await generateText({
        model: this.openrouter(this.model),
        prompt,
        system: systemPrompt,
        maxTokens,
        temperature,
        tools: hasTools ? tools : undefined,
        maxSteps: hasTools ? 40 : 1, // Allow up to 40 tool call steps (complex React apps need 20+)
        onStepFinish: (step) => {
          // Debug logging for each step
          logger.debug(`Step finished - finishReason: ${step.finishReason}, hasText: ${!!step.text}, toolCalls: ${step.toolCalls?.length || 0}`);
          if (step.text) {
            logger.debug(`Step text preview: ${step.text.substring(0, 100)}...`);
          }
        },
      });

      // Log completion info
      logger.debug(`Generation complete - finishReason: ${result.finishReason}, steps: ${result.steps?.length || 0}`);
      
      // Extract tool calls from steps
      const toolCalls: LLMResponse["toolCalls"] = [];
      if (result.steps) {
        for (const step of result.steps) {
          const stepToolCalls = step.toolCalls as Array<{
            toolName: string;
            toolCallId: string;
            args: Record<string, unknown>;
          }> | undefined;
          const stepToolResults = step.toolResults as Array<{
            toolCallId: string;
            result: unknown;
          }> | undefined;
          
          if (stepToolCalls) {
            for (const tc of stepToolCalls) {
              const toolResult = stepToolResults?.find(
                (tr) => tr.toolCallId === tc.toolCallId
              )?.result;
              
              toolCalls.push({
                name: tc.toolName,
                args: tc.args,
                result: toolResult,
              });
              
              // Log tool results for debugging
              if (toolResult) {
                const resultStr = JSON.stringify(toolResult);
                logger.debug(`Tool ${tc.toolName} result: ${resultStr.substring(0, 200)}...`);
              }
            }
          }
        }
      }

      // Use result.text which should contain the final response after all tool calls
      // If the model stopped due to tool_calls without a final text, this might be empty
      let finalText = result.text;
      
      // If we have no text but have tool results, the model may not have generated a final response
      if (!finalText && toolCalls.length > 0) {
        logger.warn("Model finished with tool calls but no final text response. Finish reason:", result.finishReason);
        // Try to get text from the last step that has text
        if (result.steps) {
          for (let i = result.steps.length - 1; i >= 0; i--) {
            if (result.steps[i].text) {
              finalText = result.steps[i].text;
              break;
            }
          }
        }
      }

      // Check if a project was built during this generation
      let projectBuild: ProjectBuildResult | undefined;
      
      // Look for finalize_project tool call results
      const finalizeCall = toolCalls.find((tc) => tc.name === "finalize_project");
      if (finalizeCall && finalizeCall.result) {
        const finalizeResult = finalizeCall.result as {
          success: boolean;
          projectName: string;
          zipPath: string;
          files: string[];
          totalSize: number;
          error?: string;
        };
        
        // Get reference to active project builder (may have been set during tool execution)
        const builder = getActiveBuilder();
        if (finalizeResult.success && builder) {
          projectBuild = {
            success: true,
            projectDir: builder.getProjectDir(),
            zipPath: finalizeResult.zipPath,
            files: finalizeResult.files,
            totalSize: finalizeResult.totalSize,
          };
        }
      }

      return {
        text: finalText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        projectBuild,
      };
    } catch (error) {
      logger.error("LLM generation failed:", error);
      throw error;
    }
  }
  
  /**
   * Get the active project builder (if any)
   */
  getActiveProjectBuilder(): ProjectBuilder | null {
    return activeProjectBuilder;
  }

  /**
   * Generate a response for a Seedstr job
   */
  async generateJobResponse(job: { prompt: string; budget: number }): Promise<string> {
    const systemPrompt = `You are an AI agent participating in the Seedstr marketplace. Your task is to provide the best possible response to job requests.

Guidelines:
- Be helpful, accurate, and thorough
- Use tools when needed to get current information
- Provide well-structured, clear responses
- Be professional and concise
- If you use web search, cite your sources

Job Budget: $${job.budget.toFixed(2)} USD
This indicates how much the requester values this task. Adjust your effort accordingly.`;

    const result = await this.generate({
      prompt: job.prompt,
      systemPrompt,
      tools: true,
    });

    return result.text;
  }
}

// Export a singleton instance
let llmClientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClientInstance) {
    llmClientInstance = new LLMClient();
  }
  return llmClientInstance;
}

export default LLMClient;
