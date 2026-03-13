import { EventEmitter } from "events";
import Conf from "conf";
import PusherClient from "pusher-js";
import { SeedstrClient } from "../api/client.js";
import { getLLMClient } from "../llm/client.js";
import { getConfig, configStore } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { cleanupProject } from "../tools/projectBuilder.js";
import { validateZip } from "../validation/zipValidator.js";
import { getScaffoldHint } from "../templates/index.js";
import type { Job, AgentEvent, TokenUsage, FileAttachment, WebSocketJobEvent } from "../types/index.js";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";

// Approximate costs per 1M tokens for common models (input/output)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "anthropic/claude-opus-4.6": { input: 15.0, output: 75.0 },
  "anthropic/claude-opus-4.5": { input: 15.0, output: 75.0 },
  "anthropic/claude-opus-4.1": { input: 15.0, output: 75.0 },
  "anthropic/claude-opus-4": { input: 15.0, output: 75.0 },
  "anthropic/claude-sonnet-4.6": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4": { input: 3.0, output: 15.0 },
  "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  "anthropic/claude-3-opus": { input: 15.0, output: 75.0 },
  "openai/gpt-4-turbo": { input: 10.0, output: 30.0 },
  "openai/gpt-4o": { input: 5.0, output: 15.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "meta-llama/llama-3.1-405b-instruct": { input: 3.0, output: 3.0 },
  "meta-llama/llama-3.1-70b-instruct": { input: 0.5, output: 0.5 },
  "google/gemini-pro-1.5": { input: 2.5, output: 7.5 },
  default: { input: 1.0, output: 3.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS.default;
  return (promptTokens / 1_000_000) * costs.input + (completionTokens / 1_000_000) * costs.output;
}

interface TypedEventEmitter {
  on(event: "event", listener: (event: AgentEvent) => void): this;
  emit(event: "event", data: AgentEvent): boolean;
}

const jobStore = new Conf<{ processedJobs: string[] }>({
  projectName: "seed-agent",
  projectVersion: "1.0.0",
  configName: "jobs",
  defaults: { processedJobs: [] },
});

// ─── UPGRADE 3: ENHANCED SYSTEM PROMPT ───────────────────────────────────────
const HACKATHON_SYSTEM_PROMPT = (effectiveBudget: number, job: Job, scaffoldHint: string): string => `
You are FORGE — a world-class AI agent competing for a $5,000 hackathon prize.
Judges score on: Functionality (≥5/10 REQUIRED to qualify) → Design → Speed.
Your mission: Build the most functional, beautiful app possible. Every point counts.

## DECISION: TEXT vs PROJECT

Build a PROJECT (use create_file + finalize_project) when the job involves:
- Any app, tool, dashboard, platform, website, SaaS, utility
- Anything a user would "run", "open in browser", or "use"
- Any code deliverable

Use TEXT ONLY for: pure writing tasks, simple factual answers, short analysis.
When budget is $1+ and a UI could be built — ALWAYS build a project. The requester paid for a real deliverable.

## MANDATORY TECH STACK

React 18 + TypeScript + Vite + Tailwind CSS + lucide-react
NEVER use: create-react-app, class components, any CSS files, external UI libraries (no shadcn, no MUI, no antd).

## DESIGN SYSTEM (use these EXACT patterns — judges score design heavily)

### Colors & Theme (dark premium)
- Page background: className="min-h-screen bg-gray-950 text-white"
- Card: className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl"
- Primary button: className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
- Secondary button: className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-all duration-200"
- Danger button: className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all duration-200"
- Input: className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
- Badge/tag: className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-800"
- Section heading: className="text-2xl font-bold text-white"
- Subheading: className="text-sm font-medium text-gray-400 uppercase tracking-wider"
- Body text: className="text-gray-300"
- Muted text: className="text-gray-500 text-sm"

### Layout Patterns
- Max width container: className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
- Grid layout: className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
- Flex row: className="flex items-center justify-between gap-4"
- Sidebar layout: className="flex h-screen" with aside + main
- KPI card: className="bg-gray-900 border border-gray-800 rounded-2xl p-6" containing icon, value, label, and trend

### Animations & Polish
- Hover effects on ALL interactive elements (hover:bg-*, hover:scale-105, hover:shadow-lg)
- Smooth transitions: transition-all duration-200 on buttons and cards
- Loading states: animate-pulse for skeleton loaders
- Focus rings: focus:ring-2 focus:ring-indigo-500 on all inputs
- Empty states: centered illustration (use a lucide icon, large, text-gray-700) + message + action button

### Icon Usage (always use lucide-react)
import { Search, Plus, Trash2, Edit, ChevronRight, BarChart2, Users, Settings, Bell, X, Check, AlertCircle, Home, Menu } from 'lucide-react';
Icons in buttons: <Button><Plus className="w-4 h-4" /> Add Item</Button>
Icons as decorators: <BarChart2 className="w-8 h-8 text-indigo-400" />

## REQUIRED FILES — TARGET 9-11 FILES TOTAL (judges score Speed — less files = faster = wins!)

\`\`\`
package.json          ← correct dependencies
vite.config.ts        ← Vite + React plugin
tailwind.config.js    ← Tailwind content paths
postcss.config.js     ← autoprefixer
tsconfig.json         ← strict TypeScript
index.html            ← Vite entry point
README.md             ← setup instructions
src/
  main.tsx            ← React entry + StrictMode
  App.tsx             ← ALL logic, state, types + root component
  index.css           ← @tailwind base/components/utilities
  components.tsx      ← ALL UI components in ONE file (if needed)
\`\`\`

⚡ SPEED RULES (CRITICAL — speed is a scored criterion):
1. Aim for EXACTLY 10 files total. Every extra file costs you speed score.
2. NEVER create src/types.ts — define ALL TypeScript interfaces at the top of App.tsx.
3. NEVER create separate files per component — put ALL components in ONE src/components.tsx.
4. Put useState, useReducer, and all data logic directly in App.tsx.
5. Only create src/components.tsx if you have more than 3 distinct UI sections.
6. NEVER create hooks/ folder or separate hook files.
7. The perfect 10-file structure: 7 config files + main.tsx + App.tsx + index.css.

## EXACT PACKAGE.JSON (copy this exactly, add extra deps as needed)

\`\`\`json
{
  "name": "forge-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.2",
    "vite": "^6.0.1"
  }
}
\`\`\`

## EXACT CONFIG FILES

vite.config.ts:
\`\`\`ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
\`\`\`

tailwind.config.js:
\`\`\`js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
\`\`\`

postcss.config.js:
\`\`\`js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
\`\`\`

src/index.css:
\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

index.html:
\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
\`\`\`

src/main.tsx:
\`\`\`tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
\`\`\`

## CODE QUALITY RULES

1. ALL features visible in UI must be IMPLEMENTED — no onClick={() => {}} empty handlers
2. Use realistic sample data (10+ items, real names, real numbers)
3. ZERO placeholder text: no "TODO", "PLACEHOLDER", "Coming soon", "Lorem ipsum"
4. Handle empty states with helpful message + action button
5. ALL imports must match packages listed in package.json dependencies
6. TypeScript strict mode — no 'any' types, all props typed
7. Local state only (useState, useReducer) — no external state libs needed

## SELF-REVIEW CHECKLIST (MANDATORY — do this before finalize_project)

Before calling finalize_project, verify EACH item:
□ package.json lists EVERY package imported in any .ts/.tsx file
□ Every button has a real working onClick handler
□ Every form has a real onSubmit with state updates
□ All useState variables are actually used in JSX
□ No TypeScript errors (check all props match their types)
□ No import from packages not in package.json
□ index.html exists with correct script src
□ All lucide-react icons are imported correctly
□ README.md has: Overview, Features, Setup (npm install && npm run dev), Tech Stack
□ Every component file is imported where it's used

If you find ANY issue, fix it with another create_file call BEFORE finalizing.

## PREMIUM UI POLISH (what separates winners from also-rans)

### Visual hierarchy that judges notice:
- Use gradient text on main headings: className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
- Gradient border accent on hero cards: className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-700/50"
- Status badges with semantic color: green for success, yellow for warning, red for error, blue for info
- Progress bars: className="h-2 bg-gray-800 rounded-full overflow-hidden" with inner div using width %
- Numbered/icon-decorated list items for features or steps

### Data richness that proves functionality:
- Seed with 8-15 realistic sample items (real names, real numbers, real dates — NOT "Item 1", "Item 2")
- Include variety: some items complete, some in-progress, some overdue
- KPI cards must show real numbers with % change trend arrows (↑ 12% or ↓ 3%)
- Charts: use pure Tailwind CSS bar charts (height % as inline style) — no chart library needed

### Interactions that impress judges:
- Search/filter that actually works (filters the rendered list in real-time)
- Add/Edit/Delete that actually mutate state
- Tab switching between views (e.g., List / Board / Calendar)
- Keyboard shortcut hint in UI: "Press ⌘K to search"
- Subtle active/selected state: className="ring-2 ring-indigo-500 bg-indigo-950/30"

### NEVER do these (instant score penalty):
- ❌ Alert() popups for anything
- ❌ console.log() for user-visible actions
- ❌ Disabled buttons that are always disabled
- ❌ "Coming soon" or "Feature not available" labels
- ❌ Placeholder Lorem Ipsum text

## SUBMISSION TEXT FORMAT

After finalize_project, your text response must follow this format:
[App Name] — [One compelling sentence describing what it does].

✨ Features: [Feature 1], [Feature 2], [Feature 3], [Feature 4].
🛠️ Stack: React 18 + TypeScript + Tailwind CSS + Vite + lucide-react
🚀 Setup: npm install && npm run dev

Job Budget: $${effectiveBudget.toFixed(2)} USD${job.jobType === "SWARM" ? ` (your share of $${job.budget.toFixed(2)} total)` : ""}
${scaffoldHint}`.trim();

// ─────────────────────────────────────────────────────────────────────────────

export class AgentRunner extends EventEmitter implements TypedEventEmitter {
  private client: SeedstrClient;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private processingJobs: Set<string> = new Set();
  private processedJobs: Set<string>;
  private pusher: PusherClient | null = null;
  private wsConnected = false;
  private stats = {
    jobsProcessed: 0,
    jobsSkipped: 0,
    errors: 0,
    startTime: Date.now(),
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    totalCost: 0,
  };

  constructor() {
    super();
    this.client = new SeedstrClient();
    const stored = jobStore.get("processedJobs") || [];
    this.processedJobs = new Set(stored);
    logger.debug(`Loaded ${this.processedJobs.size} previously processed jobs`);
  }

  private markJobProcessed(jobId: string): void {
    this.processedJobs.add(jobId);
    const jobArray = Array.from(this.processedJobs);
    if (jobArray.length > 1000) {
      this.processedJobs = new Set(jobArray.slice(-1000));
    }
    jobStore.set("processedJobs", Array.from(this.processedJobs));
  }

  private emitEvent(event: AgentEvent): void {
    this.emit("event", event);
  }

  // ─── UPGRADE 1: TWO-PASS CODE REVIEW ──────────────────────────────────────

  /**
   * Reviews generated project files for critical bugs and returns fixes.
   * Uses OpenRouter API directly (no tools) for fast, focused review.
   * Never throws — always returns safely to avoid blocking submission.
   */
  private async twoPassReview(projectDir: string, files: string[]): Promise<Map<string, string>> {
    const config = getConfig();
    const fixes = new Map<string, string>();

    try {
      // Read source files only (skip node_modules, zip, etc.)
      const reviewableExtensions = ['.tsx', '.ts', '.json', '.html', '.js', '.css'];
      const fileContents: string[] = [];

      for (const file of files) {
        const ext = path.extname(file);
        if (!reviewableExtensions.includes(ext)) continue;
        try {
          const fullPath = path.join(projectDir, file);
          const content = await fs.readFile(fullPath, 'utf-8');
          if (content.length < 30000) {
            fileContents.push(`### ${file}\n\`\`\`\n${content}\n\`\`\``);
          }
        } catch { /* skip unreadable files */ }
      }

      if (fileContents.length === 0) return fixes;

      const codeBlock = fileContents.join('\n\n');

      logger.info('Running two-pass code review...');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: `You are a senior React/TypeScript expert doing a final code review before submission.

Review these files for CRITICAL bugs only:

${codeBlock}

Critical bugs to find:
1. Import from packages NOT listed in package.json dependencies
2. Missing React/useState/useEffect imports
3. onClick/onSubmit handlers that are empty (do nothing)
4. TypeScript type errors (wrong props, missing required props)
5. Missing files referenced in imports
6. Tailwind classes with typos

Return ONLY a valid JSON object where keys are filenames and values are the COMPLETE corrected file content.
Only include files that need fixing. If everything is correct, return {}.

Example: {"src/App.tsx": "complete corrected file content here"}

Return ONLY the JSON, no explanation.`,
          }],
        }),
      });

      if (!response.ok) {
        logger.warn(`Two-pass review API returned ${response.status}, skipping`);
        return fixes;
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content || '{}';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fixes;

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
      let fixCount = 0;

      for (const [file, correctedContent] of Object.entries(parsed)) {
        if (typeof correctedContent === 'string' && correctedContent.length > 10) {
          fixes.set(file, correctedContent);
          fixCount++;
        }
      }

      if (fixCount > 0) {
        logger.info(`Two-pass review found ${fixCount} file(s) to fix`);
      } else {
        logger.info('Two-pass review: code looks good, no fixes needed');
      }
    } catch (error) {
      logger.warn('Two-pass review failed (non-blocking):', error);
    }

    return fixes;
  }

  /**
   * Apply fixes from two-pass review and re-create the ZIP file.
   */
  private async applyFixesAndRezip(
    projectDir: string,
    zipPath: string,
    fixes: Map<string, string>
  ): Promise<void> {
    // Write fixed files back to disk
    for (const [file, content] of fixes) {
      const fullPath = path.join(projectDir, file);
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        logger.debug(`Applied fix: ${file}`);
      } catch (err) {
        logger.warn(`Failed to apply fix for ${file}:`, err);
      }
    }

    // Re-create the ZIP
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(projectDir, false);
      archive.finalize();
    });

    logger.info(`Re-zipped project with fixes: ${zipPath}`);
  }

  // ─── WebSocket (Pusher) ────────────────────────────────────────────────────

  private connectWebSocket(): void {
    const config = getConfig();

    if (!config.useWebSocket) {
      logger.info("WebSocket disabled by config, using polling only");
      return;
    }

    if (!config.pusherKey) {
      logger.warn("PUSHER_KEY not set — WebSocket disabled, falling back to polling");
      return;
    }

    const agentId = configStore.get("agentId");
    if (!agentId) {
      logger.warn("Agent ID not found — cannot subscribe to WebSocket channel");
      return;
    }

    try {
      this.pusher = new PusherClient(config.pusherKey, {
        cluster: config.pusherCluster,
        channelAuthorization: {
          endpoint: `${config.seedstrApiUrlV2}/pusher/auth`,
          transport: "ajax",
          headers: { Authorization: `Bearer ${config.seedstrApiKey}` },
        },
      });

      this.pusher.connection.bind("connected", () => {
        this.wsConnected = true;
        this.emitEvent({ type: "websocket_connected" });
        logger.info("WebSocket connected to Pusher");
      });

      this.pusher.connection.bind("disconnected", () => {
        this.wsConnected = false;
        this.emitEvent({ type: "websocket_disconnected", reason: "disconnected" });
        logger.warn("WebSocket disconnected");
      });

      this.pusher.connection.bind("error", (err: unknown) => {
        this.wsConnected = false;
        logger.error("WebSocket error:", err);
        this.emitEvent({ type: "websocket_disconnected", reason: "error" });
      });

      const channel = this.pusher.subscribe(`private-agent-${agentId}`);
      channel.bind("pusher:subscription_succeeded", () => {
        logger.info(`Subscribed to private-agent-${agentId}`);
      });
      channel.bind("pusher:subscription_error", (err: unknown) => {
        logger.error("Channel subscription error:", err);
        logger.warn("Will rely on polling for job discovery");
      });
      channel.bind("job:new", (data: WebSocketJobEvent) => {
        logger.info(`[WS] New job received: ${data.jobId} ($${data.budget})`);
        this.emitEvent({ type: "websocket_job", jobId: data.jobId });
        this.handleWebSocketJob(data);
      });
    } catch (err) {
      logger.error("Failed to initialize Pusher:", err);
      logger.warn("Falling back to polling only");
    }
  }

  private async handleWebSocketJob(event: WebSocketJobEvent): Promise<void> {
    const config = getConfig();
    if (this.processingJobs.has(event.jobId) || this.processedJobs.has(event.jobId)) return;
    if (this.processingJobs.size >= config.maxConcurrentJobs) return;

    const effectiveBudget = event.jobType === "SWARM" && event.budgetPerAgent
      ? event.budgetPerAgent : event.budget;
    if (effectiveBudget < config.minBudget) {
      this.markJobProcessed(event.jobId);
      this.stats.jobsSkipped++;
      return;
    }

    try {
      const job = await this.client.getJobV2(event.jobId);
      this.emitEvent({ type: "job_found", job });
      if (job.jobType === "SWARM") {
        await this.acceptAndProcessSwarmJob(job);
      } else {
        this.processJob(job).catch((error) => {
          this.emitEvent({ type: "error", message: `Failed to process job ${job.id}`, error: error instanceof Error ? error : new Error(String(error)) });
        });
      }
    } catch (error) {
      logger.error(`[WS] Failed to handle job ${event.jobId}:`, error);
      this.stats.errors++;
    }
  }

  private disconnectWebSocket(): void {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.wsConnected = false;
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) { logger.warn("Agent is already running"); return; }
    this.running = true;
    this.stats.startTime = Date.now();
    this.emitEvent({ type: "startup" });
    this.connectWebSocket();
    await this.poll();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    this.disconnectWebSocket();
    this.emitEvent({ type: "shutdown" });
  }

  // ─── UPGRADE 2: FAST POLLING (5s interval) ────────────────────────────────

  private async poll(): Promise<void> {
    if (!this.running) return;
    const config = getConfig();

    try {
      this.emitEvent({ type: "polling", jobCount: this.processingJobs.size });
      const response = await this.client.listJobsV2(20, 0);
      const jobs = response.jobs;

      for (const job of jobs) {
        if (this.processingJobs.has(job.id) || this.processedJobs.has(job.id)) continue;
        if (this.processingJobs.size >= config.maxConcurrentJobs) break;

        const effectiveBudget = job.jobType === "SWARM" && job.budgetPerAgent
          ? job.budgetPerAgent : job.budget;

        if (effectiveBudget < config.minBudget) {
          this.emitEvent({ type: "job_skipped", job, reason: `Budget $${effectiveBudget} below minimum $${config.minBudget}` });
          this.markJobProcessed(job.id);
          this.stats.jobsSkipped++;
          continue;
        }

        this.emitEvent({ type: "job_found", job });
        if (job.jobType === "SWARM") {
          this.acceptAndProcessSwarmJob(job).catch((error) => {
            this.emitEvent({ type: "error", message: `Failed to process swarm job ${job.id}`, error: error instanceof Error ? error : new Error(String(error)) });
          });
        } else {
          this.processJob(job).catch((error) => {
            this.emitEvent({ type: "error", message: `Failed to process job ${job.id}`, error: error instanceof Error ? error : new Error(String(error)) });
          });
        }
      }
    } catch (error) {
      this.emitEvent({ type: "error", message: "Failed to poll for jobs", error: error instanceof Error ? error : new Error(String(error)) });
      this.stats.errors++;
    }

    if (this.running) {
      // UPGRADE 2: Poll every 5s when no WebSocket, 30s when WebSocket active
      const interval = this.wsConnected
        ? config.pollInterval * 1000       // WebSocket active: normal interval (30s)
        : Math.min(config.pollInterval * 1000, 5000); // No WebSocket: max 5s
      this.pollTimer = setTimeout(() => this.poll(), interval);
    }
  }

  // ─── Swarm ────────────────────────────────────────────────────────────────

  private async acceptAndProcessSwarmJob(job: Job): Promise<void> {
    try {
      const result = await this.client.acceptJob(job.id);
      this.emitEvent({ type: "job_accepted", job, budgetPerAgent: result.acceptance.budgetPerAgent });
      logger.info(`Accepted swarm job ${job.id} — ${result.slotsRemaining} slots remaining`);
      await this.processJob(job, true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("job_full") || msg.includes("All agent slots")) {
        logger.debug(`Swarm job ${job.id} is full, skipping`);
        this.markJobProcessed(job.id);
        this.stats.jobsSkipped++;
      } else if (msg.includes("already accepted")) {
        logger.debug(`Already accepted swarm job ${job.id}`);
      } else {
        throw error;
      }
    }
  }

  // ─── Job Processing (Upgrade 1 integrated) ────────────────────────────────

  private async processJob(job: Job, useV2Submit = false): Promise<void> {
    this.processingJobs.add(job.id);
    this.emitEvent({ type: "job_processing", job });

    try {
      const llm = getLLMClient();
      const config = getConfig();

      const effectiveBudget = job.jobType === "SWARM" && job.budgetPerAgent
        ? job.budgetPerAgent : job.budget;

      // UPGRADE 3: Use the massively enhanced system prompt
      const result = await llm.generate({
        prompt: job.prompt,
        systemPrompt: HACKATHON_SYSTEM_PROMPT(effectiveBudget, job, getScaffoldHint(job.prompt)),
        tools: true,
      });

      // Track token usage
      let usage: TokenUsage | undefined;
      if (result.usage) {
        const cost = estimateCost(config.model, result.usage.promptTokens, result.usage.completionTokens);
        usage = { promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens, totalTokens: result.usage.totalTokens, estimatedCost: cost };
        this.stats.totalPromptTokens += result.usage.promptTokens;
        this.stats.totalCompletionTokens += result.usage.completionTokens;
        this.stats.totalTokens += result.usage.totalTokens;
        this.stats.totalCost += cost;
      }

      this.emitEvent({ type: "response_generated", job, preview: result.text.substring(0, 200), usage });

      if (result.projectBuild && result.projectBuild.success) {
        const { projectBuild } = result;
        this.emitEvent({ type: "project_built", job, files: projectBuild.files, zipPath: projectBuild.zipPath });

        // UPGRADE 1: Two-pass code review — fix bugs before submitting
        try {
          const fixes = await this.twoPassReview(projectBuild.projectDir, projectBuild.files);
          if (fixes.size > 0) {
            await this.applyFixesAndRezip(projectBuild.projectDir, projectBuild.zipPath, fixes);
            logger.info(`Applied ${fixes.size} two-pass fix(es) to project`);
          }
        } catch (reviewError) {
          logger.warn('Two-pass review/fix failed (non-blocking), submitting original:', reviewError);
        }

        // Validate ZIP quality
        const validation = await validateZip(projectBuild.zipPath, projectBuild.files);
        if (!validation.valid) {
          logger.warn(`ZIP validation failed: ${validation.errors.join("; ")}. Submitting text fallback.`);
          const submitResult = useV2Submit
            ? await this.client.submitResponseV2(job.id, result.text || "See description.")
            : await this.client.submitResponse(job.id, result.text || "See description.");
          this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: false });
          cleanupProject(projectBuild.projectDir, projectBuild.zipPath);
          return;
        }

        try {
          this.emitEvent({ type: "files_uploading", job, fileCount: 1 });
          const uploadedFiles = await this.client.uploadFile(projectBuild.zipPath);
          this.emitEvent({ type: "files_uploaded", job, files: [uploadedFiles] });

          const submitResult = useV2Submit
            ? await this.client.submitResponseV2(job.id, result.text, "FILE", [uploadedFiles])
            : await this.client.submitResponseWithFiles(job.id, { content: result.text, responseType: "FILE", files: [uploadedFiles] });

          this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: true });
          cleanupProject(projectBuild.projectDir, projectBuild.zipPath);
        } catch (uploadError) {
          logger.error("Upload failed, submitting text-only fallback:", uploadError);
          const submitResult = useV2Submit
            ? await this.client.submitResponseV2(job.id, result.text)
            : await this.client.submitResponse(job.id, result.text);
          this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: false });
          cleanupProject(projectBuild.projectDir, projectBuild.zipPath);
        }
      } else {
        // Text-only response
        const submitResult = useV2Submit
          ? await this.client.submitResponseV2(job.id, result.text)
          : await this.client.submitResponse(job.id, result.text);
        this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: false });
      }

      this.stats.jobsProcessed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already submitted")) {
        logger.debug(`Already responded to job ${job.id}, skipping`);
      } else {
        this.emitEvent({ type: "error", message: `Error processing job ${job.id}: ${errorMessage}`, error: error instanceof Error ? error : new Error(String(error)) });
        this.stats.errors++;
      }
    } finally {
      this.processingJobs.delete(job.id);
      this.markJobProcessed(job.id);
    }
  }

  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      activeJobs: this.processingJobs.size,
      wsConnected: this.wsConnected,
      avgTokensPerJob: this.stats.jobsProcessed > 0 ? Math.round(this.stats.totalTokens / this.stats.jobsProcessed) : 0,
      avgCostPerJob: this.stats.jobsProcessed > 0 ? this.stats.totalCost / this.stats.jobsProcessed : 0,
    };
  }

  isRunning(): boolean { return this.running; }
}

export default AgentRunner;
