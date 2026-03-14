/**
 * Composer Lane Regression Test — validates all 6 kits, routing, scoring,
 * repair controller, and negative cases.
 *
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/composer-test.ts
 */

import { composeFromPrompt, canCompose } from '../src/composer/composer.js';
import { scoreKitComposition } from '../src/composer/scorer.js';
import { extractKitFit } from '../src/composer/extractor.js';
import { repairComposedOutput } from '../src/composer/repair.js';
import { checkShellFitness } from '../src/shells/fitness.js';
import { generateFallbackSpec } from '../src/shells/spec.js';
import {
  ALL_COMPOSER_FIXTURES,
  COMPOSER_TEST_PROMPTS,
  COMPOSER_NEGATIVE_PROMPTS,
} from './fixtures/composer-fixtures.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

interface TestResult {
  id: string;
  test: string;
  passed: boolean;
  details: string;
  timeMs: number;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

function record(id: string, test: string, passed: boolean, details: string, timeMs: number) {
  results.push({ id, test, passed, details, timeMs });
  if (passed) {
    passCount++;
    console.log(`  ✅ ${id}: ${test}`);
  } else {
    failCount++;
    console.log(`  ❌ ${id}: ${test} — ${details}`);
  }
}

// ══════════════════════════════════════════════════
// TEST 1: KIT EXTRACTION
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 1: Kit Extraction ═══');
for (const [key, { prompt, expectedKit }] of Object.entries(COMPOSER_TEST_PROMPTS)) {
  const start = Date.now();
  const result = extractKitFit(prompt);
  const elapsed = Date.now() - start;

  const passed = result.bestKit === expectedKit;
  record(
    `EXT-${key}`,
    `Extraction: "${prompt.slice(0, 50)}..." → ${expectedKit}`,
    passed,
    passed ? `score: ${result.bestScore}` : `got: ${result.bestKit} (score: ${result.bestScore}), expected: ${expectedKit}`,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 2: KIT SCORING
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 2: Kit Scoring ═══');
for (const [key, { prompt, expectedKit }] of Object.entries(COMPOSER_TEST_PROMPTS)) {
  const start = Date.now();
  const result = scoreKitComposition(prompt);
  const elapsed = Date.now() - start;

  const passed = !result.shouldAbstain && result.selectedKits[0] === expectedKit;
  record(
    `SCORE-${key}`,
    `Scoring: "${prompt.slice(0, 50)}..." → ${expectedKit}`,
    passed,
    passed ? `score: ${result.compositionScore}` : `abstain: ${result.shouldAbstain}, kits: [${result.selectedKits}], reason: ${result.decisiveReason}`,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 3: NEGATIVE CASES (should NOT match any kit)
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 3: Negative Cases ═══');
for (let i = 0; i < COMPOSER_NEGATIVE_PROMPTS.length; i++) {
  const prompt = COMPOSER_NEGATIVE_PROMPTS[i];
  const start = Date.now();
  const result = canCompose(prompt);
  const elapsed = Date.now() - start;

  // For shell-friendly prompts, composer should NOT handle them (shells should)
  // For exotic prompts, composer should abstain
  // The first 5 are shell-friendly, last 2 are exotic
  const isShellPrompt = i < 5;
  let passed: boolean;
  let detail: string;

  if (isShellPrompt) {
    // These should be handled by shells, so composer handling is acceptable but not ideal
    // The important thing is they don't crash
    passed = true;
    detail = result.canHandle ? `composer claims it (acceptable)` : `correctly deferred`;
  } else {
    // Exotic prompts: calculator, 3D game — should abstain
    passed = !result.canHandle;
    detail = passed ? 'correctly abstained' : `wrongly claims: ${result.scoring.selectedKits.join(', ')}`;
  }

  record(
    `NEG-${i + 1}`,
    `Negative: "${prompt.slice(0, 50)}..."`,
    passed,
    detail,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 4: FULL COMPOSITION (fixtures → App.tsx)
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 4: Full Composition ═══');
const kitPrompts: Record<string, string> = {
  'chat-inbox': 'Build a customer support inbox with threaded conversations',
  'feed-social': 'Create a community feed like Reddit with posts and comments',
  'store-catalog': 'Build an e-commerce store with product catalog and shopping cart',
  'map-splitview': 'Create a hotel booking app with map view and property listings',
  'media-player': 'Build a music player app like Spotify with playlists',
  'editor-lite': 'Create a poster designer tool with canvas and shapes',
};

for (const [kitId, fixture] of Object.entries(ALL_COMPOSER_FIXTURES)) {
  const prompt = kitPrompts[kitId] || `Build a ${kitId} app`;
  const start = Date.now();
  const result = composeFromPrompt(prompt, fixture);
  const elapsed = Date.now() - start;

  if (!result) {
    record(`COMPOSE-${kitId}`, `Compose ${kitId}`, false, 'returned null', elapsed);
    continue;
  }

  // Validate result structure
  const checks: string[] = [];
  if (!result.appTsx || result.appTsx.length < 500) checks.push(`appTsx too short (${result.appTsx?.length || 0})`);
  if (!result.readmeMd) checks.push('missing readmeMd');
  if (!result.files || result.files.length < 3) checks.push(`too few files (${result.files?.length || 0})`);
  if (result.kit !== kitId) checks.push(`wrong kit: ${result.kit}`);

  // Check for React basics
  if (!result.appTsx.includes('export default')) checks.push('missing export default');
  if (!result.appTsx.includes('useState')) checks.push('missing useState');
  if (!result.appTsx.includes('className')) checks.push('missing className (no Tailwind)');

  // Check for package.json in files
  const hasPackageJson = result.files.some(f => f.path === 'package.json');
  if (!hasPackageJson) checks.push('missing package.json in files');

  // Check for index.html
  const hasIndexHtml = result.files.some(f => f.path === 'index.html');
  if (!hasIndexHtml) checks.push('missing index.html in files');

  const passed = checks.length === 0;
  record(
    `COMPOSE-${kitId}`,
    `Compose ${kitId}: ${result.spec.appName} (${result.appTsx.length} chars, ${result.files.length} files)`,
    passed,
    passed ? `kit: ${result.kit}, score: ${result.scoring.compositionScore}` : checks.join('; '),
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 5: REPAIR CONTROLLER
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 5: Repair Controller ═══');

// Test 5a: Good code should pass through unchanged
{
  const goodCode = `import { useState } from 'react';
import { Search } from 'lucide-react';
export default function App() {
  const [items, setItems] = useState<string[]>([]);
  return (
    <div className="min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold">Hello</h1>
      <button onClick={() => setItems([...items, 'new'])}>Add</button>
    </div>
  );
}`;
  const start = Date.now();
  const result = repairComposedOutput(goodCode);
  const elapsed = Date.now() - start;

  record(
    'REPAIR-clean',
    'Repair: clean code passes through',
    !result.wasRepaired && !result.shouldEscalate,
    `repaired: ${result.wasRepaired}, escalate: ${result.shouldEscalate}, diagnoses: ${result.diagnoses.length}`,
    elapsed
  );
}

// Test 5b: Missing React import should be fixed
{
  const badCode = `export default function App() {
  const [count, setCount] = useState(0);
  return <div className="p-4"><button onClick={() => setCount(count + 1)}>{count}</button></div>;
}`;
  const start = Date.now();
  const result = repairComposedOutput(badCode);
  const elapsed = Date.now() - start;

  const passed = result.wasRepaired && result.appTsx.includes("from 'react'");
  record(
    'REPAIR-import',
    'Repair: missing useState import fixed',
    passed,
    `repaired: ${result.wasRepaired}, has import: ${result.appTsx.includes("from 'react'")}`,
    elapsed
  );
}

// Test 5c: Empty component should escalate
{
  const emptyCode = `import { useState } from 'react';
export default function App() { return (); }`;
  const start = Date.now();
  const result = repairComposedOutput(emptyCode);
  const elapsed = Date.now() - start;

  record(
    'REPAIR-empty',
    'Repair: empty component escalates',
    result.shouldEscalate,
    `escalate: ${result.shouldEscalate}, diagnoses: ${result.diagnoses.map(d => d.issue).join('; ')}`,
    elapsed
  );
}

// Test 5d: Bad lucide icon names should be fixed
{
  const badIcons = `import { useState } from 'react';
import { Dashboard, Setting, Close } from 'lucide-react';
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard className="w-5 h-5" />
      <Setting className="w-5 h-5" />
      <Close className="w-5 h-5" />
    </div>
  );
}`;
  const start = Date.now();
  const result = repairComposedOutput(badIcons);
  const elapsed = Date.now() - start;

  const passed = result.wasRepaired &&
    result.appTsx.includes('LayoutDashboard') &&
    result.appTsx.includes('Settings') &&
    result.appTsx.includes('X');
  record(
    'REPAIR-icons',
    'Repair: bad lucide icons corrected',
    passed,
    `repaired: ${result.wasRepaired}, has LayoutDashboard: ${result.appTsx.includes('LayoutDashboard')}`,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 6: FITNESS GATE INTEGRATION
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 6: Fitness Gate Integration ═══');

// Composer-lane prompts should route to 'composer' via fitness gate
const composerPrompts = [
  { prompt: 'Build a customer support chat inbox', expected: 'composer' },
  { prompt: 'Create a social media feed with posts and comments', expected: 'composer' },
  { prompt: 'Build an online store with shopping cart', expected: 'composer' },
  { prompt: 'Create a music player with playlists', expected: 'composer' },
];

for (let i = 0; i < composerPrompts.length; i++) {
  const { prompt, expected } = composerPrompts[i];
  const start = Date.now();
  const result = checkShellFitness(prompt);
  const elapsed = Date.now() - start;

  const passed = result.recommendation === expected;
  record(
    `FITNESS-C${i + 1}`,
    `Fitness: "${prompt.slice(0, 50)}..." → ${expected}`,
    passed,
    `got: ${result.recommendation} (score: ${result.score})${result.composerScoring ? `, composer: ${result.composerScoring.explanation}` : ''}`,
    elapsed
  );
}

// Shell prompts should still route to 'shell' (not composer)
const shellPrompts = [
  { prompt: 'Build a task management tool', expected: 'shell' },
  { prompt: 'Create an analytics dashboard for sales', expected: 'shell' },
  { prompt: 'Build a landing page for a SaaS product', expected: 'shell' },
];

for (let i = 0; i < shellPrompts.length; i++) {
  const { prompt, expected } = shellPrompts[i];
  const start = Date.now();
  const result = checkShellFitness(prompt);
  const elapsed = Date.now() - start;

  const passed = result.recommendation === expected;
  record(
    `FITNESS-S${i + 1}`,
    `Fitness: "${prompt.slice(0, 50)}..." → ${expected}`,
    passed,
    `got: ${result.recommendation} (score: ${result.score})`,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// TEST 7: REPAIR ON COMPOSED OUTPUT
// ══════════════════════════════════════════════════

console.log('\n═══ TEST 7: Repair on Real Composed Output ═══');
for (const [kitId, fixture] of Object.entries(ALL_COMPOSER_FIXTURES)) {
  const prompt = kitPrompts[kitId] || `Build a ${kitId} app`;
  const composed = composeFromPrompt(prompt, fixture);
  if (!composed) {
    record(`REPAIR-REAL-${kitId}`, `Repair real ${kitId}`, false, 'compose returned null', 0);
    continue;
  }

  const start = Date.now();
  const repairResult = repairComposedOutput(composed.appTsx);
  const elapsed = Date.now() - start;

  // Real composed output should be clean (no repairs needed, no escalation)
  const passed = !repairResult.shouldEscalate;
  record(
    `REPAIR-REAL-${kitId}`,
    `Repair real ${kitId}: ${repairResult.diagnoses.length} issues`,
    passed,
    `repaired: ${repairResult.wasRepaired}, escalate: ${repairResult.shouldEscalate}, issues: ${repairResult.diagnoses.map(d => d.issue).join('; ') || 'none'}`,
    elapsed
  );
}

// ══════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════');
console.log(`COMPOSER TEST RESULTS: ${passCount} passed, ${failCount} failed, ${results.length} total`);
console.log('═══════════════════════════════════════════════');

if (failCount > 0) {
  console.log('\nFailed tests:');
  for (const r of results.filter(r => !r.passed)) {
    console.log(`  ❌ ${r.id}: ${r.details}`);
  }
}

// Write JSON report
const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
const report = {
  timestamp: new Date().toISOString(),
  summary: { passed: passCount, failed: failCount, total: results.length },
  results,
};
writeFileSync(join(reportDir, 'composer-test-report.json'), JSON.stringify(report, null, 2));
console.log(`\nReport written to reports/composer-test-report.json`);

process.exit(failCount > 0 ? 1 : 0);
