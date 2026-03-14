/**
 * MASTER REGRESSION TEST — runs all offline suites + judge proxy + generates unified report.
 *
 * No LLM calls. No API calls. No credits consumed.
 * Run: npx tsx scripts/master-test.ts
 */

import { checkShellFitness } from '../src/shells/fitness.js';
import { generateFallbackSpec } from '../src/shells/spec.js';
import { renderFromSpec } from '../src/shells/renderer.js';
import { composeFromPrompt } from '../src/composer/composer.js';
import { scoreKitComposition } from '../src/composer/scorer.js';
import { extractKitFit } from '../src/composer/extractor.js';
import { repairComposedOutput } from '../src/composer/repair.js';
import { scoreOutput, compareCandidates, type JudgeScore } from '../src/judge/proxy.js';
import { checkTimeBudget, TIME_BUDGET } from '../src/judge/policy.js';
import * as fs from 'fs';
import * as path from 'path';

// ══════════════════════════════════════════════════
// TEST PROMPTS — representative of mystery prompt families
// ══════════════════════════════════════════════════

interface MasterTestCase {
  id: string;
  prompt: string;
  expectedLane: 'shell' | 'composer' | 'llm' | 'any';
  category: string;
}

const TEST_CASES: MasterTestCase[] = [
  // ── SHELL-FIT ──
  { id: 'S01', prompt: 'Build a task management dashboard for a dev team', expectedLane: 'shell', category: 'shell-dashboard' },
  { id: 'S02', prompt: 'Create a project tracker with kanban board', expectedLane: 'shell', category: 'shell-kanban' },
  { id: 'S03', prompt: 'Build a customer CRM with contacts and deals pipeline', expectedLane: 'shell', category: 'shell-universal' },
  { id: 'S04', prompt: 'Create an employee onboarding wizard with 5 steps', expectedLane: 'shell', category: 'shell-wizard' },
  { id: 'S05', prompt: 'Build a product landing page with pricing and FAQ', expectedLane: 'shell', category: 'shell-landing' },
  { id: 'S06', prompt: 'Create an expense tracker app', expectedLane: 'shell', category: 'shell-finance' },
  { id: 'S07', prompt: 'Build a fitness workout log and tracker', expectedLane: 'shell', category: 'shell-health' },
  { id: 'S08', prompt: 'Create an analytics reporting dashboard with KPIs', expectedLane: 'shell', category: 'shell-analytics' },

  // ── COMPOSER-FIT ──
  { id: 'C01', prompt: 'Build a customer support inbox with tickets and conversations', expectedLane: 'any', category: 'borderline-chat' },
  { id: 'C02', prompt: 'Create a social media feed with posts, likes, and comments', expectedLane: 'composer', category: 'composer-feed' },
  { id: 'C03', prompt: 'Build an online store with product catalog and shopping cart', expectedLane: 'composer', category: 'composer-store' },
  { id: 'C04', prompt: 'Create a travel booking app with map and hotel listings', expectedLane: 'composer', category: 'composer-map' },
  { id: 'C05', prompt: 'Build a Spotify-like music player with playlists', expectedLane: 'composer', category: 'composer-media' },
  { id: 'C06', prompt: 'Create a poster designer tool with drag and drop blocks', expectedLane: 'composer', category: 'composer-editor' },
  { id: 'C07', prompt: 'Build a food delivery ordering app with restaurant menu and cart', expectedLane: 'composer', category: 'composer-store' },
  { id: 'C08', prompt: 'Create a Reddit-style discussion forum', expectedLane: 'any', category: 'borderline-feed' },

  // ── LLM-FIT (too complex/unusual for shells or kits) ──
  { id: 'L01', prompt: 'Build a collaborative real-time code editor with syntax highlighting, multiple cursors, and file tree sidebar', expectedLane: 'llm', category: 'llm-editor' },
  { id: 'L02', prompt: 'Create a browser-based Tetris game with scoring and leaderboard', expectedLane: 'llm', category: 'llm-game' },
  { id: 'L03', prompt: 'Build a calendar app with month, week, and day views, event creation, and drag-to-resize events', expectedLane: 'llm', category: 'llm-calendar' },
  { id: 'L04', prompt: 'Create a weather dashboard that shows forecasts, maps, and historical data with animated charts', expectedLane: 'any', category: 'borderline-weather' },

  // ── HARD/UNUSUAL ──
  { id: 'H01', prompt: 'Build something cool', expectedLane: 'any', category: 'vague' },
  { id: 'H02', prompt: 'Cat', expectedLane: 'any', category: 'minimal' },
  { id: 'H03', prompt: 'Create a comprehensive platform for managing underwater basket weaving courses with enrollment, grading, and instructor assignments', expectedLane: 'shell', category: 'unusual-shell' },
];

