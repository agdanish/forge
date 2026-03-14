/**
 * Simulation matrix — tests FORGE against 12 diverse prompts.
 * Measures: shell chosen, build success, file count, ZIP size, timing, cost.
 * Run: npx tsx scripts/simulation-matrix.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { getLLMClient } from '../src/llm/client.js';
import { getScaffoldHint } from '../src/templates/index.js';
import { validateZip } from '../src/validation/zipValidator.js';

const PROMPTS = [
  { id: 'dashboard', prompt: 'Build a SaaS analytics dashboard with KPIs, charts, and user metrics' },
  { id: 'kanban', prompt: 'Build a project management app with kanban board, task priorities, and team collaboration' },
  { id: 'ecommerce', prompt: 'Build an e-commerce store with product catalog, shopping cart, and checkout flow' },
  { id: 'finance', prompt: 'Build a personal finance tracker with expense categories, budgets, and spending analytics' },
  { id: 'chat', prompt: 'Build an AI chat assistant interface with conversation history and model selection' },
  { id: 'health', prompt: 'Build a fitness tracker with workout logging, progress charts, and streak tracking' },
  { id: 'education', prompt: 'Build a learning platform with course catalog, quiz system, and progress tracking' },
  { id: 'calendar', prompt: 'Build an event calendar app with monthly view, event creation, and reminders' },
  { id: 'crm', prompt: 'Build a CRM tool with contact management, deal pipeline, and activity tracking' },
  { id: 'social', prompt: 'Build a social media feed with posts, likes, comments, and user profiles' },
  { id: 'weird', prompt: 'Build something useful for a beekeeper to manage their hives and honey production' },
  { id: 'vague', prompt: 'Build a beautiful and functional web application' },
];

interface SimResult {
  id: string;
  success: boolean;
  fileCount: number;
  zipValid: boolean;
  timeMs: number;
  timeSec: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  scaffoldMatch: string;
  error?: string;
}

// Run a single prompt (or all if no arg)
const targetId = process.argv[2];
const prompts = targetId ? PROMPTS.filter(p => p.id === targetId) : PROMPTS.slice(0, 3); // Default: run first 3 to save credits

console.log('🔥 FORGE — Simulation Matrix');
console.log('═'.repeat(60));
console.log(`Running ${prompts.length} prompt(s)...\n`);

const results: SimResult[] = [];

for (const { id, prompt } of prompts) {
  console.log(`\n▶ [${id}] ${prompt.substring(0, 60)}...`);
  const start = Date.now();

  try {
    const llm = getLLMClient();
    const scaffoldHint = getScaffoldHint(prompt);
    const scaffoldMatch = scaffoldHint.match(/SCAFFOLD HINT \((\S+)/)?.[1] || 'unknown';

    const result = await llm.generate({
      prompt,
      systemPrompt: `You are FORGE — a world-class AI agent competing for a $5,000 hackathon prize.
Build a React 18 + TypeScript + Vite + Tailwind CSS + lucide-react app.
Dark premium theme: bg-gray-950 background, bg-gray-900 cards, indigo-600 buttons.

FILES ALREADY PRE-CREATED (DO NOT recreate): package.json, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, index.html, src/main.tsx, src/index.css

YOUR JOB: Create ONLY src/App.tsx and README.md (2 files max). Then call finalize_project.
Put ALL components, types, and logic in App.tsx. NEVER create separate component files.
Every button must have real onClick handlers. No placeholders. Include 10+ seed data items.
${scaffoldHint}`,
      tools: true,
    });

    const elapsed = Date.now() - start;
    const built = result.projectBuild?.success || false;

    let zipValid = false;
    if (built && result.projectBuild) {
      const validation = await validateZip(result.projectBuild.zipPath, result.projectBuild.files || []);
      zipValid = validation.valid;
    }

    const simResult: SimResult = {
      id,
      success: built,
      fileCount: result.projectBuild?.files?.length || 0,
      zipValid,
      timeMs: elapsed,
      timeSec: Math.round(elapsed / 1000),
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
      estimatedCost: ((result.usage?.promptTokens || 0) / 1_000_000) * 3 + ((result.usage?.completionTokens || 0) / 1_000_000) * 15,
      scaffoldMatch,
    };

    results.push(simResult);
    console.log(`  ✅ Built: ${built} | Files: ${simResult.fileCount} | ZIP: ${zipValid ? 'PASS' : 'FAIL'} | Time: ${simResult.timeSec}s | Cost: $${simResult.estimatedCost.toFixed(4)} | Shell: ${scaffoldMatch}`);

  } catch (error) {
    const elapsed = Date.now() - start;
    results.push({
      id,
      success: false,
      fileCount: 0,
      zipValid: false,
      timeMs: elapsed,
      timeSec: Math.round(elapsed / 1000),
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      scaffoldMatch: 'error',
      error: (error as Error).message?.substring(0, 100),
    });
    console.log(`  ❌ FAILED: ${(error as Error).message?.substring(0, 80)}`);
  }
}

// ── Summary Report ──
console.log('\n' + '═'.repeat(60));
console.log('📊 SIMULATION REPORT');
console.log('═'.repeat(60));

const passed = results.filter(r => r.success && r.zipValid);
const failed = results.filter(r => !r.success || !r.zipValid);
const times = results.filter(r => r.success).map(r => r.timeMs).sort((a, b) => a - b);
const totalCost = results.reduce((s, r) => s + r.estimatedCost, 0);

console.log(`\nPass rate: ${passed.length}/${results.length} (${Math.round(passed.length / results.length * 100)}%)`);
console.log(`Total cost: $${totalCost.toFixed(4)}`);

if (times.length > 0) {
  const p50 = times[Math.floor(times.length * 0.5)];
  const p90 = times[Math.floor(times.length * 0.9)];
  console.log(`Timing p50: ${(p50 / 1000).toFixed(1)}s | p90: ${(p90 / 1000).toFixed(1)}s`);
}

if (failed.length > 0) {
  console.log('\n❌ Failed prompts:');
  for (const f of failed) {
    console.log(`  - ${f.id}: ${f.error || 'build failed or ZIP invalid'}`);
  }
}

console.log('\n📋 Per-prompt results:');
console.log('ID'.padEnd(15) + 'Built'.padEnd(8) + 'ZIP'.padEnd(8) + 'Files'.padEnd(8) + 'Time(s)'.padEnd(10) + 'Cost($)'.padEnd(10) + 'Shell');
for (const r of results) {
  console.log(
    r.id.padEnd(15) +
    (r.success ? '✅' : '❌').padEnd(8) +
    (r.zipValid ? '✅' : '❌').padEnd(8) +
    String(r.fileCount).padEnd(8) +
    String(r.timeSec).padEnd(10) +
    r.estimatedCost.toFixed(4).padEnd(10) +
    r.scaffoldMatch
  );
}

console.log('\n' + '═'.repeat(60));
console.log('🎯 Simulation complete!');
