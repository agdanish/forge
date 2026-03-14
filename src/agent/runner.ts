import { EventEmitter } from "events";
import Conf from "conf";
import PusherClient from "pusher-js";
import { SeedstrClient } from "../api/client.js";
import { getLLMClient } from "../llm/client.js";
import { getConfig, configStore } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { cleanupProject } from "../tools/projectBuilder.js";
import { generateEmergencyZip } from "../tools/emergencyZip.js";
import { validateZip } from "../validation/zipValidator.js";
import { getScaffoldHint } from "../templates/index.js";
import { renderFromPrompt } from "../shells/renderer.js";
import { checkShellFitness } from "../shells/fitness.js";
import { scoreOutput, type JudgeScore } from "../judge/proxy.js";
import { checkTimeBudget, TIME_BUDGET } from "../judge/policy.js";
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

## STEP 1: ANALYZE THE PROMPT (do this mentally before creating any file — takes 5 seconds, saves 5 minutes)

Read the job prompt carefully. Identify:
1. **APP TYPE** — pick the closest: dashboard / kanban / crud / chat / analytics / ecommerce / finance / social / health / education / calendar / portfolio / game / real-estate / other
2. **PRIMARY USER ACTION** — what does the user DO? (track, manage, analyze, buy, communicate, learn, plan...)
3. **KEY DATA ENTITIES** — what objects does the app manage? (tasks, users, products, transactions, events...)
4. **REQUIRED VIEWS** — what screens? (list view, detail panel, form modal, dashboard, settings tab...)
5. **DOMAIN-SPECIFIC FEATURES** — what makes this app unique to its domain?

Then pick the matching scaffold from your hints below and build confidently.

## HANDLING TOUGH / CREATIVE / UNUSUAL PROMPTS

If the prompt doesn't match any standard archetype — DO NOT PANIC. Apply this universal strategy:

**Rule: EVERY prompt can become a functional app.** Decompose ANY subject into these 4 universal UI patterns:
1. **COLLECTION** — the subject has items to browse/list/filter (grid + search + category tabs)
2. **DETAIL** — each item has attributes to view/edit (detail panel or modal with form fields)
3. **DASHBOARD** — aggregate stats about the collection (KPI cards + bar chart + trend arrows)
4. **ACTIONS** — the user can create, edit, delete, favorite, sort, or change status of items

Examples of reframing tough prompts:
- "Build a DNA sequence analyzer" → Collection of sequences + detail view with stats + dashboard of composition + actions: add/compare/export
- "Create a virtual garden simulator" → Grid of plant plots + plant detail (species, growth, water) + garden stats dashboard + actions: plant/water/harvest
- "Make a music composition tool" → Track list collection + track editor detail + project stats + actions: add track/change tempo/add notes
- "Build a space mission planner" → Mission list + mission detail (crew, destination, timeline) + mission control dashboard + actions: create/edit/launch
- "Create something for beekeepers" → Hive collection + hive inspection detail + colony health dashboard + actions: add inspection/log harvest/alert
- "Build an astrology app" → Zodiac/chart collection + birth chart detail view + compatibility dashboard + actions: generate chart/compare/save

**The pattern is ALWAYS the same:** List → Detail → Stats → CRUD. The domain just changes the labels, icons, and seed data. If you can name the entities, you can build the app.

**For truly bizarre prompts** (abstract, poetic, nonsensical): Extract the NOUN and build a management/tracker/dashboard for it. "Make vibes" → Vibe Tracker (mood entries, vibe categories, daily trends). "Chaos engine" → Chaos Dashboard (event log, randomizer, entropy metrics). There is no prompt that cannot become a functional CRUD app.

**CRITICAL: Never output an empty shell or placeholder app.** A fully functional management tool for ANY subject scores higher than a half-built "creative interpretation." Functionality ≥5/10 is the qualifying gate. Ship working CRUD with real data, not ambitious broken features.

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

### Glassmorphism & Premium Effects
- Glassmorphic panels: className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
- Glowing accent borders: className="border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
- Subtle gradient mesh background on hero sections: className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-950 to-gray-950"