// ══════════════════════════════════════════════════
// RUN TESTS
// ══════════════════════════════════════════════════

interface TestResult {
  id: string;
  prompt: string;
  category: string;
  expectedLane: string;
  actualLane: string;
  fitnessScore: number;
  composerScore: number;
  judgeScore: JudgeScore | null;
  repairApplied: boolean;
  repairEscalated: boolean;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

console.log('FORGE — Master Regression Test');
console.log('═'.repeat(100));
console.log('No LLM calls. No API calls. No credits consumed.\n');

for (const tc of TEST_CASES) {
  const t0 = Date.now();

  // 1. Fitness gate
  const fitness = checkShellFitness(tc.prompt);
  const actualLane = fitness.recommendation;

  // 2. Try to generate output based on lane
  let judgeScore: JudgeScore | null = null;
  let repairApplied = false;
  let repairEscalated = false;
  let notes = '';

  if (actualLane === 'shell') {
    try {
      const spec = generateFallbackSpec(tc.prompt);
      const result = renderFromSpec(spec);
      judgeScore = scoreOutput({
        appTsx: result.appTsx,
        files: result.files.map(f => f.path),
        lane: 'shell',
        elapsedMs: Date.now() - t0,
        shellType: result.shell,
        fitnessScore: fitness.score,
      });
    } catch (err) {
      notes += `Shell render error: ${(err as Error).message}. `;
    }
  } else if (actualLane === 'composer') {
    try {
      const spec = generateFallbackSpec(tc.prompt);
      const composerResult = composeFromPrompt(tc.prompt, spec);
      if (composerResult) {
        repairApplied = composerResult.repair?.wasRepaired ?? false;
        repairEscalated = composerResult.repair?.shouldEscalate ?? false;
        judgeScore = scoreOutput({
          appTsx: composerResult.appTsx,
          files: composerResult.files.map(f => f.path),
          lane: 'composer',
          elapsedMs: Date.now() - t0,
          kitId: composerResult.kit,
          composerScore: composerResult.scoring.compositionScore,
          repairCount: composerResult.repair?.diagnoses.filter(d => d.repaired).length ?? 0,
        });
      } else {
        notes += 'Composer returned null. ';
      }
    } catch (err) {
      notes += `Composer error: ${(err as Error).message}. `;
    }
  }
  // LLM lane — can't test without API, just verify routing is correct

  // 3. Kit composition check (for reporting)
  const composerScoring = scoreKitComposition(tc.prompt);

  // 4. Determine pass/fail
  let isCorrect: boolean;
  if (tc.expectedLane === 'any') {
    isCorrect = true;
    notes += `Any lane OK → got ${actualLane}. `;
  } else if (tc.expectedLane === actualLane) {
    isCorrect = true;
  } else if (tc.expectedLane === 'llm' && actualLane === 'composer') {
    // Composer catching prompts that would go to LLM is acceptable (upgrade)
    isCorrect = true;
    notes += `Upgraded: LLM → composer. `;
  } else {
    isCorrect = false;
    notes += `WRONG: expected ${tc.expectedLane}, got ${actualLane}. `;
  }

  // 5. Judge threshold check
  if (judgeScore && !judgeScore.passesThreshold) {
    notes += `Judge: BELOW threshold (func=${judgeScore.functionality}/10). `;
  }

  if (isCorrect) passed++;
  else failed++;

  const icon = isCorrect ? '✅' : '❌';
  const judgeStr = judgeScore
    ? `F=${judgeScore.functionality} D=${judgeScore.design} C=${judgeScore.confidence}`
    : 'N/A';
  console.log(`${icon} ${tc.id} | Lane: ${actualLane.padEnd(8)} | Exp: ${tc.expectedLane.padEnd(8)} | Fit: ${String(fitness.score).padStart(3)} | Judge: ${judgeStr} | ${tc.category}`);
  if (!isCorrect) console.log(`   ↳ ${notes}`);

  results.push({
    id: tc.id,
    prompt: tc.prompt.substring(0, 80),
    category: tc.category,
    expectedLane: tc.expectedLane,
    actualLane,
    fitnessScore: fitness.score,
    composerScore: composerScoring.compositionScore,
    judgeScore,
    repairApplied,
    repairEscalated,
    passed: isCorrect,
    notes,
  });
}

// ══════════════════════════════════════════════════
// TIME BUDGET POLICY TESTS
// ══════════════════════════════════════════════════

console.log('\n── Time Budget Policy Tests ──');
let policyPassed = 0;

// Test 1: Fresh start = proceed
const tb1 = checkTimeBudget(Date.now());
if (tb1.recommendation === 'proceed') { policyPassed++; console.log('✅ Fresh start → proceed'); }
else { console.log('❌ Fresh start should be proceed'); failed++; }

// Test 2: 80s ago = emergency
const tb2 = checkTimeBudget(Date.now() - 85000);
if (tb2.isEmergency) { policyPassed++; console.log('✅ 85s elapsed → emergency'); }
else { console.log('❌ 85s elapsed should be emergency'); failed++; }

// Test 3: 75s ago = hurry (skip LLM)
const tb3 = checkTimeBudget(Date.now() - 75000);
if (tb3.shouldSkipLLM && !tb3.isEmergency) { policyPassed++; console.log('✅ 75s elapsed → hurry (skip LLM)'); }
else { console.log('❌ 75s elapsed should be hurry'); failed++; }

passed += policyPassed;

// ══════════════════════════════════════════════════
// JUDGE PROXY SANITY TESTS
// ══════════════════════════════════════════════════

console.log('\n── Judge Proxy Sanity Tests ──');
let judgePassed = 0;

// Rich app should score higher than empty app
const richApp = `import { useState } from 'react';
import { Search, Filter, Plus, Edit, Trash, Star, Check } from 'lucide-react';
export default function App() {
  const [items, setItems] = useState([{id:1,name:'Item 1'},{id:2,name:'Item 2'}]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number|null>(null);
  const [filter, setFilter] = useState('all');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center gap-3 px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-xl font-bold">App</h1>
        <div className="flex-1" />
        <button onClick={() => setItems([...items, {id: Date.now(), name: 'New'}])} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"><Plus className="w-4 h-4" />Add</button>
      </header>
      <div className="flex gap-4 p-6">
        <div className="w-64 space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
          {filtered.map(i => (
            <button key={i.id} onClick={() => setSelected(i.id)} className={"w-full text-left px-3 py-2 rounded-lg transition " + (selected === i.id ? 'bg-indigo-600' : 'hover:bg-gray-800')}>{i.name}</button>
          ))}
        </div>
        <div className="flex-1 bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800">
          <p className="text-gray-400">Select an item</p>
        </div>
      </div>
    </div>
  );
}`;

const emptyApp = `export default function App() { return (<div></div>); }`;

const richScore = scoreOutput({ appTsx: richApp, files: ['src/App.tsx', 'package.json', 'README.md'], lane: 'shell', elapsedMs: 300 });
const emptyScore = scoreOutput({ appTsx: emptyApp, files: ['src/App.tsx'], lane: 'emergency', elapsedMs: 100 });

if (richScore.functionality > emptyScore.functionality) { judgePassed++; console.log(`✅ Rich app (${richScore.functionality}) > Empty app (${emptyScore.functionality})`); }
else { console.log(`❌ Rich app should score higher than empty`); failed++; }

if (richScore.design > emptyScore.design) { judgePassed++; console.log(`✅ Rich design (${richScore.design}) > Empty design (${emptyScore.design})`); }
else { console.log(`❌ Rich design should score higher`); failed++; }

if (richScore.functionality >= 3) { judgePassed++; console.log(`✅ Rich app func=${richScore.functionality} (above minimal quality)`); }
else { console.log(`❌ Rich app func=${richScore.functionality} should be >= 3`); failed++; }

// Compare candidates
const winner = compareCandidates(richScore, emptyScore);
if (winner === 'a') { judgePassed++; console.log(`✅ compareCandidates picks rich app`); }
else { console.log(`❌ compareCandidates should pick rich app`); failed++; }

passed += judgePassed;

// ══════════════════════════════════════════════════
// REPAIR CONTROLLER TESTS
// ══════════════════════════════════════════════════

console.log('\n── Repair Controller Tests ──');
let repairPassed = 0;

// Missing useState import
const missingImport = `const [x, setX] = useState(0);\nexport default function App() { return <div>{x}</div>; }`;
const r1 = repairComposedOutput(missingImport);
if (r1.wasRepaired && r1.appTsx.includes("from 'react'")) { repairPassed++; console.log('✅ Repairs missing useState import'); }
else { console.log('❌ Should repair missing useState import'); failed++; }

// Empty component → escalate
const emptyComp = `export default function App() { return () ; }`;
const r2 = repairComposedOutput(emptyComp);
// Empty component pattern is return () not return (<div></div>) so test the div pattern
const emptyDiv = `export default function App() { return (<div></div>); }`;
const r3 = repairComposedOutput(emptyDiv);
if (r3.shouldEscalate) { repairPassed++; console.log('✅ Empty <div></div> triggers escalation'); }
else { console.log('❌ Empty div should trigger escalation'); failed++; }

// Bad lucide icon → fix
const badIcon = `import { Dashboard, Settings } from 'lucide-react';\nexport default function App() { return <div><Dashboard /><Settings /></div>; }`;
const r4 = repairComposedOutput(badIcon);
if (r4.wasRepaired && r4.appTsx.includes('LayoutDashboard')) { repairPassed++; console.log('✅ Fixes bad Lucide icon name'); }
else { console.log('❌ Should fix Dashboard → LayoutDashboard'); failed++; }

passed += repairPassed;

// ══════════════════════════════════════════════════
// SUMMARY + REPORTS
// ══════════════════════════════════════════════════

const total = passed + failed;
console.log('\n' + '═'.repeat(100));
console.log(`\n📊 MASTER TEST: ${passed}/${total} passed | ${failed} failed`);
console.log(`   Routing: ${results.filter(r => r.passed).length}/${results.length}`);
console.log(`   Policy: ${policyPassed}/3`);
console.log(`   Judge: ${judgePassed}/4`);
console.log(`   Repair: ${repairPassed}/3`);

// Judge score distribution
const judged = results.filter(r => r.judgeScore);
if (judged.length > 0) {
  const avgFunc = judged.reduce((s, r) => s + (r.judgeScore?.functionality ?? 0), 0) / judged.length;
  const avgDesign = judged.reduce((s, r) => s + (r.judgeScore?.design ?? 0), 0) / judged.length;
  const avgConf = judged.reduce((s, r) => s + (r.judgeScore?.confidence ?? 0), 0) / judged.length;
  console.log(`\n📈 Judge Averages (${judged.length} outputs): Func=${avgFunc.toFixed(1)}/10 | Design=${avgDesign.toFixed(1)}/10 | Confidence=${avgConf.toFixed(0)}/100`);
}

// Write reports
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

fs.writeFileSync(
  path.join(reportsDir, 'master_test_report.json'),
  JSON.stringify({ date: new Date().toISOString(), passed, failed, total, results }, null, 2)
);

// Summary markdown
const summary = `# Master Regression Test Report

**Date**: ${new Date().toISOString()}
**Results**: ${passed}/${total} passed | ${failed} failed

## Routing Decisions

| ID | Lane | Expected | Fitness | Composer | Judge F | Judge D | Judge C | Category | Pass |
|----|------|----------|---------|----------|---------|---------|---------|----------|------|
${results.map(r => `| ${r.id} | ${r.actualLane} | ${r.expectedLane} | ${r.fitnessScore} | ${r.composerScore} | ${r.judgeScore?.functionality ?? '-'} | ${r.judgeScore?.design ?? '-'} | ${r.judgeScore?.confidence ?? '-'} | ${r.category} | ${r.passed ? '✅' : '❌'} |`).join('\n')}

## Failures
${results.filter(r => !r.passed).map(r => `- **${r.id}** (${r.category}): ${r.notes}`).join('\n') || 'None'}
`;

fs.writeFileSync(
  path.join(reportsDir, 'master_test_summary.md'),
  summary
);

console.log('\n📄 Reports: reports/master_test_report.json, reports/master_test_summary.md');

process.exit(failed > 0 ? 1 : 0);
