/**
 * Weird-prompt stress test — validates shell routing and deterministic
 * rendering against unusual, ambiguous, and edge-case prompts.
 *
 * Tests ONLY the deterministic fallback path (no LLM, no API calls, no credits).
 * Run: npx tsx scripts/weird-prompt-test.ts
 */

import { generateFallbackSpec } from '../src/shells/spec.js';
import { renderFromSpec } from '../src/shells/renderer.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  prompt: string;
  shell: string;
  appName: string;
  domain: string;
  entity: string;
  fileCount: number;
  appTsxLength: number;
  timeMs: number;
  success: boolean;
  error?: string;
}

const WEIRD_PROMPTS = [
  // Unusual domains
  'Build a tool to help indie filmmakers coordinate festival submissions',
  'Create a product for parents to manage after-school routines',
  'Make a dashboard for neighborhood volunteering participation',
  'Design a workspace for tracking wildlife rescue cases',
  'Build a landing page for a reusable packaging startup',
  'Create a planner for pop-up market vendors',
  'Build an interface for tracking podcast guest outreach',
  'Make a product showcase for an ocean cleanup initiative',
  // Vague / ambiguous
  'Make something cool for dog walkers',
  'Build an app',
  'Create a thing that tracks stuff',
  'Help me organize my life',
  // Landing-type prompts
  'Build a landing page for my SaaS product',
  'Create a product page for a new AI writing tool',
  'Design a homepage for a climate tech startup',
  'Make a showcase for an online course platform',
  // Dashboard-type prompts
  'Build a metrics dashboard for a coffee shop chain',
  'Create an analytics panel for social media engagement',
  // Mixed signals
  'Build a beautiful product landing page with a built-in task manager',
  'Create a dashboard that also serves as a homepage',
  // Unusual phrasing
  'I need you to construct a digital instrument for cataloging astronomical observations',
  'Can you whip up a snazzy web thingy for managing beehive inspections?',
  'yo make me a sick app for tracking sneaker drops',
  // Kanban / workflow prompts
  'Build a recruitment pipeline for our HR team',
  'Create a sprint board for managing development tasks',
  'Make a sales pipeline tracker with stages',
  // Wizard / intake prompts
  'Build an onboarding wizard for new employees',
  'Create a step-by-step eligibility assessment tool',
  'Make a guided recommendation engine for choosing a laptop',
];

const results: TestResult[] = [];

console.log('FORGE — Weird-Prompt Stress Test');
console.log('═'.repeat(70));
console.log(`Testing ${WEIRD_PROMPTS.length} prompts against deterministic shell routing\n`);

for (const prompt of WEIRD_PROMPTS) {
  const start = Date.now();
  try {
    const spec = generateFallbackSpec(prompt);
    const result = renderFromSpec(spec);
    const elapsed = Date.now() - start;

    results.push({
      prompt: prompt.substring(0, 70),
      shell: result.shell,
      appName: result.spec.appName,
      domain: result.spec.domain,
      entity: result.spec.primaryEntity,
      fileCount: result.files.length,
      appTsxLength: result.appTsx.length,
      timeMs: elapsed,
      success: true,
    });

    const shellIcon = result.shell === 'landing' ? '🚀' : result.shell === 'dashboard' ? '📊' : '🔧';
    console.log(`  ${shellIcon} ${result.shell.padEnd(10)} | ${elapsed}ms | ${result.spec.appName.padEnd(25)} | ${result.spec.domain.padEnd(20)} | ${prompt.substring(0, 50)}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    results.push({
      prompt: prompt.substring(0, 70),
      shell: 'ERROR',
      appName: 'N/A',
      domain: 'N/A',
      entity: 'N/A',
      fileCount: 0,
      appTsxLength: 0,
      timeMs: elapsed,
      success: false,
      error: (err as Error).message,
    });
    console.log(`  ❌ ERROR    | ${elapsed}ms | ${(err as Error).message.substring(0, 50)} | ${prompt.substring(0, 50)}`);
  }
}

// Summary
console.log('\n' + '═'.repeat(70));
const passed = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
const shells = { universal: 0, dashboard: 0, landing: 0, kanban: 0, wizard: 0, ERROR: 0 };
results.forEach(r => { shells[r.shell as keyof typeof shells] = (shells[r.shell as keyof typeof shells] || 0) + 1; });
const avgTime = Math.round(results.reduce((s, r) => s + r.timeMs, 0) / results.length);
const maxTime = Math.max(...results.map(r => r.timeMs));

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log(`⏱  Avg time: ${avgTime}ms | Max time: ${maxTime}ms`);
console.log(`🔧 Universal: ${shells.universal} | 📊 Dashboard: ${shells.dashboard} | 🚀 Landing: ${shells.landing} | 📋 Kanban: ${shells.kanban} | 🧙 Wizard: ${shells.wizard} | ❌ Error: ${shells.ERROR}`);

// Flag weak prompts
const weakPrompts = results.filter(r => r.shell === 'universal' && r.domain === 'Workspace' && r.entity === 'Item');
if (weakPrompts.length > 0) {
  console.log(`\n⚠️  ${weakPrompts.length} prompts fell to generic fallback (Item/Workspace):`);
  weakPrompts.forEach(r => console.log(`   - "${r.prompt}"`));
}

// Write report
const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
const reportPath = join(reportDir, `weird-prompt-test-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), summary: { passed, failed, shells, avgTime, maxTime }, results }, null, 2));
console.log(`\n📄 Full report: ${reportPath}`);