### Animations & Polish
- Hover effects on ALL interactive elements (hover:bg-*, hover:scale-[1.02], hover:shadow-lg)
- Smooth transitions: transition-all duration-300 on buttons and cards
- Card hover glow: hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]
- Loading states: animate-pulse for skeleton loaders
- Focus rings: focus:ring-2 focus:ring-indigo-500 on all inputs
- Empty states: centered illustration (use a lucide icon, large, text-gray-700) + message + action button
- Stagger grid items with animation delay: style={{ animationDelay: \`\${index * 50}ms\` }}
- Add subtle entrance animation: className="animate-in fade-in slide-in-from-bottom-2 duration-300"

### Icon Usage (always use lucide-react)
import { Search, Plus, Trash2, Edit, ChevronRight, BarChart2, Users, Settings, Bell, X, Check, AlertCircle, Home, Menu } from 'lucide-react';
Icons in buttons: <Button><Plus className="w-4 h-4" /> Add Item</Button>
Icons as decorators: <BarChart2 className="w-8 h-8 text-indigo-400" />

## FILES ALREADY PRE-CREATED — DO NOT RECREATE THESE

The following files exist on disk already. Calling create_file for them wastes time and loses Speed points:
\`\`\`
✅ package.json        (react 18 + react-dom + lucide-react + vite + tailwind)
✅ vite.config.ts      (Vite + React plugin)
✅ tailwind.config.js  (content paths configured)
✅ postcss.config.js   (autoprefixer)
✅ tsconfig.json       (strict TypeScript, noEmit)
✅ index.html          (Vite entry with <div id="root">)
✅ src/main.tsx        (createRoot + StrictMode + App import)
✅ src/index.css       (@tailwind base/components/utilities)
\`\`\`

## YOUR JOB: CREATE ONLY THESE 2–3 FILES (maximum!)

\`\`\`
src/App.tsx        ← REQUIRED — ALL logic, state, TypeScript types, root component
README.md          ← REQUIRED — app name, features, "npm install && npm run dev"
src/components.tsx ← OPTIONAL — only if App.tsx would exceed ~400 lines
\`\`\`

⚡ SPEED RULES (CRITICAL — speed is a scored hackathon criterion):
1. Maximum 3 create_file calls total. Then immediately finalize_project.
2. NEVER create src/types.ts — define all interfaces inline at top of App.tsx.
3. NEVER create separate component files — everything in App.tsx or one components.tsx.
4. NEVER create hooks/ folder, utils/ folder, or any additional files.
5. If you need extra npm packages beyond react/react-dom/lucide-react, overwrite package.json as one of your 3 allowed files.
6. PERFECT SUBMISSION = App.tsx + README.md + finalize_project (2 create_file calls).

## CODE QUALITY RULES

1. ALL features visible in UI must be IMPLEMENTED — no onClick={() => {}} empty handlers
2. Use realistic sample data (10+ items, real names, real numbers)
3. ZERO placeholder text: no "TODO", "PLACEHOLDER", "Coming soon", "Lorem ipsum"
4. Handle empty states with helpful message + action button
5. ALL imports must match packages listed in package.json dependencies
6. TypeScript strict mode — no 'any' types, all props typed
7. Local state only (useState, useReducer) — no external state libs needed

## SELF-REVIEW CHECKLIST (MANDATORY — verify before calling finalize_project)

□ App.tsx: every button has a real onClick handler (no empty arrow functions)
□ App.tsx: every form has onSubmit that updates state (no preventDefault-only)
□ App.tsx: all lucide-react icons are imported at the top
□ App.tsx: no import from packages outside react, react-dom, lucide-react (unless you updated package.json)
□ App.tsx: all TypeScript interfaces defined, no implicit 'any'
□ README.md: has app name, feature list, "npm install && npm run dev"
□ If you created src/components.tsx: it is imported in App.tsx

If you find any issue, fix it with ONE more create_file call, then finalize immediately.
DO NOT create additional files — fix issues inline in the existing files.

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

  // Two-pass LLM review REMOVED — replaced with deterministic validation in processJob.
  // Saves ~$0.50 + 30-60 seconds per submission.

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
      // Poll every 2s without WebSocket (speed is a judging criterion), 30s with WS
      const interval = this.wsConnected
        ? config.pollInterval * 1000       // WebSocket active: normal interval (30s)
        : 2000;                            // No WebSocket: 2s aggressive polling
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

  // ─── Retry helper ────────────────────────────────────────────────────────

  private async retryAsync<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, i), 8000);
          logger.warn(`${label} failed (attempt ${i + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${(err as Error).message?.substring(0, 100)}`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastErr;
  }

  // ─── Deterministic ZIP validation (replaces expensive two-pass LLM review) ─

  private async deterministicValidation(projectDir: string, files: string[]): Promise<string[]> {
    const errors: string[] = [];
    try {
      for (const file of files) {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
        const fullPath = path.join(projectDir, file);
        let content: string;
        try { content = await fs.readFile(fullPath, 'utf-8'); } catch { continue; }

        // Check for empty onClick handlers
        if (/onClick=\{?\(\)\s*=>\s*\{\s*\}\}?/.test(content)) {
          errors.push(`${file}: empty onClick handler detected`);
        }
        // Check for "Coming soon" / placeholder text
        if (/coming soon|placeholder|lorem ipsum|todo:/i.test(content)) {
          errors.push(`${file}: placeholder text detected`);
        }
        // Check for alert() calls
        if (/\balert\s*\(/.test(content)) {
          errors.push(`${file}: alert() call detected`);
        }
      }
      // Check required files
      if (!files.includes('README.md')) errors.push('Missing README.md');
      if (!files.includes('package.json')) errors.push('Missing package.json');
      if (!files.some(f => f.endsWith('App.tsx'))) errors.push('Missing App.tsx');
    } catch (err) {
      logger.warn('Deterministic validation error (non-blocking):', err);
    }
    return errors;
  }

  // ─── Files → ZIP helper (shared by shell, composer, and fallback paths) ──

  private async filesToZip(files: { path: string; content: string }[], label: string): Promise<{ zipPath: string; projectDir: string; fileNames: string[] }> {
    const tmpDir = path.join(process.cwd(), `.tmp-${label}-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    for (const file of files) {
      const filePath = path.join(tmpDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    const zipPath = tmpDir + '.zip';
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve());
      archive.on('error', (err: Error) => reject(err));
      archive.pipe(output);
      archive.directory(tmpDir, false);
      archive.finalize();
    });

    return { zipPath, projectDir: tmpDir, fileNames: files.map(f => f.path) };
  }

  // ─── Shell Compilation → ZIP helper ─────────────────────────────────────

  private async shellCompileToZip(prompt: string): Promise<{ zipPath: string; projectDir: string; files: string[]; responseText: string; fitnessRejected?: boolean } | null> {
    try {
      const llm = getLLMClient();
      // Use LLM for spec extraction (cheap — just JSON, no code gen)
      const shellResult = await renderFromPrompt(prompt, async (sys, user) => {
        const specResult = await llm.generate({ prompt: user, systemPrompt: sys, tools: false });
        return specResult.text || '';
      });

      // Fitness gate rejected — signal to caller to skip deterministic fallback too
      if (!shellResult) {
        logger.info('Shell compiler returned null (likely fitness gate rejection) — will route to LLM');
        return null;
      }

      // Write files to temp directory and create ZIP
      const { zipPath, projectDir: tmpDir, fileNames } = await this.filesToZip(shellResult.files, 'shell');
      const responseText = `${shellResult.spec.appName} — ${shellResult.spec.tagline}\n\n✨ Features: ${shellResult.spec.views.join(', ')}, ${shellResult.spec.categories.slice(0, 3).join(', ')} categories, KPI dashboard\n🛠️ Stack: React 18 + TypeScript + Tailwind CSS + Vite + lucide-react\n🚀 Setup: npm install && npm run dev`;

      logger.info(`Shell compilation complete: ${shellResult.spec.appName} (${shellResult.shell} shell, ${fileNames.length} files)`);
      return { zipPath, projectDir: tmpDir, files: fileNames, responseText };
    } catch (err) {
      logger.warn(`Shell compilation failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Fitness-aware fallback: if shell compiler returns null due to fitness gate,
  //    the deterministic fallback should ALSO be skipped (same prompt won't fit shells).
  //    Only the LLM tool-call path can handle these prompts properly. ──

  // ─── Job Processing (hardened: shell-first, retry, emergency ZIP, timing) ──

  private async processJob(job: Job, useV2Submit = false): Promise<void> {
    this.processingJobs.add(job.id);
    this.emitEvent({ type: "job_processing", job });
    const timings: Record<string, number> = {};
    const t0 = Date.now();

    try {
      const llm = getLLMClient();
      const config = getConfig();

      const effectiveBudget = job.jobType === "SWARM" && job.budgetPerAgent
        ? job.budgetPerAgent : job.budget;

      let zipPath = '';
      let projectDir = '';
      let projectFiles: string[] = [];
      let responseText = '';
      let usage: TokenUsage | undefined;
      let usedShellCompiler = false;

      // ── PRIMARY PATH: Shell Compilation (fast, deterministic, cheap) ──
      timings.shellStart = Date.now() - t0;
      const shellResult = await this.shellCompileToZip(job.prompt);
      timings.shellEnd = Date.now() - t0;

      // ── FITNESS-AWARE ROUTING ──
      // Check fitness BEFORE deciding fallback path. If fitness gate rejected
      // the prompt, deterministic fallback will be equally bad — go straight to LLM.
      const fitness = checkShellFitness(job.prompt);
      const fitnessRejected = fitness.recommendation === 'llm';

      if (shellResult) {
        logger.info(`⏱ TIMING: Shell compilation took ${timings.shellEnd - timings.shellStart}ms`);
        zipPath = shellResult.zipPath;
        projectDir = shellResult.projectDir;
        projectFiles = shellResult.files;
        responseText = shellResult.responseText;
        usedShellCompiler = true;

        // ── JUDGE PROXY: Score the deterministic output ──
        try {
          const appTsxFile = shellResult.files.find((f: string) => f.includes('App.tsx'));
          if (appTsxFile) {
            const appContent = await fs.readFile(path.join(projectDir, appTsxFile), 'utf-8');
            const judgeScore = scoreOutput({
              appTsx: appContent,
              files: projectFiles,
              lane: fitness.recommendation === 'composer' ? 'composer' : 'shell',
              elapsedMs: timings.shellEnd - timings.shellStart,
              fitnessScore: fitness.score,
            });
            logger.info(`[JUDGE] Pre-submit score: Func=${judgeScore.functionality}/10 Design=${judgeScore.design}/10 Conf=${judgeScore.confidence}/100`);
          }
        } catch (judgeErr) {
          logger.debug(`Judge scoring failed (non-blocking): ${(judgeErr as Error).message}`);
        }

        // Validate the shell-compiled ZIP
        const validation = await validateZip(zipPath, projectFiles);
        if (!validation.valid) {
          logger.warn(`Shell ZIP validation failed: ${validation.errors.join('; ')}. Trying deterministic fallback spec before LLM.`);
          usedShellCompiler = false;

          // ── FALLBACK 1.5: Retry with deterministic spec (no LLM, fast) ──
          // Only if fitness says shells are appropriate
          if (!fitnessRejected) {
            try {
              const { generateFallbackSpec } = await import('../shells/spec.js');
              const { renderFromSpec } = await import('../shells/renderer.js');
              const fallbackSpec = generateFallbackSpec(job.prompt);
              const fallbackResult = renderFromSpec(fallbackSpec);
              logger.info(`Deterministic fallback: ${fallbackSpec.appName} (${fallbackSpec.shell} shell)`);

              const { zipPath: zipPath2, projectDir: tmpDir2, fileNames: fbFileNames } = await this.filesToZip(fallbackResult.files, 'fallback');
              const val2 = await validateZip(zipPath2, fbFileNames);
              if (val2.valid) {
                zipPath = zipPath2;
                projectDir = tmpDir2;
                projectFiles = fbFileNames;
                responseText = `${fallbackSpec.appName} — ${fallbackSpec.tagline}\n\n✨ Features: ${fallbackSpec.views.join(', ')}, ${fallbackSpec.categories.slice(0, 3).join(', ')} categories\n🛠️ Stack: React 18 + TypeScript + Tailwind CSS + Vite\n🚀 Setup: npm install && npm run dev`;
                usedShellCompiler = true;
                logger.info('Deterministic fallback succeeded — skipping LLM tool-call path');
              } else {
                logger.warn('Deterministic fallback also failed validation — proceeding to LLM');
              }
            } catch (fbErr) {
              logger.warn(`Deterministic fallback error: ${(fbErr as Error).message} — proceeding to LLM`);
            }
          } else {
            logger.info('Fitness gate rejected prompt — skipping deterministic fallback, going to LLM');
          }
        }
      } else if (!fitnessRejected) {
        // Shell compile returned null but fitness says shells OK — try deterministic fallback
        logger.warn('Shell compilation returned null (not fitness). Trying deterministic fallback spec.');
        try {
          const { generateFallbackSpec } = await import('../shells/spec.js');
          const { renderFromSpec } = await import('../shells/renderer.js');
          const fallbackSpec = generateFallbackSpec(job.prompt);
          const fallbackResult = renderFromSpec(fallbackSpec);

          const { zipPath: zipPath2, projectDir: tmpDir2, fileNames: fbFileNames } = await this.filesToZip(fallbackResult.files, 'fallback');
          const val2 = await validateZip(zipPath2, fbFileNames);
          if (val2.valid) {
            zipPath = zipPath2;
            projectDir = tmpDir2;
            projectFiles = fbFileNames;
            responseText = `${fallbackSpec.appName} — ${fallbackSpec.tagline}\n\n✨ Features: ${fallbackSpec.views.join(', ')}, ${fallbackSpec.categories.slice(0, 3).join(', ')} categories\n🛠️ Stack: React 18 + TypeScript + Tailwind CSS + Vite\n🚀 Setup: npm install && npm run dev`;
            usedShellCompiler = true;
            logger.info(`Deterministic fallback succeeded: ${fallbackSpec.appName} (${fallbackSpec.shell})`);
          }
        } catch (fbErr) {
          logger.warn(`Deterministic fallback error: ${(fbErr as Error).message}`);
        }
      } else {
        // Fitness rejected AND shell compile returned null — go straight to LLM
        logger.info('Fitness gate rejected prompt — routing directly to full LLM generation');
      }

      // ── FALLBACK PATH: LLM Tool-Call Generation (only if deterministic paths all failed) ──
      if (!usedShellCompiler) {
        // ── TIME BUDGET CHECK: Skip LLM if running low ──
        const timeBudget = checkTimeBudget(t0);
        if (timeBudget.isEmergency) {
          logger.warn('[POLICY] Emergency time budget — using emergency ZIP instead of LLM');
          const emergency = await generateEmergencyZip(job.prompt);
          zipPath = emergency.zipPath;
          projectDir = emergency.projectDir;
          projectFiles = emergency.files;
          responseText = emergency.text;
          usedShellCompiler = true; // Skip LLM path below
        }

        if (!usedShellCompiler) {
        logger.info('All deterministic paths failed — using LLM tool-call generation (slow fallback)');
        timings.genStart = Date.now() - t0;
        const result = await llm.generate({
          prompt: job.prompt,
          systemPrompt: HACKATHON_SYSTEM_PROMPT(effectiveBudget, job, getScaffoldHint(job.prompt)),
          tools: true,
        });
        timings.genEnd = Date.now() - t0;
        logger.info(`⏱ TIMING: LLM generation took ${timings.genEnd - (timings.genStart || 0)}ms`);

        // Track token usage
        if (result.usage) {
          const cost = estimateCost(config.model, result.usage.promptTokens, result.usage.completionTokens);
          usage = { promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens, totalTokens: result.usage.totalTokens, estimatedCost: cost };
          this.stats.totalPromptTokens += result.usage.promptTokens;
          this.stats.totalCompletionTokens += result.usage.completionTokens;
          this.stats.totalTokens += result.usage.totalTokens;
          this.stats.totalCost += cost;
        }

        this.emitEvent({ type: "response_generated", job, preview: result.text?.substring(0, 200) || '', usage });

        if (result.projectBuild && result.projectBuild.success) {
          zipPath = result.projectBuild.zipPath;
          projectDir = result.projectBuild.projectDir;
          projectFiles = result.projectBuild.files;
          responseText = result.text || 'See attached project.';
          this.emitEvent({ type: "project_built", job, files: projectFiles, zipPath });

          // Deterministic validation
          timings.validateStart = Date.now() - t0;
          const valErrors = await this.deterministicValidation(projectDir, projectFiles);
          if (valErrors.length > 0) {
            logger.warn(`Deterministic validation issues (non-blocking): ${valErrors.join('; ')}`);
          }
          timings.validateEnd = Date.now() - t0;

          // Standard ZIP validation
          const validation = await validateZip(zipPath, projectFiles);
          if (!validation.valid) {
            logger.warn(`ZIP validation failed: ${validation.errors.join("; ")}. Using emergency ZIP fallback.`);
            const emergency = await generateEmergencyZip(job.prompt);
            zipPath = emergency.zipPath;
            projectDir = emergency.projectDir;
            projectFiles = emergency.files;
            responseText = emergency.text;
          }
        } else {
          logger.warn('LLM did not build a project — generating emergency ZIP fallback');
          timings.emergencyStart = Date.now() - t0;
          const emergency = await generateEmergencyZip(job.prompt);
          zipPath = emergency.zipPath;
          projectDir = emergency.projectDir;
          projectFiles = emergency.files;
          responseText = emergency.text;
          timings.emergencyEnd = Date.now() - t0;
          logger.info(`⏱ TIMING: Emergency ZIP took ${(timings.emergencyEnd - (timings.emergencyStart || 0))}ms`);
        }
        } // close time-budget if (!usedShellCompiler)
      }

      // ── Stage 2: Upload with retry (time-budget aware) ──
      timings.uploadStart = Date.now() - t0;
      let uploadedFile: import("../types/index.js").FileAttachment;
      try {
        this.emitEvent({ type: "files_uploading", job, fileCount: 1 });
        // Check time budget before upload — reduce retries if running low
        const uploadTimeBudget = checkTimeBudget(t0);
        const uploadRetries = uploadTimeBudget.shouldSkipLLM ? 1 : 3;
        if (uploadTimeBudget.shouldSkipLLM) {
          logger.warn(`[POLICY] Low time budget (${uploadTimeBudget.remainingMs}ms remaining) — reducing upload retries to ${uploadRetries}`);
        }
        uploadedFile = await this.retryAsync(
          () => this.client.uploadFile(zipPath),
          'File upload',
          uploadRetries
        );
        this.emitEvent({ type: "files_uploaded", job, files: [uploadedFile] });
      } catch (uploadError) {
        // All upload retries failed — try emergency ZIP as last resort
        logger.error('All upload retries failed. Trying emergency ZIP as final fallback.');
        try {
          const emergency = await generateEmergencyZip(job.prompt);
          uploadedFile = await this.retryAsync(
            () => this.client.uploadFile(emergency.zipPath),
            'Emergency upload',
            2
          );
          responseText = emergency.text;
          projectDir = emergency.projectDir;
        } catch (finalError) {
          // Absolute last resort: submit text-only (better than nothing)
          logger.error('CRITICAL: All upload attempts exhausted. Submitting text-only.');
          const submitResult = useV2Submit
            ? await this.client.submitResponseV2(job.id, responseText)
            : await this.client.submitResponse(job.id, responseText);
          this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: false });
          cleanupProject(projectDir, zipPath);
          return;
        }
      }
      timings.uploadEnd = Date.now() - t0;
      logger.info(`⏱ TIMING: Upload took ${timings.uploadEnd - timings.uploadStart}ms`);

      // ── Stage 3: Submit response with retry ──
      timings.submitStart = Date.now() - t0;
      const submitResult = await this.retryAsync(
        () => useV2Submit
          ? this.client.submitResponseV2(job.id, responseText, "FILE", [uploadedFile])
          : this.client.submitResponseWithFiles(job.id, { content: responseText, responseType: "FILE", files: [uploadedFile] }),
        'Response submission',
        3
      );
      timings.submitEnd = Date.now() - t0;
      logger.info(`⏱ TIMING: Submit took ${timings.submitEnd - timings.submitStart}ms`);

      this.emitEvent({ type: "response_submitted", job, responseId: submitResult.response.id, hasFiles: true });
      cleanupProject(projectDir, zipPath);

      // ── Final timing summary ──
      const totalMs = Date.now() - t0;
      const genTime = usedShellCompiler
        ? `Shell: ${(timings.shellEnd || 0) - (timings.shellStart || 0)}ms`
        : `LLM: ${(timings.genEnd || 0) - (timings.genStart || 0)}ms`;
      logger.info(`⏱ TIMING SUMMARY: Total ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s) | ${genTime} | Upload: ${(timings.uploadEnd || 0) - (timings.uploadStart || 0)}ms | Submit: ${(timings.submitEnd || 0) - (timings.submitStart || 0)}ms | Path: ${usedShellCompiler ? 'SHELL' : 'LLM'}`);

      this.stats.jobsProcessed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already submitted")) {
        logger.debug(`Already responded to job ${job.id}, skipping`);
      } else {
        this.emitEvent({ type: "error", message: `Error processing job ${job.id}: ${errorMessage}`, error: error instanceof Error ? error : new Error(String(error)) });
        this.stats.errors++;

        // Last-ditch: even on unexpected error, try emergency ZIP
        try {
          logger.warn('Attempting emergency ZIP on unexpected error');
          const emergency = await generateEmergencyZip(job.prompt);
          const uploadedFile = await this.client.uploadFile(emergency.zipPath);
          const useV2 = job.jobType === "SWARM";
          await (useV2
            ? this.client.submitResponseV2(job.id, emergency.text, "FILE", [uploadedFile])
            : this.client.submitResponseWithFiles(job.id, { content: emergency.text, responseType: "FILE", files: [uploadedFile] }));
          logger.info('Emergency ZIP submitted successfully on error path');
          cleanupProject(emergency.projectDir, emergency.zipPath);
        } catch (emergencyErr) {
          logger.error('Emergency ZIP submission also failed:', emergencyErr);
        }
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
